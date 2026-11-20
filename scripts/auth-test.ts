// Run: node --import tsx scripts/auth-test.ts
// Prisma is mocked throughout; no application database or server is accessed.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { SignJWT } from "jose";
import ts from "typescript";

const root = path.resolve(__dirname, "..");
const localRequire = createRequire(path.join(root, "package.json"));
function load(relative: string, mocks: Record<string, unknown> = {}): any {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const requireMock = (id: string) => {
    if (id in mocks) return mocks[id];
    assert(["jose", "next/server", "path"].includes(id), "Unexpected import: " + id);
    return localRequire(id);
  };
  new Function("require", "module", "exports", "globalThis", code)(requireMock, module, module.exports, {});
  return module.exports;
}
class KnownError extends Error {
  constructor(public code: string) { super(code); }
}
const envKeys = ["JWT_SECRET", "VERCEL", "DATABASE_URL", "DEFAULT_ADMIN_USERNAME", "DEFAULT_ADMIN_PASSWORD"];
const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

async function main() {
  delete process.env.JWT_SECRET;
  const auth = load("lib/auth.ts", { "next/headers": { cookies: () => ({ get: () => undefined }) } });
  for (const secret of [undefined, "short", "s".repeat(31)]) {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    await assert.rejects(auth.signSessionToken({ role: "admin", username: "admin" }), /JWT_SECRET/);
    await assert.rejects(auth.verifySessionToken("invalid"), /JWT_SECRET/);
  }
  process.env.JWT_SECRET = "s".repeat(32);
  for (const role of ["admin", "participant"]) {
    const token = await auth.signSessionToken({ role, username: "user" });
    assert.equal((await auth.verifySessionToken(token)).role, role);
  }
  const key = new TextEncoder().encode(process.env.JWT_SECRET);
  for (const payload of [{}, { role: "owner", username: "user" }, { role: "admin" },
    { role: "admin", username: " " }, { role: "admin", username: 42 }]) {
    const token = await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).sign(key);
    assert.equal(await auth.verifySessionToken(token), null);
    await assert.rejects(auth.signSessionToken(payload), /valid role/);
  }
  const tokenFor = (alg: string, signingKey = key) => new SignJWT({ role: "admin", username: "user" })
    .setProtectedHeader({ alg }).sign(signingKey);
  assert.equal(await auth.verifySessionToken(await tokenFor("HS384", new Uint8Array(48))), null);
  assert.equal(await auth.verifySessionToken(await tokenFor("HS256", new Uint8Array(32))), null);
  const expired = await new SignJWT({ role: "admin", username: "user" })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime(0).sign(key);
  assert.equal(await auth.verifySessionToken(expired), null);
  assert.equal(await auth.verifySessionToken("invalid"), null);

  delete process.env.VERCEL;
  delete process.env.DEFAULT_ADMIN_PASSWORD;
  process.env.DATABASE_URL = "file:/not-opened-test.db";
  let queries = 0;
  let adminCount = 1;
  let failure: Error | null = null;
  let countFailure: Error | null = null;
  const admins: any[] = [];
  const db = {
    $queryRawUnsafe: async () => { queries++; if (failure) throw failure; },
    $executeRawUnsafe: async () => {},
    admin: {
      count: async () => { if (countFailure) throw countFailure; return adminCount; },
      upsert: async (args: any) => { admins.push(args); },
    },
    systemSetting: { upsert: async () => {} },
    // Any automatic participant seeding or counting fails this test.
  };
  const prismaMocks = {
    "@prisma/client": { PrismaClient: class { constructor() { return db; } },
      Prisma: { PrismaClientKnownRequestError: KnownError } },
    bcryptjs: { hash: async (password: string) => "hash:" + password },
    "./seed-data": { SEED_THEMES: [] },
  };
  const init = () => load("lib/prisma.ts", prismaMocks);
  process.env.VERCEL = "1";
  const blocked = init(); // Import must succeed on Vercel builds.
  await assert.rejects(blocked.ensurePrismaWAL(), /persistent database.*required/i);
  assert.equal(queries, 0, "Vercel guard runs before any database operation");
  delete process.env.VERCEL;
  const retry = init();
  failure = new Error("WAL failed");
  await assert.rejects(retry.ensurePrismaWAL(), /WAL failed/);
  failure = null;
  countFailure = new Error("database unavailable");
  await assert.rejects(retry.ensurePrismaWAL(), /database unavailable/);
  countFailure = new KnownError("P2021");
  await assert.rejects(retry.ensurePrismaWAL(), /DEFAULT_ADMIN_PASSWORD/);
  countFailure = null;
  adminCount = 0;
  await assert.rejects(retry.ensurePrismaWAL(), /DEFAULT_ADMIN_PASSWORD/);
  process.env.DEFAULT_ADMIN_USERNAME = "organizer";
  process.env.DEFAULT_ADMIN_PASSWORD = "configured-password";
  await Promise.all([retry.ensurePrismaWAL(), retry.ensurePrismaWAL()]);
  assert.equal(admins.length, 1);
  assert.equal(admins[0].create.username, "organizer");
  assert.equal(admins[0].create.passwordHash, "hash:configured-password");
  assert.deepEqual(admins[0].update, {});
  const before = queries;
  await retry.ensurePrismaWAL();
  assert.equal(queries, before);
  process.env.VERCEL = "1";
  await assert.rejects(retry.ensurePrismaWAL(), /persistent database/);
  delete process.env.VERCEL;
  adminCount = 1;
  delete process.env.DEFAULT_ADMIN_PASSWORD;
  await init().ensurePrismaWAL(); // Existing admins don't require bootstrap credentials.

  let authenticated = true;
  const routeAuth = { getAdminSession: async () => authenticated ? { role: "admin", username: "organizer" } : null };
  let locked = false;
  let transactions = 0;
  let usedCount = 2;
  let participants = [{ username: "p", assignedMotionId: "m", hasSpun: true }];
  const resetDb: any = {
    $executeRaw: async () => { locked = true; },
    participant: {
      findMany: async ({ where }: any) => {
        assert(locked, "writer lock must be acquired before reading participants");
        if (where.username === "missing" || where.sessionBatch === "missing") return [];
        return participants;
      },
      updateMany: async ({ data }: any) => {
        assert(locked);
        participants = participants.map((p) => ({ ...p, ...data }));
        return { count: participants.length };
      },
    },
    motion: {
      findUnique: async () => { assert(locked); return { usedCount }; },
      update: async ({ data }: any) => { assert(locked); usedCount = data.usedCount; },
    },
    $transaction: async (fn: (tx: any) => Promise<unknown>) => {
      transactions++;
      locked = false;
      try { return await fn(resetDb); } finally { locked = false; }
    },
  };
  const reset = load("app/api/admin/participants/reset/route.ts", {
    "@/lib/auth": routeAuth, "@/lib/prisma": { prisma: resetDb, ensurePrismaWAL: async () => {} },
  });
  async function call(body: unknown, status: number) {
    const response = await reset.POST({ json: async () => body });
    assert.equal(response.status, status, JSON.stringify(body));
    return response.json();
  }
  for (const body of [null, [], "bad", {}, { all: "false" }, { all: "true" }, { all: 1 },
    { all: false }, { username: 1 }, { username: true }, { username: " " }, { batch: [] },
    { batch: " " }, { username: "p", batch: "Day 1" }, { username: "p", all: true },
    { username: "p", typo: true }]) await call(body, 400);
  assert.equal((await reset.POST({ json: async () => { throw new SyntaxError("Invalid JSON"); } })).status, 400);
  assert.equal(transactions, 0, "invalid requests cannot start a reset");
  await call({ username: "missing" }, 404);
  await call({ batch: "missing" }, 404);
  assert.equal((await call({ username: " p ", all: false }, 200)).count, 1);
  assert.equal(usedCount, 1);
  assert.equal((await call({ username: "p" }, 200)).count, 0);
  assert.equal(usedCount, 1, "repeat reset must not decrement usage twice");
  participants = [{ username: "p", assignedMotionId: "m", hasSpun: true }];
  assert.equal((await call({ batch: "Day 1" }, 200)).count, 1);
  assert.equal(usedCount, 0);
  participants = ["p", "q"].map((username) => ({ username, assignedMotionId: "m", hasSpun: true }));
  usedCount = 1;
  assert.equal((await call({ all: true }, 200)).count, 2);
  assert.equal(usedCount, 0, "grouped usage decrements must not become negative");
  participants = [];
  assert.equal((await call({ all: true }, 200)).count, 0);
  authenticated = false;
  await call({ all: true }, 401);
  authenticated = true;

  const seed = load("app/api/admin/seed/route.ts", {
    "@/lib/auth": routeAuth,
    "@/lib/prisma": { prisma: { systemSetting: db.systemSetting }, ensurePrismaWAL: async () => {} },
    "@/lib/seed-data": { SEED_THEMES: [] },
  });
  assert.equal((await seed.POST()).status, 200, "seed must not read/write admin hashes or participants");
  console.log("PASS: JWT validation, lazy configuration, initialization failure/retry, Vercel guard, reset validation/lock/idempotency, and seed isolation; no database or server access.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});
