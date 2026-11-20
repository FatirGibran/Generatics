// Run: node --import tsx scripts/admin-routes-test.ts (or: npx tsx scripts/admin-routes-test.ts)
// Routes execute against transaction-aware mocks, never the application's Prisma client or a server.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import * as React from "react";

const root = path.resolve(__dirname, "..");
const localRequire = createRequire(path.join(root, "package.json"));
class KnownError extends Error {
  constructor(public code: string) { super(code); }
}
let assigned = false;
let authenticated = true;
let inTransaction = false;
let transactions = 0;
let writes: { model: string; method: string; data: any }[] = [];
let stateIndex = 0;
let hookValues: unknown[] = [];
const currentMotion = { id: "m", themeId: "t", motionText: "Original", maxUsage: 5, usedCount: 0, isActive: true };
const currentTheme = { id: "t", name: "Theme", description: "", isActive: true };
const model = (name: string, current: typeof currentMotion | typeof currentTheme) => ({
  findUniqueOrThrow: async ({ where }: any) => {
    assert(inTransaction, "lock check must be transactional");
    if (where.id === "missing") throw new KnownError("P2025");
    return current;
  },
  create: async ({ data }: any) => {
    if (data.themeId === "missing") throw new KnownError("P2003");
    writes.push({ model: name, method: "create", data });
    return { id: "created" };
  },
  update: async ({ data }: any) => {
    assert(inTransaction);
    if (data.themeId === "missing") throw new KnownError("P2003");
    writes.push({ model: name, method: "update", data });
  },
  delete: async () => {
    assert(inTransaction);
    writes.push({ model: name, method: "delete", data: null });
  },
});
const prisma: any = {
  motion: model("motion", currentMotion),
  theme: model("theme", currentTheme),
  participant: { findFirst: async () => { assert(inTransaction); return assigned ? { id: "p" } : null; } },
  systemSetting: { upsert: async ({ create, update }: any) => {
    writes.push({ model: "settings", method: "upsert", data: update });
    return { ...create, ...update };
  } },
  $transaction: async (fn: (tx: any) => Promise<unknown>) => {
    transactions++;
    assert(!inTransaction, "only one transaction per request");
    const before = writes.slice();
    inTransaction = true;
    try { return await fn(prisma); }
    catch (error) { writes = before; throw error; }
    finally { inTransaction = false; }
  },
};
function load(relative: string): any {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const requireMock = (id: string): any => {
    if (id === "@/lib/auth") return { getAdminSession: async () => authenticated ? { role: "admin" } : null };
    if (id === "@/lib/prisma") return { prisma, ensurePrismaWAL: async () => {} };
    if (id === "@prisma/client") return { Prisma: { PrismaClientKnownRequestError: KnownError } };
    if (id === "react") return { ...React, useState: (initial: unknown) => {
      const index = stateIndex++;
      return [index in hookValues ? hookValues[index] : initial, () => {}];
    }, useMemo: (fn: () => unknown) => fn(), useEffect: () => {} };
    if (id === "./Modal") return { __esModule: true, default: "modal", ModalActions: "actions" };
    if (id === "./MotionEditor") return { __esModule: true, default: "motion-editor" };
    if (id === "./ui") return { Surface: "section", SpinSwitch: "switch", StarIcon: "star", focusRing: "", inputCls: "", labelCls: "" };
    if (!["next/server", "react/jsx-runtime", "lucide-react"].includes(id)) throw new Error("Unexpected import: " + id);
    return localRequire(id);
  };
  new Function("require", "module", "exports", code)(requireMock, module, module.exports);
  return module.exports;
}
const motions = load("app/api/admin/motions/route.ts");
const themes = load("app/api/admin/themes/route.ts");
const settings = load("app/api/admin/settings/route.ts");
let checks = 0;
async function call(route: any, method: string, body: unknown, status: number) {
  writes = [];
  const response = await route[method]({ url: "http://test/api/admin/test?id=m", json: async () => body });
  assert.equal(response.status, status, method + " " + JSON.stringify(body));
  if (status >= 400) assert.equal(writes.length, 0, "failed requests must not commit writes");
  checks++;
  return response.json();
}
function nodes(element: any): any[] {
  return element && typeof element === "object"
    ? [element, ...React.Children.toArray(element.props?.children).flatMap(nodes)] : [];
}

