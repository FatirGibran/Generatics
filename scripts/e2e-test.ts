import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { parseParticipantCsv, parseParticipantXlsx, type ParticipantInput } from "../lib/participant-import";
import type { Motion, Participant, SpinResult, SystemSetting, Theme } from "../lib/types";

interface AdminMeResponse {
  authenticated: boolean;
  role: string;
  username: string;
}
interface ParticipantMeResponse {
  authenticated: boolean;
  role: string;
  participant: Omit<Participant, "accessToken">;
}
interface ArenaResponse {
  settings: SystemSetting;
  themes: Theme[];
  participant: Omit<Participant, "accessToken">;
}
interface SpinResponse extends SpinResult {
  success?: boolean;
  alreadySpun: boolean;
}
interface OverviewResponse {
  participants: Participant[];
  recentSpins: Omit<Participant, "accessToken">[];
  stats: { total: number; spun: number; unspun: number; pro: number; kontra: number };
}
type ParticipantIdentity = Pick<Participant, "username" | "fullName" | "sessionBatch" | "accessToken">;

// Run only against an isolated server: E2E_ALLOW_WRITES=1 E2E_ADMIN_PASSWORD=… node --import tsx scripts/e2e-test.ts

const base = new URL(process.env.E2E_BASE_URL || "http://localhost:3100");
const prefix = `e2e_${Date.now()}_${randomUUID().slice(0, 8)}_`;
const batch = "Day 1";
const adminUsername = process.env.E2E_ADMIN_USERNAME || "admin";
const participantsPath = "/api/admin/participants";
const themesPath = "/api/admin/themes";
const motionsPath = "/api/admin/motions";
const settingsPath = "/api/admin/settings";
let adminCookie = "";
let failures = 0;

