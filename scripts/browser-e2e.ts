// After rebuilding: E2E_BROWSER=1 node --import tsx scripts/run-e2e.ts
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chromium, expect, type BrowserContext, type Page } from "@playwright/test";
import * as XLSX from "xlsx";
import type { Participant, SystemSetting } from "../lib/types";

const origin = "http://127.0.0.1:3100";
const participantsPath = "/api/admin/participants";
const settingsPath = "/api/admin/settings";
const prefix = `browser_${randomBytes(6).toString("hex")}_`;
const desktop = { width: 1440, height: 1000 };
const mobile = { width: 320, height: 740 };

async function noOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    panels: Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], form')).map((el) => ({
      width: el.clientWidth, content: el.scrollWidth,
    })),
  }));
  assert.ok(widths.content <= widths.viewport + 1, `Horizontal page overflow: ${JSON.stringify(widths)}`);
  for (const panel of widths.panels) {
    assert.ok(panel.content <= panel.width + 1, `Horizontal form/modal overflow: ${JSON.stringify(panel)}`);
  }
}

async function main() {
  // Only run as a child of the disposable runner, never against an existing service.
  assert.equal(process.env.E2E_BASE_URL, origin, "Browser E2E requires the isolated port-3100 runner");
  assert.equal(process.env.E2E_ALLOW_WRITES, "1");
  assert.match(process.env.E2E_ISOLATED_RUN || "", /^[a-f0-9]{64}$/);
  assert.match(process.env.DATABASE_URL || "", /^file:.*\/generatics-e2e-[^/]+\/e2e\.db$/);
  const password = process.env.E2E_ADMIN_PASSWORD || "";
  assert.match(password, /^[a-f0-9]{64}$/, "Runner-generated random credentials are required");
  assert.equal(password, process.env.DEFAULT_ADMIN_PASSWORD);
  assert.equal(process.env.E2E_ADMIN_USERNAME, "admin");

  const browser = await chromium.launch({
    executablePath: process.env.E2E_BROWSER_PATH || "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    headless: true,
  });
  const failures: Error[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: { text: string; url: string }[] = [];
  let originalSettings: SystemSetting | undefined;
  let adminContext: BrowserContext | undefined;
  let loggedIn = false;
  let step = "startup";

  async function context() {
    const ctx = await browser.newContext({ baseURL: origin, viewport: desktop, reducedMotion: "reduce" });
    ctx.setDefaultTimeout(10_000);
    ctx.setDefaultNavigationTimeout(20_000);
    await ctx.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      pageErrors.push(`Refused non-isolated browser request: ${url.origin}${url.pathname}`);
      return route.abort();
    });
    ctx.on("page", (page) => {
      page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push({ text: message.text(), url: message.location().url });
      });
      page.on("dialog", (dialog) => {
        pageErrors.push(`Unexpected browser dialog: ${dialog.type()} ${dialog.message()}`);
        void dialog.dismiss();
      });
    });
    return ctx;
  }

  async function api<T>(path: string, method = "GET", data?: unknown): Promise<T> {
    assert.ok(adminContext);
    const response = await adminContext.request.fetch(path, {
      method, data, timeout: 10_000, maxRedirects: 0,
    });
    assert.equal(response.status(), 200, `${method} ${path}: ${await response.text()}`);
    return response.json() as Promise<T>;
  }
  const participants = async () => (await api<{ participants: Participant[] }>(participantsPath)).participants;
  const ownParticipant = async (username: string) => {
    const participant = (await participants()).find((p) => p.username === username);
    assert.ok(participant, `Missing fixture ${username}`);
    return participant;
  };
  const checkpoint = (name: string) => { step = name; console.log(`Browser E2E: ${name}`); };

  try {
    checkpoint("admin UI login");
    adminContext = await context();
    const admin = await adminContext.newPage();
    await admin.goto("/admin/login");
    await admin.getByLabel("Username Panitia", { exact: true }).fill("admin");
    await admin.getByLabel("Password", { exact: true }).fill(password);
    await admin.getByRole("button", { name: "Masuk Dashboard", exact: true }).click();
    await expect(admin).toHaveURL(`${origin}/admin`);
    await expect(admin.getByRole("button", { name: /Peserta & Token/ }).filter({ visible: true })).toBeVisible();
    loggedIn = true;
    originalSettings = (await api<{ settings: SystemSetting }>(settingsPath)).settings;
    await api(settingsPath, "PATCH", { isSpinOpen: true, prepDurationSeconds: 30 });
    await admin.getByRole("button", { name: /Peserta & Token/ }).filter({ visible: true }).click();

    const username = `${prefix}auto`;
    const fullName = `${prefix}Participant`;
    const token = `${prefix}TOKEN`.toUpperCase();
    const search = admin.getByLabel("Cari peserta berdasarkan nama, NIM, atau token", { exact: true });
    const row = () => admin.getByRole("row").filter({ hasText: username });
    const add = async (nim: string, name: string, manualToken = "") => {
      await admin.getByRole("button", { name: "Tambah Peserta", exact: true }).click();
      const form = admin.getByRole("dialog", { name: "Tambah Peserta", exact: true });
      await form.getByLabel("NIM / Username", { exact: true }).fill(nim);
      await form.getByLabel("Nama Lengkap", { exact: true }).fill(name);
      await form.getByLabel("Sesi Pelaksanaan", { exact: true }).selectOption("Day 2");
      await form.getByLabel("Token Akses (opsional)", { exact: true }).fill(manualToken);
      await noOverflow(admin);
      let response;
      try {
        [response] = await Promise.all([
          admin.waitForResponse((res) => new URL(res.url()).pathname === participantsPath && res.request().method() === "POST"),
          form.getByRole("button", { name: "Simpan Peserta", exact: true }).click(),
        ]);
      } catch (error) {
        const validity = await form.locator("input").evaluateAll((inputs) => inputs.map((input) => ({
          id: input.id, valid: input.validity.valid, patternMismatch: input.validity.patternMismatch,
          valueMissing: input.validity.valueMissing, message: input.validationMessage,
        })));
        throw new Error(`Tambah/Simpan failed; native input validity: ${JSON.stringify(validity)}`, { cause: error });
      }
      return { form, response };
    };

    checkpoint("desktop add: generated token, visible row, persisted participant");
    const created = await add(username, fullName);
    assert.equal(created.response.status(), 200, await created.response.text());
    await expect(created.form).toBeHidden();
    await search.fill(username);
    const saved = await ownParticipant(username);
    assert.match(saved.accessToken, /^STR-[A-Z0-9]+$/);
    await expect(row()).toContainText(fullName);
    await expect(row()).toContainText(saved.accessToken);
    await expect(row()).toContainText("Day 2");

    checkpoint("320px add form: manual token, no overflow");
    await admin.setViewportSize(mobile);
    const manual = await add(`${prefix}manual`, `${prefix}Mobile`, token);
    assert.equal(manual.response.status(), 200, await manual.response.text());
    await expect(manual.form).toBeHidden();
    await search.fill(`${prefix}manual`);
    await expect(admin.getByRole("listitem").filter({ hasText: `${prefix}manual` })).toContainText(token);
    assert.equal((await ownParticipant(`${prefix}manual`)).accessToken, token);
    await noOverflow(admin);

    checkpoint("duplicate 409 keeps all form fields and error");
    const duplicateName = `${prefix}Duplicate`;
    const duplicate = await add(username, duplicateName, `${token}DUP`);
    assert.equal(duplicate.response.status(), 409, await duplicate.response.text());
    const duplicateBody = await duplicate.response.json();
    assert.equal(typeof duplicateBody.error, "string");
    await expect(duplicate.form.getByRole("alert")).toHaveText(duplicateBody.error);
    await expect(duplicate.form.getByLabel("NIM / Username", { exact: true })).toHaveValue(username);
    await expect(duplicate.form.getByLabel("Nama Lengkap", { exact: true })).toHaveValue(duplicateName);
    await expect(duplicate.form.getByLabel("Sesi Pelaksanaan", { exact: true })).toHaveValue("Day 2");
    await expect(duplicate.form.getByLabel("Token Akses (opsional)", { exact: true })).toHaveValue(`${token}DUP`);
    assert.equal((await ownParticipant(username)).fullName, fullName);
    await duplicate.form.getByRole("button", { name: "Batal", exact: true }).click();
    await expect(duplicate.form).toBeHidden();

    checkpoint("edit participant and optional clipboard permission");
    await admin.setViewportSize(desktop);
    await search.fill(username);
    await row().getByRole("button", { name: `Ubah peserta ${fullName}`, exact: true }).click();
    const editor = admin.getByRole("dialog", { name: "Ubah Peserta", exact: true });
    const editedName = `${prefix}Edited`;
    const editedToken = `${token}EDIT`;
    await expect(editor.getByLabel("Username / NIM (tidak dapat diubah)", { exact: true })).toHaveAttribute("readonly", "");
    await editor.getByLabel("Nama Lengkap", { exact: true }).fill(editedName);
    await editor.getByLabel("Sesi", { exact: true }).selectOption("Day 1");
    await editor.getByLabel("Token Akses", { exact: true }).fill(editedToken);
    await editor.getByRole("button", { name: "Simpan Perubahan", exact: true }).click();
    await expect(editor).toBeHidden();
    await expect(row()).toContainText(editedName);
    await expect(row()).toContainText(editedToken);
    const edited = await ownParticipant(username);
    assert.equal(edited.fullName, editedName);
    assert.equal(edited.sessionBatch, "Day 1");
    assert.equal(edited.accessToken, editedToken);
    let clipboard = false;
    try {
      await adminContext.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
      clipboard = await admin.evaluate(async () => (await navigator.permissions.query({ name: "clipboard-read" as PermissionName })).state === "granted");
    } catch { /* Clipboard permissions are optional for the selected Chromium executable. */ }
    if (clipboard) {
      await row().getByRole("button", { name: `Salin token ${editedToken}`, exact: true }).click();
      await expect.poll(() => admin.evaluate(() => navigator.clipboard.readText())).toBe(editedToken);
      await row().getByRole("button", { name: `Salin NIM dan token ${editedName}`, exact: true }).click();
      await expect.poll(() => admin.evaluate(() => navigator.clipboard.readText())).toBe(`NIM: ${username} | Token: ${editedToken}`);
    } else console.log("SKIP clipboard: browser did not grant permission");

    checkpoint("CSV and XLSX file uploads");
    for (const extension of ["csv", "xlsx"]) {
      const importedUsername = `${prefix}${extension}`;
      const importedToken = `${token}${extension.toUpperCase()}`;
      const rows = [{ username: importedUsername, full_name: `${prefix}${extension} Name`, session_batch: "Day 2", access_token: importedToken }];
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Participants");
      const buffer = extension === "csv" ? Buffer.from(XLSX.utils.sheet_to_csv(sheet)) : XLSX.write(book, { type: "buffer", bookType: "xlsx" });
      await admin.getByRole("button", { name: "Import CSV / Excel", exact: true }).click();
      const importer = admin.getByRole("dialog", { name: "Import Massal Peserta", exact: true });
      await importer.getByLabel("File CSV / Excel (maksimal 5 MB)", { exact: true }).setInputFiles({
        name: `${prefix}participants.${extension}`, buffer,
        mimeType: extension === "csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      await expect(importer.getByLabel("Data CSV", { exact: true })).toBeDisabled();
      await importer.getByRole("button", { name: "Proses Import", exact: true }).click();
      await expect(importer).toBeHidden();
      await search.fill(importedUsername);
      await expect(admin.getByRole("row").filter({ hasText: importedUsername })).toContainText(importedToken);
      assert.equal((await ownParticipant(importedUsername)).accessToken, importedToken);
    }

    checkpoint("separate participant context: homepage opening, mute, mobile login");
    const participantContext = await context();
    const participant = await participantContext.newPage();
    await participant.setViewportSize(mobile);
    await participant.goto("/");
    await participant.getByRole("button", { name: /MASUK KE DUNIA DEBAT/ }).click();
    await expect(participant.getByRole("heading", { name: "Masuk ke Arena Debat", exact: true })).toBeVisible();
    await participant.getByRole("button", { name: "Bisukan Musik", exact: true }).click();
    await expect(participant.getByRole("button", { name: "Nyalakan Musik", exact: true })).toHaveAttribute("aria-pressed", "false");
    await participant.getByRole("button", { name: "Nyalakan Musik", exact: true }).click();
    await expect(participant.getByRole("button", { name: "Bisukan Musik", exact: true })).toHaveAttribute("aria-pressed", "true");
    await participant.getByLabel("Username / NIM", { exact: true }).fill(username);
    await participant.getByLabel("Token Akses", { exact: true }).fill(editedToken);
    await noOverflow(participant);
    await participant.getByRole("button", { name: "MASUK KE ARENA DEBAT", exact: true }).click();
    await expect(participant).toHaveURL(`${origin}/spin`);
    const spin = participant.getByRole("button", { name: "Spin Tema, Mosi & Posisi", exact: true });
    await expect(spin).toBeEnabled();
    await noOverflow(participant);
    await participant.setViewportSize(desktop);

    checkpoint("spin, locked result and result storage");
    await spin.click();
    await expect(participant.getByText(/Posisimu sudah terkunci\./)).toBeVisible({ timeout: 20_000 });
    await expect(spin).toBeHidden();
    const spun = await ownParticipant(username);
    assert.equal(spun.hasSpun, true);
    assert.ok(spun.spunAt && spun.assignedMotionText && spun.assignedThemeName);
    await expect(participant.getByText(spun.assignedMotionText, { exact: true })).toBeVisible();
    const timerKey = `generatics_timer_${username}_${new Date(spun.spunAt).getTime()}`;
    const resultKey = `generatics_result_${username}`;
    const closingKey = `generatics_closing_${username}`;
    const storedTimer = () => participant.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), timerKey);
    const result = await participant.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), resultKey);
    assert.equal(result.motionText, spun.assignedMotionText);
    assert.equal(result.participant.username, username);

    checkpoint("30-second timer start/pause/resume/reset and reload persistence");
    await expect(participant.locator('[aria-live="off"]').filter({ hasText: /^00:30$/ })).toBeVisible();
    await participant.getByRole("button", { name: "Mulai timer persiapan", exact: true }).click();
    await expect.poll(async () => (await storedTimer())?.status).toBe("running");
    const running = await storedTimer();
    assert.equal(running.initialSeconds, 30);
    assert.equal(running.remainingMs, 30_000);
    await participant.reload();
    await expect(participant.getByRole("button", { name: "Jeda timer persiapan", exact: true })).toBeVisible();
    assert.equal((await storedTimer()).endTimestamp, running.endTimestamp);
    await participant.getByRole("button", { name: "Jeda timer persiapan", exact: true }).click();
    const paused = await storedTimer();
    assert.equal(paused.status, "paused");
    assert.ok(paused.remainingMs > 0 && paused.remainingMs < 30_000);
    await participant.reload();
    await expect(participant.getByRole("button", { name: "Lanjutkan timer persiapan", exact: true })).toBeVisible();
    assert.deepEqual(await storedTimer(), paused);
    await participant.getByRole("button", { name: "Lanjutkan timer persiapan", exact: true }).click();
    await expect.poll(async () => (await storedTimer())?.status).toBe("running");
    assert.ok((await storedTimer()).endTimestamp > running.endTimestamp);
    await participant.getByRole("button", { name: "Jeda timer persiapan", exact: true }).click();
    await participant.getByRole("button", { name: "Reset timer persiapan", exact: true }).click();
    assert.equal(await storedTimer(), null);
    await participant.reload();
    await expect(participant.getByRole("button", { name: "Mulai timer persiapan", exact: true })).toBeVisible();
    await expect(participant.locator('[aria-live="off"]').filter({ hasText: /^00:30$/ })).toBeVisible();
    assert.equal((await ownParticipant(username)).spunAt, spun.spunAt);

    const expectAutomaticReset = async () => {
      await expect(spin).toBeEnabled({ timeout: 15_000 });
      await expect(participant.getByText(/Posisimu sudah terkunci\./)).toBeHidden();
      assert.equal(await participant.evaluate((key) => localStorage.getItem(key), resultKey), null);
      assert.equal(await participant.evaluate((key) => sessionStorage.getItem(key), closingKey), null);
    };
    checkpoint("API admin reset returns wheel automatically, no participant reload");
    let navigations = 0;
    participant.on("framenavigated", (frame) => { if (frame === participant.mainFrame()) navigations++; });
    await api("/api/admin/participants/reset", "POST", { username });
    await expectAutomaticReset();
    assert.equal(navigations, 0, "Reset should not navigate or reload the participant page");

    checkpoint("admin reset confirmation cancel and confirm");
    await spin.click();
    await expect(participant.getByText(/Posisimu sudah terkunci\./)).toBeVisible({ timeout: 20_000 });
    await participant.getByRole("button", { name: "Selesai Sesi & Lanjut Pengumuman", exact: true }).click();
    const secondSpin = await ownParticipant(username);
    assert.equal(await participant.evaluate((key) => sessionStorage.getItem(key), closingKey), secondSpin.spunAt);
    await admin.reload();
    await admin.getByRole("button", { name: /Peserta & Token/ }).filter({ visible: true }).click();
    await search.fill(username);
    await row().getByRole("button", { name: "Reset Spin", exact: true }).click();
    const confirm = admin.getByRole("alertdialog", { name: `Reset spin ${editedName}?`, exact: true });
    await expect(confirm.getByRole("button", { name: "Batal", exact: true })).toBeFocused();
    await confirm.getByRole("button", { name: "Batal", exact: true }).click();
    await expect(confirm).toBeHidden();
    assert.equal((await ownParticipant(username)).spunAt, secondSpin.spunAt);
    await row().getByRole("button", { name: "Reset Spin", exact: true }).click();
    await confirm.getByRole("button", { name: "Ya, Reset Spin", exact: true }).click();
    await expect(confirm).toBeHidden();
    await expectAutomaticReset();
    assert.equal((await ownParticipant(username)).hasSpun, false);
    assert.equal(navigations, 0);
    await participant.setViewportSize(mobile);
    await noOverflow(participant);
    checkpoint("completed");
  } catch (error) {
    failures.push(new Error(`Browser E2E failed at: ${step}`, { cause: error }));
  } finally {
    const cleanup = async (name: string, action: () => Promise<unknown>) => {
      try { await action(); } catch (error) { failures.push(new Error(`Cleanup failed: ${name}`, { cause: error })); }
    };
    if (loggedIn) {
      await cleanup("own participants only", async () => {
        for (const p of (await participants()).filter((p) => p.username.startsWith(prefix))) {
          await cleanup(p.username, () => api(`${participantsPath}?username=${encodeURIComponent(p.username)}`, "DELETE"));
        }
      });
      if (originalSettings) await cleanup("restore settings", () => api(settingsPath, "PATCH", originalSettings));
    }
    await cleanup("close browser", () => browser.close());
    // Chromium reports the intentionally rejected duplicate as a resource console error.
    const unexpectedConsole = consoleErrors.filter(({ text, url }) => !(
      text === "Failed to load resource: the server responded with a status of 409 (Conflict)" &&
      url === `${origin}${participantsPath}`
    ));
    console.log(`Browser errors collected: ${pageErrors.length} pageerror/safety, ${consoleErrors.length} console.error (${unexpectedConsole.length} unexpected)`);
    if (pageErrors.length || unexpectedConsole.length) {
      failures.push(new Error(`Application/browser errors: ${JSON.stringify({ pageErrors, consoleErrors: unexpectedConsole }, null, 2)}`));
    }
  }
  if (failures.length) throw new AggregateError(failures, "Browser E2E failed");
  console.log("Browser E2E passed; own fixtures removed and settings restored");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
