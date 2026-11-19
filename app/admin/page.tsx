"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { soundManager } from "@/lib/audio";
import { Participant, Motion, Theme, SystemSetting } from "@/lib/types";
import AdminShell from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Modal, { ModalActions } from "@/components/admin/Modal";
import ToastStack from "@/components/admin/ToastStack";
import OverviewTab from "@/components/admin/OverviewTab";
import ParticipantsTab from "@/components/admin/ParticipantsTab";
import MotionsTab from "@/components/admin/MotionsTab";
import SettingsTab from "@/components/admin/SettingsTab";
import { StarLoader, focusRing, inputCls, labelCls } from "@/components/admin/ui";
import type { TabId, ToastItem, ToastType } from "@/components/admin/types";

type PendingConfirm =
  | { kind: "reset"; participant: Participant }
  | { kind: "deleteParticipant"; participant: Participant }
  | { kind: "deleteTheme"; theme: Theme }
  | { kind: "deleteMotion"; motion: Motion };

const TOAST_MS = 3500;

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminUser, setAdminUser] = useState<string | null>(null);

  // Live Data States
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [motions, setMotions] = useState<Motion[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [settings, setSettings] = useState<SystemSetting>({
    isSpinOpen: false,
    randomMode: "BALANCED",
    prepDurationSeconds: 300,
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);

  // Confirm dialog
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const lastPending = useRef<PendingConfirm | null>(null);
  if (pending) lastPending.current = pending;

  // Modals
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showAddTheme, setShowAddTheme] = useState(false);
  const [showAddMotion, setShowAddMotion] = useState(false);

  // Form inputs for participant
  const [newPartUsername, setNewPartUsername] = useState("");
  const [newPartName, setNewPartName] = useState("");
  const [newPartBatch, setNewPartBatch] = useState("Day 1");
  const [bulkCsvText, setBulkCsvText] = useState("");

  // Form inputs for theme
  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeDesc, setNewThemeDesc] = useState("");

  // Form inputs for motion
  const [newMotionThemeId, setNewMotionThemeId] = useState("");
  const [newMotionText, setNewMotionText] = useState("");
  const [newMotionMaxUsage, setNewMotionMaxUsage] = useState<string>("10");

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (text: string, type: ToastType = "success") => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev.slice(-2), { id, text, type }]);
      setTimeout(() => dismissToast(id), TOAST_MS);
    },
    [dismissToast]
  );

  // Auth verification
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me?role=admin", { cache: "no-store" });
        const data = await res.json();
        if (!data.authenticated || data.role !== "admin") {
          window.location.replace("/admin/login");
          return;
        }
        setAdminUser(data.username);
      } catch {
        window.location.replace("/admin/login");
      }
    }
    checkAuth();
  }, []);

  // Initial fetch for Settings & Themes
  const refreshData = useCallback(async () => {
    try {
      const ts = Date.now();
      const headers = { "Cache-Control": "no-cache, no-store" };
      const [setRes, thmRes, motRes, partRes, ovRes] = await Promise.all([
        fetch(`/api/admin/settings?_t=${ts}`, { cache: "no-store", headers }),
        fetch(`/api/admin/themes?_t=${ts}`, { cache: "no-store", headers }),
        fetch(`/api/admin/motions?_t=${ts}`, { cache: "no-store", headers }),
        fetch(`/api/admin/participants?_t=${ts}`, { cache: "no-store", headers }),
        fetch(`/api/admin/overview?_t=${ts}`, { cache: "no-store", headers }),
      ]);

      if (setRes.ok) {
        const sData = await setRes.json();
        if (sData.settings) setSettings(sData.settings);
      }
      if (thmRes.ok) {
        const tData = await thmRes.json();
        if (tData.themes) setThemes(tData.themes);
      }
      if (motRes.ok) {
        const mData = await motRes.json();
        if (mData.motions) setMotions(mData.motions);
      }
      if (ovRes.ok) {
        const ovData = await ovRes.json();
        if (Array.isArray(ovData.participants)) {
          setParticipants(ovData.participants);
        }
      } else if (partRes.ok) {
        const pData = await partRes.json();
        if (Array.isArray(pData.participants)) {
          setParticipants(pData.participants);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleManualRefresh = async () => {
    soundManager.playClick();
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Real-time polling every 4 seconds for production monitoring
  useEffect(() => {
    if (!adminUser) return;
    const timer = setInterval(() => {
      refreshData();
    }, 4000);
    return () => clearInterval(timer);
  }, [adminUser, refreshData]);

  // Handlers
  const handleToggleSpinAccess = async () => {
    soundManager.playClick();
    const nextState = !settings.isSpinOpen;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSpinOpen: nextState }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, isSpinOpen: nextState }));
        notify(`Akses spin berhasil di-${nextState ? "BUKA" : "TUTUP"}.`);
      } else {
        notify("Gagal mengubah akses spin.", "error");
      }
    } catch {
      notify("Gagal mengubah akses spin.", "error");
    }
  };

  const handleUpdateSettings = async (updates: Partial<SystemSetting>) => {
    soundManager.playClick();
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...updates }));
        notify("Pengaturan berhasil disimpan.");
      } else {
        notify("Gagal memperbarui pengaturan.", "error");
      }
    } catch {
      notify("Gagal memperbarui pengaturan.", "error");
    }
  };

  const handleResetParticipantSpin = async (username: string) => {
    soundManager.playClick();
    try {
      const res = await fetch("/api/admin/participants/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
        body: JSON.stringify({ username }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        notify(`Spin peserta ${username} berhasil di-reset.`);
        refreshData();
      } else {
        notify(d.error || "Gagal mereset spin.", "error");
      }
    } catch {
      notify("Gagal mereset status peserta.", "error");
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    try {
      const res = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newPartUsername.trim(),
          fullName: newPartName.trim(),
          sessionBatch: newPartBatch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      notify(`Peserta ${newPartName} berhasil ditambahkan! Token: ${data.participant?.accessToken}`);
      setNewPartUsername("");
      setNewPartName("");
      setShowAddParticipant(false);
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambah peserta.";
      notify(msg, "error");
    }
  };

  const handleBulkImportCsv = async () => {
    soundManager.playClick();
    if (!bulkCsvText.trim()) return;

    try {
      const lines = bulkCsvText.trim().split("\n");
      const list = [];
      for (const line of lines) {
        const parts = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
        if (parts.length >= 2 && parts[0] !== "username") {
          list.push({
            username: parts[0],
            fullName: parts[1],
            sessionBatch: parts[2] || "Day 1",
            accessToken: parts[3] || undefined,
          });
        }
      }

      if (list.length === 0) {
        notify("Format CSV tidak sesuai.", "error");
        return;
      }

      const res = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: list }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      notify(`Berhasil mengimpor ${data.count} peserta.`);
      setBulkCsvText("");
      setShowBulkImport(false);
      refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengimpor CSV.";
      notify(msg, "error");
    }
  };

  const handleDeleteParticipant = async (username: string) => {
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/participants?username=${encodeURIComponent(username)}`, {
        method: "DELETE",
        headers: { "Cache-Control": "no-cache" },
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        notify(`Peserta ${username} berhasil dihapus.`);
        refreshData();
      } else {
        notify(d.error || "Gagal menghapus peserta.", "error");
      }
    } catch {
      notify("Terjadi gangguan jaringan saat menghapus peserta.", "error");
    }
  };

  const handleAddTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    try {
      const res = await fetch("/api/admin/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newThemeName, description: newThemeDesc }),
      });
      if (res.ok) {
        notify(`Tema "${newThemeName}" berhasil dibuat.`);
        setNewThemeName("");
        setNewThemeDesc("");
        setShowAddTheme(false);
        refreshData();
      } else {
        notify("Gagal membuat tema.", "error");
      }
    } catch {
      notify("Gagal membuat tema.", "error");
    }
  };

  const handleDeleteTheme = async (id: string, name: string) => {
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/themes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        notify(`Tema "${name}" dihapus.`);
        refreshData();
      } else {
        notify("Gagal menghapus tema.", "error");
      }
    } catch {
      notify("Gagal menghapus tema.", "error");
    }
  };

  const handleAddMotion = async (e: React.FormEvent) => {
    e.preventDefault();
    soundManager.playClick();
    try {
      const selectedTheme = themes.find((t) => t.id === newMotionThemeId);
      const res = await fetch("/api/admin/motions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId: newMotionThemeId,
          themeName: selectedTheme?.name,
          motionText: newMotionText,
          maxUsage: newMotionMaxUsage ? Number(newMotionMaxUsage) : null,
        }),
      });
      if (res.ok) {
        notify("Mosi debat berhasil ditambahkan.");
        setNewMotionText("");
        setShowAddMotion(false);
        refreshData();
      } else {
        notify("Gagal menambahkan mosi.", "error");
      }
    } catch {
      notify("Gagal menambahkan mosi.", "error");
    }
  };

  const handleDeleteMotion = async (id: string) => {
    soundManager.playClick();
    try {
      const res = await fetch(`/api/admin/motions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        notify("Mosi berhasil dihapus.");
        refreshData();
      } else {
        notify("Gagal menghapus mosi.", "error");
      }
    } catch {
      notify("Gagal menghapus mosi.", "error");
    }
  };

  const handleLogout = async () => {
    soundManager.playClick();
    await fetch("/api/auth/logout?role=admin", { method: "POST" });
    router.replace("/admin/login");
  };

  const runConfirmed = () => {
    if (!pending) return;
    const action = pending;
    setPending(null);
    switch (action.kind) {
      case "reset":
        handleResetParticipantSpin(action.participant.username);
        break;
      case "deleteParticipant":
        handleDeleteParticipant(action.participant.username);
        break;
      case "deleteTheme":
        handleDeleteTheme(action.theme.id, action.theme.name);
        break;
      case "deleteMotion":
        handleDeleteMotion(action.motion.id);
        break;
    }
  };

  const confirmCopy = (() => {
    const p = pending ?? lastPending.current;
    if (!p) return { title: "", description: null as React.ReactNode, label: "" };
    switch (p.kind) {
      case "reset":
        return {
          title: `Reset spin ${p.participant.fullName}?`,
          description: (
            <>
              Hasil spin <strong>{p.participant.fullName}</strong> akan dihapus, status kembali Belum Spin, dan kuota
              mosi berkurang 1. Peserta bisa spin ulang.
            </>
          ),
          label: "Ya, Reset Spin",
        };
      case "deleteParticipant":
        return {
          title: `Hapus peserta ${p.participant.fullName}?`,
          description: (
            <>
              Akun <strong>{p.participant.fullName}</strong> ({p.participant.username}) beserta tokennya akan dihapus
              permanen dan tidak bisa masuk lagi. Tindakan ini tidak bisa dibatalkan.
            </>
          ),
          label: "Ya, Hapus Peserta",
        };
      case "deleteTheme":
        return {
          title: `Hapus tema "${p.theme.name}"?`,
          description: (
            <>
              Tema <strong>{p.theme.name}</strong> dan seluruh mosi di dalamnya akan dihapus permanen. Tindakan ini
              tidak bisa dibatalkan.
            </>
          ),
          label: "Ya, Hapus Tema",
        };
      case "deleteMotion":
        return {
          title: "Hapus butir mosi ini?",
          description: (
            <>
              Mosi &ldquo;{p.motion.motionText}&rdquo; akan dihapus permanen dari bank mosi dan tidak akan diundi lagi.
            </>
          ),
          label: "Ya, Hapus Mosi",
        };
    }
  })();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center">
        <StarLoader label="Memuat panel panitia…" />
      </div>
    );
  }

  const counts: Partial<Record<TabId, number>> = {
    overview: participants.filter((p) => p.hasSpun).length,
    motions: motions.length,
    participants: participants.length,
  };

  return (
    <>
      <AdminShell
        tab={activeTab}
        onTab={setActiveTab}
        counts={counts}
        isSpinOpen={settings.isSpinOpen}
        onToggleSpin={handleToggleSpinAccess}
        adminUser={adminUser}
        onLogout={handleLogout}
      >
        {activeTab === "overview" && (
          <OverviewTab
            participants={participants}
            refreshing={refreshing}
            onRefresh={handleManualRefresh}
            onRequestReset={(p) => setPending({ kind: "reset", participant: p })}
          />
        )}
        {activeTab === "motions" && (
          <MotionsTab
            themes={themes}
            motions={motions}
            onAddTheme={() => setShowAddTheme(true)}
            onAddMotion={() => setShowAddMotion(true)}
            onRequestDeleteTheme={(theme) => setPending({ kind: "deleteTheme", theme })}
            onRequestDeleteMotion={(motion) => setPending({ kind: "deleteMotion", motion })}
          />
        )}
        {activeTab === "participants" && (
          <ParticipantsTab
            participants={participants}
            onAdd={() => setShowAddParticipant(true)}
            onBulk={() => setShowBulkImport(true)}
            onRequestReset={(p) => setPending({ kind: "reset", participant: p })}
            onRequestDelete={(p) => setPending({ kind: "deleteParticipant", participant: p })}
            notify={notify}
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab settings={settings} onToggleSpin={handleToggleSpinAccess} onUpdate={handleUpdateSettings} />
        )}
      </AdminShell>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <ConfirmDialog
        open={pending !== null}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.label}
        onConfirm={runConfirmed}
        onClose={() => setPending(null)}
      />

      {/* ===== MODAL: TAMBAH PESERTA ===== */}
      <Modal
        open={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
        title="Tambah Peserta"
        description="Token akses dibuat otomatis oleh sistem (format STR-XXXX)."
      >
        <form onSubmit={handleAddParticipant} className="space-y-4">
          <div>
            <label htmlFor="new-part-username" className={labelCls}>
              NIM / Username
            </label>
            <input
              id="new-part-username"
              type="text"
              required
              inputMode="numeric"
              placeholder="Contoh: 103012600006"
              value={newPartUsername}
              onChange={(e) => setNewPartUsername(e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="new-part-name" className={labelCls}>
              Nama Lengkap
            </label>
            <input
              id="new-part-name"
              type="text"
              required
              placeholder="Nama peserta"
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="new-part-batch" className={labelCls}>
              Sesi Pelaksanaan
            </label>
            <select
              id="new-part-batch"
              value={newPartBatch}
              onChange={(e) => setNewPartBatch(e.target.value)}
              className={inputCls}
            >
              <option value="Day 1">Day 1 (Hari Pertama)</option>
              <option value="Day 2">Day 2 (Hari Kedua)</option>
            </select>
          </div>
          <ModalActions>
            <button
              type="button"
              onClick={() => setShowAddParticipant(false)}
              className={`btn-ghost-night min-h-[44px] rounded-xl px-5 text-sm font-bold ${focusRing}`}
            >
              Batal
            </button>
            <button type="submit" className={`btn-gold min-h-[44px] rounded-xl px-5 text-sm font-black ${focusRing}`}>
              Simpan Peserta
            </button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== MODAL: BULK CSV IMPORT ===== */}
      <Modal
        open={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        title="Import Massal Peserta"
        maxWidth="max-w-lg"
        description={
          <>
            Tempel CSV dengan format <code className="font-mono text-[#FACC15]">username,full_name,session_batch</code>.
            Token dibuat otomatis jika dikosongkan.
          </>
        }
      >
        <label htmlFor="bulk-csv" className={labelCls}>
          Data CSV
        </label>
        <textarea
          id="bulk-csv"
          rows={8}
          value={bulkCsvText}
          onChange={(e) => setBulkCsvText(e.target.value)}
          placeholder={`103012600007,Fajar Ramadhan,Day 1\n103012600008,Gita Permata,Day 1\n103012600009,Hadi Pratama,Day 2`}
          className="field-night w-full rounded-xl p-3 font-mono text-xs"
        />
        <ModalActions>
          <button
            type="button"
            onClick={() => setShowBulkImport(false)}
            className={`btn-ghost-night min-h-[44px] rounded-xl px-5 text-sm font-bold ${focusRing}`}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleBulkImportCsv}
            className={`btn-gold min-h-[44px] rounded-xl px-5 text-sm font-black ${focusRing}`}
          >
            Proses Import
          </button>
        </ModalActions>
      </Modal>

      {/* ===== MODAL: TAMBAH TEMA ===== */}
      <Modal open={showAddTheme} onClose={() => setShowAddTheme(false)} title="Tambah Tema Debat">
        <form onSubmit={handleAddTheme} className="space-y-4">
          <div>
            <label htmlFor="new-theme-name" className={labelCls}>
              Nama Tema
            </label>
            <input
              id="new-theme-name"
              type="text"
              required
              placeholder="Contoh: Teknologi & Kecerdasan Buatan"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="new-theme-desc" className={labelCls}>
              Deskripsi Singkat
            </label>
            <textarea
              id="new-theme-desc"
              rows={3}
              placeholder="Ruang lingkup tema..."
              value={newThemeDesc}
              onChange={(e) => setNewThemeDesc(e.target.value)}
              className="field-night w-full rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>
          <ModalActions>
            <button
              type="button"
              onClick={() => setShowAddTheme(false)}
              className={`btn-ghost-night min-h-[44px] rounded-xl px-5 text-sm font-bold ${focusRing}`}
            >
              Batal
            </button>
            <button type="submit" className={`btn-gold min-h-[44px] rounded-xl px-5 text-sm font-black ${focusRing}`}>
              Simpan Tema
            </button>
          </ModalActions>
        </form>
      </Modal>

      {/* ===== MODAL: TAMBAH MOSI ===== */}
      <Modal open={showAddMotion} onClose={() => setShowAddMotion(false)} title="Tambah Butir Mosi">
        <form onSubmit={handleAddMotion} className="space-y-4">
          <div>
            <label htmlFor="new-motion-theme" className={labelCls}>
              Kategori Tema
            </label>
            <select
              id="new-motion-theme"
              required
              value={newMotionThemeId}
              onChange={(e) => setNewMotionThemeId(e.target.value)}
              className={inputCls}
            >
              <option value="">-- Pilih Tema --</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-motion-text" className={labelCls}>
              Teks Rumusan Mosi
            </label>
            <textarea
              id="new-motion-text"
              rows={4}
              required
              placeholder="Dewan ini percaya bahwa..."
              value={newMotionText}
              onChange={(e) => setNewMotionText(e.target.value)}
              className="field-night w-full rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="new-motion-quota" className={labelCls}>
              Batas Kemunculan (Kuota)
            </label>
            <input
              id="new-motion-quota"
              type="number"
              min={1}
              placeholder="Kosongkan jika tanpa batas"
              value={newMotionMaxUsage}
              onChange={(e) => setNewMotionMaxUsage(e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </div>
          <ModalActions>
            <button
              type="button"
              onClick={() => setShowAddMotion(false)}
              className={`btn-ghost-night min-h-[44px] rounded-xl px-5 text-sm font-bold ${focusRing}`}
            >
              Batal
            </button>
            <button type="submit" className={`btn-gold min-h-[44px] rounded-xl px-5 text-sm font-black ${focusRing}`}>
              Simpan Mosi
            </button>
          </ModalActions>
        </form>
      </Modal>
    </>
  );
}