async function request(path: string, method = "GET", body?: unknown, cookie = adminCookie) {
  const response = await fetch(new URL(path, base), {
    method,
    redirect: "error", // Never follow a redirect from loopback to a remote server.
    signal: AbortSignal.timeout(30_000),
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return response;
}

async function json<T = void>(path: string, method = "GET", body?: unknown, status = 200, cookie = adminCookie): Promise<T> {
  const response = await request(path, method, body, cookie);
  // Do not print response bodies: auth responses and participant lists contain secrets.
  assert.equal(response.status, status, `${method} ${path}: expected ${status}, got ${response.status}`);
  const data: unknown = await response.json();
  if (status >= 400) {
    assert.ok(data && typeof data === "object" && "error" in data);
    assert.equal(typeof data.error, "string", `${method} ${path}: missing error`);
  }
  return data as T;
}

function cookieFrom(response: Response, name: string) {
  const match = response.headers.get("set-cookie")?.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`));
  assert.ok(match, `Missing ${name} login cookie`);
  return `${name}=${match[1]}`;
}

async function test(name: string, run: () => Promise<void>) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

function fixture(suffix: string, fullName = `E2E ${suffix}`): ParticipantInput {
  return { username: `${prefix}${suffix}`, fullName, sessionBatch: batch };
}

function resultOf(data: SpinResult) {
  return { themeName: data.themeName, motionText: data.motionText, stance: data.stance, spunAt: data.spunAt, participant: data.participant };
}

function assertReset(participant: Omit<Participant, "accessToken"> | undefined) {
  assert.ok(participant, "Participant must exist");
  assert.equal(participant.hasSpun, false);
  for (const field of ["assignedMotionId", "assignedMotionText", "assignedThemeName", "assignedStance", "spunAt"] as const) {
    assert.equal(participant[field], null, `${field} must be null after reset`);
  }
}

async function main() {
  assert.equal(process.env.E2E_ALLOW_WRITES, "1", "Refusing writes: set E2E_ALLOW_WRITES=1 for an isolated test server");
  assert.ok(["http:", "https:"].includes(base.protocol), "Only HTTP(S) is supported");
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Refusing non-loopback E2E_BASE_URL");
  assert.ok(!base.username && !base.password && base.pathname === "/" && !base.search && !base.hash, "E2E_BASE_URL must be a bare loopback origin");
  const password = process.env.E2E_ADMIN_PASSWORD;
  assert.ok(password && password.trim(), "E2E_ADMIN_PASSWORD is required; no credential fallback is allowed");
  console.log(`HTTP E2E against isolated server ${base.origin}; fixture prefix ${prefix}`);

  let originalSettings: SystemSetting | undefined;
  let themeId = "";
  let motionId = "";
  let autoParticipant: ParticipantIdentity;
  let manualParticipant: ParticipantIdentity;
  let participantCookie = "";
  const auto = fixture("auto");
  const manual = { ...fixture("manual"), accessToken: `${prefix}manual_token`.toUpperCase() };
  const ownParticipants = async () => (await json<{ participants: Participant[] }>(participantsPath)).participants.filter((p) => p.username.startsWith(prefix));
  const motions = async () => (await json<{ motions: Motion[] }>(motionsPath)).motions;
  const themes = async () => (await json<{ themes: Theme[] }>(themesPath)).themes;
  const settings = async () => (await json<{ settings: SystemSetting }>(settingsPath)).settings;
  const participantMe = () => json<ParticipantMeResponse>("/api/auth/me?role=participant", "GET", undefined, 200, participantCookie);

  try {
    await test("missing/invalid auth and role-specific anonymous /me", async () => {
      for (const path of [participantsPath, themesPath, motionsPath, settingsPath, "/api/admin/overview", "/api/admin/export", "/api/spin"]) {
        await json(path, "GET", undefined, 401, "");
        await json(path, "GET", undefined, 401, "generatics_session=invalid");
      }
      for (const [path, method] of [[participantsPath, "POST"], [participantsPath, "PATCH"], [participantsPath, "DELETE"], [themesPath, "POST"], [themesPath, "PATCH"], [themesPath, "DELETE"], [motionsPath, "POST"], [motionsPath, "PATCH"], [motionsPath, "DELETE"], [settingsPath, "PATCH"], ["/api/admin/participants/reset", "POST"], ["/api/spin", "POST"]]) {
        await json(path, method, {}, 401, "");
      }
      assert.equal((await json<AdminMeResponse>("/api/auth/me?role=admin", "GET", undefined, 200, "")).authenticated, false);
      await json("/api/auth/admin", "POST", {}, 400, "");
      await json("/api/auth/admin", "POST", { username: adminUsername, password: `${randomUUID()}-wrong` }, 401, "");
    });

    const login = await request("/api/auth/admin", "POST", { username: adminUsername, password }, "");
    assert.equal(login.status, 200, "Valid admin login failed");
    adminCookie = cookieFrom(login, "generatics_admin_session");
    originalSettings = await settings();
    for (const candidate of ["generatics2026", "admin_generatics_2026"]) {
      if (candidate === password.trim()) continue;
      await test(`legacy admin password ${candidate} is rejected`, async () => {
        await json("/api/auth/admin", "POST", { username: adminUsername, password: candidate }, 401, "");
      });
    }
    await test("valid admin auth /me", async () => {
      const me = await json<AdminMeResponse>("/api/auth/me?role=admin");
      assert.equal(me.authenticated, true);
      assert.equal(me.role, "admin");
      assert.equal(me.username, adminUsername);
    });

    // Setup is fatal if it fails; finally still discovers and removes partial fixtures.
    autoParticipant = (await json<{ participant: ParticipantIdentity }>(participantsPath, "POST", auto)).participant;
    manualParticipant = (await json<{ participant: ParticipantIdentity }>(participantsPath, "POST", { ...manual, accessToken: ` ${manual.accessToken.toLowerCase()} ` })).participant;
    themeId = (await json<{ id: string }>(themesPath, "POST", { name: `${prefix}theme`, description: "E2E original", isActive: false })).id;
    assert.equal(typeof themeId, "string");
    motionId = (await json<{ id: string }>(motionsPath, "POST", { themeId, motionText: `${prefix}motion`, maxUsage: 2, isActive: false })).id;
    assert.equal(typeof motionId, "string");

    await test("participant auto/manual tokens and defaults", async () => {
      assert.match(autoParticipant.accessToken, /^STR-[A-HJ-NP-Z2-9]{4}$/);
      assert.equal(manualParticipant.accessToken, manual.accessToken);
      for (const expected of [autoParticipant, manualParticipant]) {
        const saved = (await ownParticipants()).find((p) => p.username === expected.username);
        assert.ok(saved);
        assert.equal(saved.fullName, expected.fullName);
        assert.equal(saved.sessionBatch, batch);
        assertReset(saved);
      }
    });
    await test("duplicate username returns 409", async () => {
      await json(participantsPath, "POST", auto, 409);
    });
    await test("duplicate token returns 409", async () => {
      await json(participantsPath, "POST", { ...fixture("duplicate_token"), accessToken: manual.accessToken }, 409);
    });
    await test("PATCH participant duplicate token is atomic", async () => {
      const before = await ownParticipants();
      await json(participantsPath, "PATCH", { ...manualParticipant, fullName: "E2E must not persist", sessionBatch: "Day 2", accessToken: autoParticipant.accessToken }, 409);
      assert.deepEqual(await ownParticipants(), before);
    });
    await test("PATCH participant updates name, batch and manual token", async () => {
      const update = { ...manualParticipant, fullName: "E2E edited participant", sessionBatch: "Day 2", accessToken: `${prefix}edited_token`.toUpperCase() };
      const edited = (await json<{ participant: ParticipantIdentity }>(participantsPath, "PATCH", update)).participant;
      assert.deepEqual(edited, update);
      const saved = (await ownParticipants()).find((p) => p.username === manual.username);
      assert.ok(saved);
      assert.equal(saved.fullName, update.fullName);
      assert.equal(saved.sessionBatch, "Day 2");
      assert.equal(saved.accessToken, update.accessToken);
      assertReset(saved);
      await json("/api/auth/participant", "POST", { username: manual.username, accessToken: manual.accessToken }, 401, "");
      const response = await request("/api/auth/participant", "POST", { username: manual.username, accessToken: update.accessToken.toLowerCase() }, "");
      assert.equal(response.status, 200);
      cookieFrom(response, "generatics_participant_session");
      manualParticipant = edited;
    });
    await test("malformed participant fields return 400", async () => {
      for (const body of [null, [], {}, { ...fixture("blank_name"), fullName: "   " }, { ...fixture("numeric_name"), fullName: 123 }, { ...fixture("bad_token"), accessToken: {} }, { ...fixture("bad_batch"), sessionBatch: [] }, { ...fixture("unknown_batch"), sessionBatch: "Day 3" }]) {
        await json(participantsPath, "POST", body, 400);
      }
      await json(participantsPath, "PATCH", { ...manualParticipant, sessionBatch: "Day 3" }, 400);
      await json(`${participantsPath}?batch=Day%203`, "GET", undefined, 400);
    });

    await test("bulk CSV parsed rows and Excel read rows persist correctly", async () => {
      const rows = [fixture("csv", 'E2E, quoted "name"'), fixture("excel", "E2E Excel\nsecond line")];
      const sheet = XLSX.utils.json_to_sheet(rows);
      const csvRows = parseParticipantCsv(XLSX.utils.sheet_to_csv(sheet));
      assert.deepEqual(csvRows, rows, "CSV quoted fields must round-trip");
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Participants");
      const excelRows = parseParticipantXlsx(XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
      assert.deepEqual(excelRows, rows, "XLSX cells must round-trip");
      for (const parsedRows of [[csvRows[0]], [excelRows[1]]]) {
        assert.equal((await json<{ count: number }>(participantsPath, "POST", { participants: parsedRows })).count, 1);
      }
      const saved = await ownParticipants();
      for (const row of rows) {
        const found = saved.find((p) => p.username === row.username);
        assert.ok(found);
        assert.equal(found.fullName, row.fullName);
        assert.equal(found.sessionBatch, row.sessionBatch);
        assert.match(found.accessToken, /^STR-[A-HJ-NP-Z2-9]{4}$/);
      }
    });
    for (const [kind, conflict] of [
      ["username", { ...auto, fullName: "E2E MUST NOT OVERWRITE" }],
      ["token", { ...fixture("rollback_conflict"), accessToken: manualParticipant.accessToken }],
    ] as const) await test(`POST bulk ${kind} conflict rolls back every row`, async () => {
      const before = await ownParticipants();
      await json(participantsPath, "POST", { participants: [fixture(`rollback_${kind}_insert`), conflict] }, 409);
      assert.deepEqual(await ownParticipants(), before, "Bulk failure must leave no partial inserts or updates");
    });
    await test("malformed bulk rows return 400 and are atomic", async () => {
      const before = await ownParticipants();
      await json(participantsPath, "POST", { participants: [fixture("invalid_bulk_first"), { username: `${prefix}invalid_bulk_last` }] }, 400);
      assert.deepEqual(await ownParticipants(), before);
    });

    await test("theme edit/toggle persists", async () => {
      await json(themesPath, "PATCH", { id: themeId, name: `${prefix}theme_edited`, description: "E2E edited", isActive: true });
      let saved = (await themes()).find((t) => t.id === themeId);
      assert.ok(saved);
      assert.equal(saved.name, `${prefix}theme_edited`);
      assert.equal(saved.description, "E2E edited");
      assert.equal(saved.isActive, true);
      await json(themesPath, "PATCH", { id: themeId, isActive: false });
      saved = (await themes()).find((t) => t.id === themeId);
      assert.ok(saved);
      assert.equal(saved.isActive, false);
    });
    await test("motion edit/toggle and unlimited quota persist", async () => {
      await json(motionsPath, "PATCH", { id: motionId, motionText: `${prefix}motion_edited`, maxUsage: null, isActive: true });
      let saved = (await motions()).find((m) => m.id === motionId);
      assert.ok(saved);
      assert.equal(saved.motionText, `${prefix}motion_edited`);
      assert.equal(saved.maxUsage, null);
      assert.equal(saved.isActive, true);
      await json(motionsPath, "PATCH", { id: motionId, maxUsage: 2, isActive: false });
      saved = (await motions()).find((m) => m.id === motionId);
      assert.ok(saved);
      assert.equal(saved.maxUsage, 2);
      assert.equal(saved.isActive, false);
      assert.equal(saved.usedCount, 0);
    });
    await test("theme/motion malformed fields and quota errors", async () => {
      for (const body of [{ name: " " }, { name: `${prefix}invalid_theme`, isActive: "yes" }, { name: `${prefix}invalid_description`, description: [] }]) {
        await json(themesPath, "POST", body, 400);
      }
      await json(themesPath, "PATCH", { id: themeId, name: " " }, 400);
      await json(themesPath, "PATCH", { id: themeId, isActive: 1 }, 400);
      for (const quota of [0, -1, 1.5, "abc", true, 2147483648]) {
        await json(motionsPath, "POST", { themeId, motionText: `${prefix}bad_quota`, maxUsage: quota }, 400);
        await json(motionsPath, "PATCH", { id: motionId, maxUsage: quota }, 400);
      }
      await json(motionsPath, "POST", { themeId, motionText: " " }, 400);
      await json(motionsPath, "PATCH", { id: motionId, isActive: "yes" }, 400);
      await json(motionsPath, "PATCH", { id: motionId, themeId: " " }, 400);
    });
    await test("settings invalid input leaves original values unchanged", async () => {
      const before = await settings();
      for (const body of [null, [], { isSpinOpen: "true" }, { randomMode: "INVALID" }, ...[29, 7201, 30.5, "300", null].map((prepDurationSeconds) => ({ prepDurationSeconds }))]) {
        await json(settingsPath, "PATCH", body, 400);
        assert.deepEqual(await settings(), before);
      }
    });

    await test("participant missing/wrong/valid auth and admin isolation", async () => {
      await json("/api/auth/participant", "POST", {}, 400, "");
      await json("/api/auth/participant", "POST", { username: auto.username, accessToken: 123 }, 400, "");
      await json("/api/auth/participant", "POST", { username: auto.username, accessToken: `${prefix}wrong` }, 401, "");
      const response = await request("/api/auth/participant", "POST", { username: ` ${auto.username} `, accessToken: autoParticipant.accessToken.toLowerCase() }, "");
      assert.equal(response.status, 200);
      participantCookie = cookieFrom(response, "generatics_participant_session");
      const me = await participantMe();
      assert.equal(me.authenticated, true);
      assert.equal(me.role, "participant");
      assert.equal(me.participant.username, auto.username);
      await json(participantsPath, "GET", undefined, 401, participantCookie);
      await json(settingsPath, "PATCH", { isSpinOpen: true }, 401, participantCookie);
      await json("/api/spin", "POST", undefined, 401, adminCookie);
    });
    assert.ok(participantCookie, "Cannot test spins without participant auth");

    await test("closed spin rejects without assignment or quota consumption", async () => {
      await json(settingsPath, "PATCH", { isSpinOpen: false });
      const before = await motions();
      const arena = await json<ArenaResponse>("/api/spin", "GET", undefined, 200, participantCookie);
      assert.equal(arena.settings.isSpinOpen, false);
      assert.ok(!arena.themes.some((t) => t.id === themeId), "Inactive theme must be hidden");
      await json("/api/spin", "POST", undefined, 400, participantCookie);
      assertReset((await participantMe()).participant);
      assert.deepEqual(await motions(), before);
    });

    await json(themesPath, "PATCH", { id: themeId, isActive: true });
    await json(motionsPath, "PATCH", { id: motionId, isActive: true });
    await json(settingsPath, "PATCH", { isSpinOpen: true, randomMode: "BALANCED", prepDurationSeconds: 60 });
    await test("open + concurrent duplicate spins return one stable result and consume one quota", async () => {
      const before = await motions();
      const responses = await Promise.allSettled(Array.from({ length: 4 }, async () => {
        const response = await request("/api/spin", "POST", undefined, participantCookie);
        return { status: response.status, data: await response.json() as SpinResponse };
      }));
      const results = responses.map((response) => {
        assert.ok(response.status === "fulfilled", "Concurrent HTTP request failed");
        return response.value;
      });
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409, 409, 409]);
      const winner = results.find((r) => r.status === 200)!.data;
      assert.equal(winner.success, true);
      assert.equal(winner.participant.username, auto.username);
      assert.ok(["PRO", "KONTRA"].includes(winner.stance));
      assert.ok(Number.isFinite(Date.parse(winner.spunAt)));
      for (const result of results) assert.deepEqual(resultOf(result.data), resultOf(winner));
      const duplicate = await json<SpinResponse>("/api/spin", "POST", undefined, 409, participantCookie);
      assert.equal(duplicate.alreadySpun, true);
      assert.deepEqual(resultOf(duplicate), resultOf(winner));
      const me = (await participantMe()).participant;
      assert.equal(me.hasSpun, true);
      assert.equal(me.assignedMotionText, winner.motionText);
      assert.equal(me.assignedThemeName, winner.themeName);
      assert.equal(me.assignedStance, winner.stance);
      assert.equal(me.spunAt, winner.spunAt);
      for (const motion of await motions()) {
        assert.equal(motion.usedCount, before.find((m) => m.id === motion.id)!.usedCount + (motion.id === me.assignedMotionId ? 1 : 0));
      }
    });
    await test("overview matches batch totals and prefix-scoped fixture assignment", async () => {
      const overview = await json<OverviewResponse>(`/api/admin/overview?batch=${encodeURIComponent(batch)}`);
      const saved = (await ownParticipants()).filter((p) => p.sessionBatch === batch);
      assert.deepEqual(overview.participants.filter((p) => p.username.startsWith(prefix)), saved);
      const spun = overview.participants.filter((p) => p.hasSpun);
      assert.equal(overview.stats.total, overview.participants.length);
      assert.equal(overview.stats.spun, spun.length);
      assert.equal(overview.stats.unspun, overview.participants.length - spun.length);
      assert.equal(overview.stats.pro, spun.filter((p) => p.assignedStance === "PRO").length);
      assert.equal(overview.stats.kontra, spun.filter((p) => p.assignedStance === "KONTRA").length);
      assert.deepEqual(overview.recentSpins.filter((p) => p.username.startsWith(prefix)).map((p) => p.username), [auto.username]);
    });
    await test("XLSX/CSV exports contain exact fixture data and spin result", async () => {
      const saved = (await ownParticipants()).find((p) => p.username === auto.username);
      assert.ok(saved);
      for (const format of ["xlsx", "csv"]) {
        const response = await request(`/api/admin/export?format=${format}`);
        assert.equal(response.status, 200);
        assert.ok(response.headers.get("content-type")?.includes(format === "csv" ? "text/csv" : "spreadsheetml"));
        assert.match(response.headers.get("content-disposition") || "", new RegExp(`attachment;.*\\.${format}"?$`));
        const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: "buffer", raw: true });
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]]);
        const row = rows.find((r) => r["NIM / Username"] === auto.username);
        assert.ok(row);
        assert.equal(row["Nama Lengkap"], auto.fullName);
        assert.equal(row["Token Akses"], autoParticipant.accessToken);
        assert.equal(row["Sesi Debat"], batch);
        assert.equal(row["Status Spin"], "SUDAH SPIN");
        assert.equal(row["Teks Mosi"], saved.assignedMotionText);
        assert.equal(row["Kategori Tema"], saved.assignedThemeName);
        assert.equal(row["Posisi Debat"], saved.assignedStance);
      }
    });
    await test("reset clears every assigned field and decrements used quota exactly once", async () => {
      const saved = (await ownParticipants()).find((p) => p.username === auto.username);
      assert.ok(saved?.assignedMotionId);
      const before = await motions();
      assert.equal((await json<{ count: number }>("/api/admin/participants/reset", "POST", { username: auto.username })).count, 1);
      assertReset((await ownParticipants()).find((p) => p.username === auto.username));
      for (const motion of await motions()) {
        assert.equal(motion.usedCount, before.find((m) => m.id === motion.id)!.usedCount - (motion.id === saved.assignedMotionId ? 1 : 0));
      }
      const after = await motions();
      await json("/api/admin/participants/reset", "POST", { username: auto.username });
      assert.deepEqual(await motions(), after, "Repeated reset must not decrement twice");
    });
    await test("deleting a spun participant releases quota; fixture theme/motion deletion", async () => {
      await json("/api/spin", "POST", undefined, 200, participantCookie);
      const saved = (await ownParticipants()).find((p) => p.username === auto.username);
      assert.ok(saved?.assignedMotionId);
      const before = await motions();
      await json(`${participantsPath}?username=${encodeURIComponent(auto.username)}`, "DELETE");
      assert.ok(!(await ownParticipants()).some((p) => p.username === auto.username));
      for (const motion of await motions()) {
        assert.equal(motion.usedCount, before.find((m) => m.id === motion.id)!.usedCount - (motion.id === saved.assignedMotionId ? 1 : 0));
      }
      await json(`${motionsPath}?id=${encodeURIComponent(motionId)}`, "DELETE");
      assert.ok(!(await motions()).some((m) => m.id === motionId));
      await json(`${themesPath}?id=${encodeURIComponent(themeId)}`, "DELETE");
      assert.ok(!(await themes()).some((t) => t.id === themeId));
    });
  } finally {
    if (adminCookie) {
      // Discover by this run's prefix, including inserts from an incorrectly non-atomic endpoint.
      await test("cleanup own participants", async () => {
        const targets = await ownParticipants();
        for (const p of targets) await test(`cleanup ${p.username}`, async () => {
          await json(`${participantsPath}?username=${encodeURIComponent(p.username)}`, "DELETE");
        });
        assert.equal((await ownParticipants()).length, 0);
      });
      await test("cleanup own themes (cascades own motions)", async () => {
        const targets = (await themes()).filter((t) => t.name.startsWith(prefix));
        for (const t of targets) await test(`cleanup ${t.name}`, async () => {
          await json(`${themesPath}?id=${encodeURIComponent(t.id)}`, "DELETE");
        });
        assert.ok(!(await themes()).some((t) => t.name.startsWith(prefix)));
      });
      if (originalSettings) await test("restore original settings", async () => {
        await json(settingsPath, "PATCH", originalSettings);
        assert.deepEqual(await settings(), originalSettings);
      });
    }
  }
  assert.equal(failures, 0, `${failures} HTTP E2E check(s) failed`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "HTTP E2E failed");
  process.exitCode = 1;
});
