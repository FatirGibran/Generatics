export {};

/**
 * Concurrency & Stance Balance Stress Test
 */

const BASE_URL = process.env.TARGET_URL || "http://100.109.130.101:3000";

function extractCookie(res: Response, cookieName: string): string | null {
  const raw = res.headers.get("set-cookie");
  if (!raw) return null;
  const match = raw.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? `${cookieName}=${match[1]}` : null;
}

async function runConcurrencyTest() {
  console.log("==========================================================");
  console.log(`⚡ RUNNING CONCURRENCY & BALANCE STRESS TEST (10 SPINS SIMULTANEOUSLY)`);
  console.log("==========================================================");

  // 1. Admin login
  const adminRes = await fetch(`${BASE_URL}/api/auth/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "generatics2026" }),
  });
  const adminCookie = extractCookie(adminRes, "generatics_session")!;

  // 2. Open spin
  await fetch(`${BASE_URL}/api/admin/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ isSpinOpen: true, randomMode: "BALANCED" }),
  });

  // 3. Create 10 participants
  const participants = Array.from({ length: 10 }, (_, i) => ({
    username: `STRESS_${String(i + 1).padStart(2, "0")}`,
    fullName: `Stress Tester ${i + 1}`,
    accessToken: `STR-S${String(i + 1).padStart(3, "0")}`,
    sessionBatch: "Day 1",
  }));

  await fetch(`${BASE_URL}/api/admin/participants`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ participants }),
  });

  // 4. Authenticate all 10 participants
  const userCookies = await Promise.all(
    participants.map(async (p) => {
      const res = await fetch(`${BASE_URL}/api/auth/participant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: p.username, accessToken: p.accessToken }),
      });
      return { username: p.username, cookie: extractCookie(res, "generatics_session")! };
    })
  );

  console.log(`  👥 Authenticated 10 participants. Launching simultaneous spin requests...`);

  // 5. Fire all 10 spins at the exact same moment
  const startTime = Date.now();
  const spinResults = await Promise.all(
    userCookies.map(async ({ username, cookie }) => {
      const res = await fetch(`${BASE_URL}/api/spin`, {
        method: "POST",
        headers: { Cookie: cookie },
      });
      const data = await res.json();
      return { username, status: res.status, data };
    })
  );
  const totalDuration = Date.now() - startTime;

  console.log(`  ⏱️ All 10 simultaneous spins processed in ${totalDuration}ms (avg ${Math.round(totalDuration / 10)}ms/spin)`);

  let proCount = 0;
  let kontraCount = 0;
  let failedCount = 0;

  for (const r of spinResults) {
    if (r.status !== 200 || !r.data.success) {
      failedCount++;
      console.error(`  ❌ Failed for ${r.username}:`, r.data);
    } else {
      if (r.data.stance === "PRO") proCount++;
      else if (r.data.stance === "KONTRA") kontraCount++;
    }
  }

  console.log(`  📊 Results: PRO = ${proCount} | KONTRA = ${kontraCount} | FAILED = ${failedCount}`);

  // 6. Cleanup
  for (const p of participants) {
    await fetch(`${BASE_URL}/api/admin/participants?username=${p.username}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
  }

  await fetch(`${BASE_URL}/api/admin/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminCookie },
    body: JSON.stringify({ isSpinOpen: false }),
  });

  if (failedCount > 0) {
    console.error("❌ Concurrency test failed with locked/failed queries!");
    process.exit(1);
  } else {
    console.log("✅ CONCURRENCY & BALANCE STRESS TEST PASSED PERFECTLY!");
  }
}

runConcurrencyTest().catch((e) => {
  console.error("Stress Test Error:", e);
  process.exit(1);
});
