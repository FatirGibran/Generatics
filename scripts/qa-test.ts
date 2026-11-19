export {};

/**
 * Automated End-to-End QA Test Suite for Debate Generatics 2026
 * Target: Windows Server (100.109.130.101:3000 or custom BASE_URL)
 */

const BASE_URL = process.env.TARGET_URL || "http://100.109.130.101:3000";

interface TestReport {
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const reports: TestReport[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    reports.push({ name, passed: true, durationMs });
    console.log(`  ✅ PASS: ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    reports.push({ name, passed: false, durationMs, error: msg });
    console.error(`  ❌ FAIL: ${name} (${durationMs}ms) -> ${msg}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function extractCookie(res: Response, cookieName: string): string | null {
  const raw = res.headers.get("set-cookie");
  if (!raw) return null;
  const match = raw.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? `${cookieName}=${match[1]}` : null;
}

async function runQA() {
  console.log("==========================================================");
  console.log(`🧪 STARTING END-TO-END QA AUDIT ON: ${BASE_URL}`);
  console.log("==========================================================");

  let adminCookie = "";
  let partToken = "";
  let partCookie = "";
  let testThemeId = "";
  let testMotionId = "";

  // 1. Health check
  await test("Endpoint /api/health responds with 200 and DB connected", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.status === "ok", `Status is not ok: ${data.status}`);
    assert(data.db === "connected", `DB not connected: ${data.db}`);
    assert(data.app === "debate-generatics-2026", `App mismatch: ${data.app}`);
  });

  // 2. Static logos check
  await test("Institutional and event logos load properly (HTTP 200)", async () => {
    const logos = [
      "/logos/generatics.webp",
      "/logos/tel-u.webp",
      "/logos/if.webp",
      "/logos/hmif.webp",
      "/logos/kabinet.webp",
    ];
    for (const logo of logos) {
      const res = await fetch(`${BASE_URL}${logo}`);
      assert(res.status === 200, `Logo ${logo} failed with ${res.status}`);
    }
  });

  // 3. Homepage UI delivery
  await test("Homepage (/) renders without demo slop or debug accounts", async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, `Homepage returned ${res.status}`);
    const html = await res.text();
    assert(html.includes("DEBATE GENERATICS 2026"), "Missing DEBATE GENERATICS 2026 title");
    assert(!html.includes("Alya Putri"), "Leaked demo account Alya Putri found");
    assert(!html.includes("Citra Kirana"), "Leaked demo account Citra Kirana found");
    assert(!html.includes("COBA AKUN DEMO"), "Demo block found in homepage");
  });

  // 4. Admin Auth
  await test("Admin login rejects invalid password (HTTP 401)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrong_password_123" }),
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test("Admin login succeeds with valid credentials (HTTP 200)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "generatics2026" }),
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const cookie = extractCookie(res, "generatics_session");
    assert(!!cookie, "Session cookie not returned");
    adminCookie = cookie!;
  });

  await test("Session verification (/api/auth/me) recognizes admin session", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: adminCookie },
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.authenticated === true, "Session not authenticated");
    assert(data.role === "admin", `Expected role admin, got ${data.role}`);
  });

  // 5. System Settings Management
  await test("System Settings API (GET & PATCH)", async () => {
    // GET
    const getRes = await fetch(`${BASE_URL}/api/admin/settings`, {
      headers: { Cookie: adminCookie },
    });
    assert(getRes.status === 200, `GET settings failed: ${getRes.status}`);
    const getData = await getRes.json();
    assert(getData.settings !== undefined, "Missing settings field");

    // PATCH duration
    const patchRes = await fetch(`${BASE_URL}/api/admin/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ prepDurationSeconds: 420 }),
    });
    assert(patchRes.status === 200, `PATCH failed: ${patchRes.status}`);
    const patchData = await patchRes.json();
    assert(patchData.settings.prepDurationSeconds === 420, "Duration update failed");

    // Revert duration
    await fetch(`${BASE_URL}/api/admin/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ prepDurationSeconds: 300 }),
    });
  });

  // 6. Themes & Motions CRUD
  await test("Themes and Motions CRUD flow", async () => {
    // 1. Create Theme
    const createThm = await fetch(`${BASE_URL}/api/admin/themes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ name: "QA Temp Theme", description: "Temporary theme for QA", isActive: true }),
    });
    assert(createThm.status === 200, `Create theme failed: ${createThm.status}`);
    const thmData = await createThm.json();
    testThemeId = thmData.id;
    assert(!!testThemeId, "Theme ID not returned");

    // 2. Create Motion under this theme
    const createMot = await fetch(`${BASE_URL}/api/admin/motions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        themeId: testThemeId,
        motionText: "Dewan ini percaya bahwa QA otomatis meningkatkan keandalan sistem.",
        maxUsage: 5,
        isActive: true,
      }),
    });
    assert(createMot.status === 200, `Create motion failed: ${createMot.status}`);
    const motData = await createMot.json();
    testMotionId = motData.id;
    assert(!!testMotionId, "Motion ID not returned");

    // 3. Edit Motion
    const editMot = await fetch(`${BASE_URL}/api/admin/motions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        id: testMotionId,
        motionText: "Dewan ini percaya bahwa QA otomatis sangat esensial untuk produksi.",
      }),
    });
    assert(editMot.status === 200, `Edit motion failed: ${editMot.status}`);

    // 4. Delete Motion
    const delMot = await fetch(`${BASE_URL}/api/admin/motions?id=${testMotionId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert(delMot.status === 200, `Delete motion failed: ${delMot.status}`);

    // 5. Delete Theme
    const delThm = await fetch(`${BASE_URL}/api/admin/themes?id=${testThemeId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert(delThm.status === 200, `Delete theme failed: ${delThm.status}`);
  });

  // 7. Participant Management (Single & Bulk)
  await test("Participant Creation & Duplicate Protection", async () => {
    // Single creation
    const createRes = await fetch(`${BASE_URL}/api/admin/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        username: "QA_USER_01",
        fullName: "QA Participant One",
        sessionBatch: "Day 1",
      }),
    });
    assert(createRes.status === 200, `Create participant failed: ${createRes.status}`);
    const resData = await createRes.json();
    partToken = resData.participant.accessToken;
    assert(partToken.startsWith("STR-"), `Token format invalid: ${partToken}`);

    // Duplicate check
    const dupRes = await fetch(`${BASE_URL}/api/admin/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        username: "QA_USER_01",
        fullName: "QA Duplicate Name",
        sessionBatch: "Day 1",
      }),
    });
    assert(dupRes.status === 400, `Duplicate allowed with status ${dupRes.status}`);

    // Bulk creation
    const bulkRes = await fetch(`${BASE_URL}/api/admin/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        participants: [
          { username: "QA_USER_02", fullName: "QA Participant Two", sessionBatch: "Day 1" },
          { username: "QA_USER_03", fullName: "QA Participant Three", sessionBatch: "Day 1" },
        ],
      }),
    });
    assert(bulkRes.status === 200, `Bulk create failed: ${bulkRes.status}`);
    const bulkData = await bulkRes.json();
    assert(bulkData.count === 2, `Expected 2 imported, got ${bulkData.count}`);
  });

  // 8. Participant Authentication
  await test("Participant Login validation (Wrong token vs Valid token)", async () => {
    // Wrong token
    const wrongRes = await fetch(`${BASE_URL}/api/auth/participant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "QA_USER_01", accessToken: "STR-WRONG" }),
    });
    assert(wrongRes.status === 401, `Wrong token expected 401, got ${wrongRes.status}`);

    // Valid token
    const validRes = await fetch(`${BASE_URL}/api/auth/participant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "QA_USER_01", accessToken: partToken }),
    });
    assert(validRes.status === 200, `Valid login failed: ${validRes.status}`);
    const cookie = extractCookie(validRes, "generatics_session");
    assert(!!cookie, "Participant session cookie missing");
    partCookie = cookie!;
  });

  // 9. Single-Spin Lock & Gatekeeper Verification
  await test("Spin Gatekeeper: blocked when isSpinOpen is false", async () => {
    // Ensure spin is closed
    await fetch(`${BASE_URL}/api/admin/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ isSpinOpen: false }),
    });

    const spinRes = await fetch(`${BASE_URL}/api/spin`, {
      method: "POST",
      headers: { Cookie: partCookie },
    });
    assert(spinRes.status === 400, `Expected 400 when closed, got ${spinRes.status}`);
    const spinData = await spinRes.json();
    assert(spinData.error?.includes("belum dibuka"), `Unexpected error: ${spinData.error}`);
  });

  let assignedMotion = "";
  let assignedStance = "";
  let spunTimestamp = "";

  await test("Spin Execution: open session and draw motion & stance", async () => {
    // Open spin
    await fetch(`${BASE_URL}/api/admin/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ isSpinOpen: true }),
    });

    const spinRes = await fetch(`${BASE_URL}/api/spin`, {
      method: "POST",
      headers: { Cookie: partCookie },
    });
    assert(spinRes.status === 200, `Spin execution failed: ${spinRes.status}`);
    const data = await spinRes.json();
    assert(data.success === true, "Spin not marked success");
    assert(data.alreadySpun === false, "First spin should have alreadySpun = false");
    assert(data.stance === "PRO" || data.stance === "KONTRA", `Invalid stance: ${data.stance}`);
    assert(!!data.themeName, "Missing themeName");
    assert(!!data.motionText, "Missing motionText");
    assert(!!data.spunAt, "Missing spunAt");

    assignedMotion = data.motionText;
    assignedStance = data.stance;
    spunTimestamp = data.spunAt;
  });

  await test("Single-Spin Lock: duplicate spin attempt returns identical locked result", async () => {
    const secondSpinRes = await fetch(`${BASE_URL}/api/spin`, {
      method: "POST",
      headers: { Cookie: partCookie },
    });
    assert(secondSpinRes.status === 200, `Second spin failed: ${secondSpinRes.status}`);
    const data = await secondSpinRes.json();
    assert(data.alreadySpun === true, "Expected alreadySpun: true on duplicate spin");
    assert(data.motionText === assignedMotion, "Motion changed on second spin!");
    assert(data.stance === assignedStance, "Stance changed on second spin!");
    assert(data.spunAt === spunTimestamp, "Timestamp changed on second spin!");
  });

  await test("Session state reflects hasSpun: true with locked details", async () => {
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: partCookie },
    });
    assert(meRes.status === 200, `Session check failed: ${meRes.status}`);
    const data = await meRes.json();
    assert(data.authenticated === true, "Not authenticated");
    assert(data.participant.hasSpun === true, "Participant hasSpun is false");
    assert(data.participant.assignedStance === assignedStance, "Stance mismatch in session");
  });

  // 10. Admin Reset Spin Status
  await test("Admin Reset Spin resets participant state to hasSpun: false", async () => {
    const resetRes = await fetch(`${BASE_URL}/api/admin/participants/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ username: "QA_USER_01" }),
    });
    assert(resetRes.status === 200, `Reset failed: ${resetRes.status}`);

    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: partCookie },
    });
    const meData = await meRes.json();
    assert(meData.participant.hasSpun === false, "Participant still marked as hasSpun");
    assert(meData.participant.assignedMotionId === null, "Motion ID not cleared");
  });

  // 11. Report Export (CSV & XLSX)
  await test("Export report as CSV and XLSX format", async () => {
    // CSV
    const csvRes = await fetch(`${BASE_URL}/api/admin/export?format=csv`, {
      headers: { Cookie: adminCookie },
    });
    assert(csvRes.status === 200, `CSV export failed: ${csvRes.status}`);
    const csvText = await csvRes.text();
    assert(csvText.includes("NIM / Username"), "CSV missing header column");
    assert(csvText.includes("QA_USER_01"), "CSV missing participant data");

    // XLSX
    const xlsxRes = await fetch(`${BASE_URL}/api/admin/export?format=xlsx`, {
      headers: { Cookie: adminCookie },
    });
    assert(xlsxRes.status === 200, `XLSX export failed: ${xlsxRes.status}`);
    const buf = await xlsxRes.arrayBuffer();
    assert(buf.byteLength > 1000, `XLSX buffer suspiciously small (${buf.byteLength} bytes)`);
  });

  // 12. Cleanup QA data
  await test("Cleanup QA participants and close spin gate", async () => {
    const testUsers = ["QA_USER_01", "QA_USER_02", "QA_USER_03"];
    for (const u of testUsers) {
      const del = await fetch(`${BASE_URL}/api/admin/participants?username=${u}`, {
        method: "DELETE",
        headers: { Cookie: adminCookie },
      });
      assert(del.status === 200, `Failed to delete ${u}`);
    }

    // Close spin access back to event-ready state
    await fetch(`${BASE_URL}/api/admin/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ isSpinOpen: false }),
    });
  });

  // Final Summary
  console.log("==========================================================");
  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`📊 QA TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log("==========================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runQA().catch((err) => {
  console.error("Fatal QA Suite Error:", err);
  process.exit(1);
});
