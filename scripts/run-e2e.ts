// Requires a current `npm run build`. Run: node --import tsx scripts/run-e2e.ts
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const origin = "http://127.0.0.1:3100";

interface ProcessRun {
  child: ChildProcess;
  done: Promise<number | null>;
  closed: boolean;
  error?: Error;
}

function launch(args: string[], env: NodeJS.ProcessEnv, timeout: number): ProcessRun {
  const child = spawn(process.execPath, args, {
    cwd: root, env, stdio: ["ignore", "pipe", "inherit"], timeout, killSignal: "SIGKILL",
  });
  const run: ProcessRun = { child, closed: false, done: Promise.resolve(null) };
  child.stdout!.pipe(process.stdout);
  child.once("error", (error) => { run.error = error; });
  run.done = new Promise((resolve) => child.once("close", (code) => {
    run.closed = true;
    resolve(code);
  }));
  return run;
}

async function stop(run: ProcessRun | undefined) {
  if (!run || run.closed) return;
  run.child.kill("SIGTERM");
  const kill = setTimeout(() => run.child.kill("SIGKILL"), 5_000);
  try { await run.done; } finally { clearTimeout(kill); }
}

async function main() {
  // Never build or import server modules here: only the child may initialize Prisma.
  await access(join(root, ".next", "BUILD_ID")).catch(() => {
    throw new Error("No production build found. Run npm run build with an isolated DATABASE_URL first.");
  });
  // Refuse an existing service without sending it even a health request.
  await new Promise<void>((resolve, reject) => {
    const socket = createServer();
    socket.once("error", reject);
    socket.listen({ host: "127.0.0.1", port: 3100, exclusive: true }, () => {
      socket.close((error) => error ? reject(error) : resolve());
    });
  });

  const directory = await mkdtemp(join(tmpdir(), "generatics-e2e-"));
  const password = randomBytes(32).toString("hex");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // VERCEL would otherwise make lib/prisma ignore a file: DATABASE_URL.
    VERCEL: "",
    NODE_ENV: "production",
    DATABASE_URL: `file:${join(directory, "e2e.db")}`,
    JWT_SECRET: randomBytes(48).toString("hex"),
    DEFAULT_ADMIN_PASSWORD: password,
    E2E_ADMIN_PASSWORD: password,
    E2E_ADMIN_USERNAME: "admin",
    E2E_BASE_URL: origin,
    E2E_ALLOW_WRITES: "1",
    NEXT_TELEMETRY_DISABLED: "1",
  };
  let server: ProcessRun | undefined;
  let tests: ProcessRun | undefined;
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    tests?.child.kill("SIGTERM");
    server?.child.kill("SIGTERM");
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    console.log(`Starting isolated E2E server at ${origin} with a disposable SQLite database`);
    server = launch([join(root, "node_modules", "next", "dist", "bin", "next"), "start", "--hostname", "127.0.0.1", "--port", "3100"], env, 180_000);
    let output = "";
    let ready = false;
    server.child.stdout!.on("data", (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-4096);
      ready = /Ready in/.test(output);
    });
    const deadline = Date.now() + 60_000;
    let healthy = false;
    while (Date.now() < deadline) {
      assert.ok(!interrupted, "E2E interrupted");
      assert.ok(!server.closed && server.child.exitCode === null && !server.error, "Isolated Next server exited before health check");
      // Do not contact a different service if Next loses the bind race and exits.
      if (ready) {
        const response = await fetch(`${origin}/api/health`, { redirect: "error", signal: AbortSignal.timeout(2_000) }).catch(() => null);
        if (response?.ok) {
          const data: unknown = await response.json();
          healthy = !!data && typeof data === "object" && "status" in data && data.status === "ok" && "db" in data && data.db === "connected";
          if (healthy) break;
        }
      }
      await delay(250);
    }
    assert.ok(healthy, "Isolated server did not become healthy within 60 seconds");
    assert.ok(!interrupted && !server.closed, "Isolated server stopped before tests");
    tests = launch(["--import", "tsx", join(root, "scripts", "e2e-test.ts")], env, 120_000);
    const code = await tests.done;
    assert.ok(!interrupted, "E2E interrupted");
    assert.ifError(tests.error);
    assert.equal(code, 0, "HTTP E2E tests failed or exceeded 120 seconds");
    console.log("Isolated HTTP E2E passed");
  } finally {
    try {
      await stop(tests);
      await stop(server);
    } finally {
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", interrupt);
      await rm(directory, { recursive: true, force: true });
      console.log("Isolated E2E server stopped; disposable database removed");
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Isolated HTTP E2E failed");
  process.exitCode = 1;
});