async function main() {
  const item = { themeId: "t", motionText: " New " };
  for (const route of [themes, motions, settings]) {
    for (const body of [null, [], 1, "bad"]) await call(route, "PATCH", body, 400);
  }
  for (const bad of [null, {}, [], { ...item, themeId: " " }, { ...item, motionText: " " }, { ...item, isActive: "false" }]) {
    await call(motions, "POST", { motions: [item, bad] }, 400);
  }
  for (const maxUsage of [0, -1, 1.5, "bad", " ", true, [], {}, 2147483648]) {
    await call(motions, "POST", { motions: [item, { ...item, maxUsage }] }, 400);
    await call(motions, "PATCH", { id: "m", maxUsage }, 400);
  }
  for (const motionsList of [[], null, {}, "bad"]) await call(motions, "POST", { motions: motionsList }, 400);
  let before = transactions;
  assert.equal((await call(motions, "POST", { motions: [item, { ...item, maxUsage: "3", isActive: false }] }, 200)).count, 2);
  assert.equal(transactions, before + 1);
  assert.deepEqual(writes.map((write) => write.data), [
    { themeId: "t", motionText: "New", maxUsage: null, usedCount: 0, isActive: true },
    { themeId: "t", motionText: "New", maxUsage: 3, usedCount: 0, isActive: false },
  ]);
  before = transactions;
  await call(motions, "POST", { motions: [item, { ...item, themeId: "missing" }] }, 400);
  assert.equal(transactions, before + 1, "FK failure must roll back the entire batch");
  assert.equal((await call(motions, "POST", item, 200)).id, "created", "single-create contract stays intact");
  for (const maxUsage of [null, "", 1, "5", 2147483647]) await call(motions, "PATCH", { id: "m", maxUsage }, 200);
  for (const motionText of [" ", null, {}]) await call(motions, "PATCH", { id: "m", motionText }, 400);
  for (const name of [" ", null, {}]) await call(themes, "PATCH", { id: "t", name }, 400);
  assigned = true;
  await call(motions, "PATCH", { id: "m", motionText: "Changed", isActive: false }, 409);
  await call(motions, "PATCH", { id: "m", themeId: "other" }, 409);
  await call(themes, "PATCH", { id: "t", name: "Changed", isActive: false }, 409);
  await call(motions, "PATCH", { id: "m", motionText: "Original", themeId: "t", maxUsage: 1, isActive: false }, 200);
  assert.equal(writes[0].data.maxUsage, 1);
  await call(motions, "PATCH", { id: "m", maxUsage: null, isActive: true }, 200);
  await call(themes, "PATCH", { id: "t", name: "Theme", description: "New", isActive: false }, 200);
  for (const route of [themes, motions]) await call(route, "DELETE", undefined, 409);
  assigned = false;
  await call(motions, "PATCH", { id: "m", motionText: "Changed", themeId: "other" }, 200);
  await call(themes, "PATCH", { id: "t", name: "Changed" }, 200);
  for (const route of [themes, motions]) {
    await call(route, "PATCH", { id: "missing" }, 404);
    await call(route, "DELETE", undefined, 200);
  }
  for (const prepDurationSeconds of [29, 7201, 30.5, "300", null]) {
    await call(settings, "PATCH", { prepDurationSeconds, isSpinOpen: true }, 400);
  }
  await call(settings, "PATCH", { randomMode: "bad", isSpinOpen: true }, 400);
  await call(settings, "PATCH", { isSpinOpen: "false" }, 400);
  for (const prepDurationSeconds of [30, 300, 7200]) await call(settings, "PATCH", { prepDurationSeconds }, 200);

  const MotionEditor = load("components/admin/MotionEditor.tsx").default;
  const originalFormData = globalThis.FormData;
  let fields: Record<string, string> = {};
  globalThis.FormData = class { get(key: string) { return fields[key] ?? null; } } as any;
  try {
    let saved: any;
    const props = { themes: [currentTheme], saving: false, error: "", onClose() {}, onSave: async (body: unknown) => { saved = body; } };
    fields = { themeId: "t", motionText: " First \r\n\n Second ", maxUsage: "", isActive: "on" };
    let tree = MotionEditor({ ...props, motion: null });
    nodes(tree).find((node) => node.type === "form").props.onSubmit({ preventDefault() {}, currentTarget: {} });
    assert.deepEqual(saved, { motions: ["First", "Second"].map((motionText) => ({ themeId: "t", motionText, maxUsage: null, isActive: true })) });
    tree = MotionEditor({ ...props, motion: { ...currentMotion, usedCount: 2 } });
    const elements = nodes(tree);
    for (const id of ["edit-motion-text", "edit-motion-theme"]) assert.equal(elements.find((node) => node.props?.id === id).props.disabled, true);
    fields = { maxUsage: "3" };
    elements.find((node) => node.type === "form").props.onSubmit({ preventDefault() {}, currentTarget: {} });
    assert.deepEqual(saved, { id: "m", maxUsage: 3, isActive: false });
    checks += 2;
  } finally { globalThis.FormData = originalFormData; }

  const SettingsTab = load("components/admin/SettingsTab.tsx").default;
  for (const [minutes, valid, seconds] of [["0.5", true, 30], ["1.25", true, 75], ["120", true, 7200], ["121", false], ["", false]] as const) {
    stateIndex = 0;
    hookValues = [minutes];
    let update: unknown;
    const elements = nodes(SettingsTab({ settings: { prepDurationSeconds: 300 }, onUpdate: (body: unknown) => { update = body; } }));
    assert.equal(elements.find((node) => node.props?.id === "prep-minutes").props["aria-invalid"], !valid);
    elements.find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.deepEqual(update, valid ? { prepDurationSeconds: seconds } : undefined);
    checks++;
  }
  const MotionsTab = load("components/admin/MotionsTab.tsx").default;
  const originalFetch = globalThis.fetch;
  const requests: any[] = [];
  const notices: any[] = [];
  let refreshes = 0;
  let fail = false;
  globalThis.fetch = (async (url: unknown, init: any) => {
    requests.push({ url, method: init.method, body: JSON.parse(init.body) });
    return { ok: !fail, json: async () => fail ? { error: "Locked result" } : { success: true } };
  }) as any;
  const tab = (editor: unknown) => {
    stateIndex = 0;
    hookValues = ["", "ALL", editor, false, ""];
    return nodes(MotionsTab({ themes: [currentTheme], motions: [currentMotion],
      onRefresh: async () => { refreshes++; }, notify: (...args: unknown[]) => notices.push(args) }));
  };
  try {
    const patch = { id: "m", maxUsage: null, isActive: false };
    await tab({ kind: "motion", motion: currentMotion }).find((node) => node.type === "motion-editor").props.onSave(patch);
    assert.deepEqual(requests.pop(), { url: "/api/admin/motions", method: "PATCH", body: patch });
    assert.equal(refreshes, 1);
    const bulk = { motions: [item] };
    await tab({ kind: "bulk" }).find((node) => node.type === "motion-editor").props.onSave(bulk);
    assert.deepEqual(requests.pop(), { url: "/api/admin/motions", method: "POST", body: bulk });
    assert.equal(refreshes, 2);
    globalThis.FormData = class { get(key: string) { return ({ name: "Renamed", description: "D" } as any)[key] ?? null; } } as any;
    tab({ kind: "theme", theme: currentTheme }).find((node) => node.type === "form").props.onSubmit({ preventDefault() {}, currentTarget: {} });
    await new Promise(setImmediate);
    assert.deepEqual(requests.pop(), { url: "/api/admin/themes", method: "PATCH", body: { id: "t", name: "Renamed", description: "D", isActive: false } });
    assert.equal(refreshes, 3);
    fail = true;
    await tab({ kind: "motion", motion: currentMotion }).find((node) => node.type === "motion-editor").props.onSave(patch);
    assert.deepEqual(notices.pop(), ["Locked result", "error"]);
    assert.equal(refreshes, 3, "failed updates must not signal success/refresh");
    checks += 4;
  } finally { globalThis.fetch = originalFetch; globalThis.FormData = originalFormData; }

  authenticated = false;
  for (const route of [themes, motions, settings]) await call(route, "PATCH", {}, 401);
  console.log(`PASS: ${checks} admin route/editor checks; no database or server access.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
