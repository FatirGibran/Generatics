import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SEED_THEMES, SEED_PARTICIPANTS } from "./seed-data";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaWalConfigured: boolean | undefined;
};

function getDatabaseUrl(): string {
  // If remote database URL is configured (e.g. PostgreSQL, Supabase, Neon, Turso), always prioritize it
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")) {
    return process.env.DATABASE_URL;
  }

  // If running on Vercel Serverless environment with SQLite, use writable /tmp
  if (process.env.VERCEL) {
    const tmpDbPath = "/tmp/generatics.db";
    return `file:${tmpDbPath}`;
  }

  // Local development / persistent server (PM2, Docker, VPS)
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.startsWith("file:../data/")) {
      return `file:${path.join(process.cwd(), "data", "generatics.db")}`;
    }
    return process.env.DATABASE_URL;
  }
  return `file:${path.join(process.cwd(), "data", "generatics.db")}`;
}

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const INIT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Theme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "Motion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "themeId" TEXT NOT NULL,
    "motionText" TEXT NOT NULL,
    "maxUsage" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Motion_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL UNIQUE,
    "fullName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL UNIQUE,
    "sessionBatch" TEXT NOT NULL,
    "hasSpun" BOOLEAN NOT NULL DEFAULT false,
    "assignedMotionId" TEXT,
    "assignedStance" TEXT,
    "spunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_assignedMotionId_fkey" FOREIGN KEY ("assignedMotionId") REFERENCES "Motion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "isSpinOpen" BOOLEAN NOT NULL DEFAULT true,
    "randomMode" TEXT NOT NULL DEFAULT 'BALANCED',
    "prepDurationSeconds" INTEGER NOT NULL DEFAULT 300,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

let walInitPromise: Promise<void> | null = null;

/**
 * Configure SQLite WAL mode and busy timeout for concurrent safety.
 * Also self-heals by creating tables and seeding admin if database is newly initialized.
 */
export async function ensurePrismaWAL(): Promise<void> {
  if (globalForPrisma.prismaWalConfigured) return;
  if (walInitPromise) return walInitPromise;

  walInitPromise = (async () => {
    try {
      await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
      await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");

      // Self-healing check: verify if Admin table exists
      const adminCount = await prisma.admin.count().catch(async () => {
        // Tables don't exist yet, execute DDL schema creation
        const statements = INIT_SCHEMA_SQL.split(";");
        for (const st of statements) {
          const q = st.trim();
          if (q) await prisma.$executeRawUnsafe(q);
        }
        return 0;
      });

      if (adminCount === 0) {
        // Seed default admin
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "generatics2026";
        const hash = await bcrypt.hash(defaultPassword, 10);
        await prisma.admin.upsert({
          where: { username: "admin" },
          update: {},
          create: {
            id: "admin-default",
            username: "admin",
            passwordHash: hash,
          },
        });

        // Seed system settings
        await prisma.systemSetting.upsert({
          where: { id: 1 },
          update: {},
          create: {
            id: 1,
            isSpinOpen: true,
            randomMode: "BALANCED",
            prepDurationSeconds: 300,
          },
        });

        // Seed themes and motions from seed data
        for (const t of SEED_THEMES) {
          let theme = await prisma.theme.findFirst({ where: { name: t.name } });
          if (!theme) {
            theme = await prisma.theme.create({
              data: {
                name: t.name,
                description: t.description,
                isActive: true,
              },
            });
          }
          for (const m of t.motions) {
            const existingMotion = await prisma.motion.findFirst({
              where: { themeId: theme.id, motionText: m.motionText },
            });
            if (!existingMotion) {
              await prisma.motion.create({
                data: {
                  themeId: theme.id,
                  motionText: m.motionText,
                  maxUsage: m.maxUsage ?? 10,
                  usedCount: 0,
                  isActive: true,
                },
              });
            }
          }
        }

      }

      // Self-healing check: verify if Participant table has data
      const participantCount = await prisma.participant.count().catch(() => 0);
      if (participantCount === 0) {
        for (const p of SEED_PARTICIPANTS) {
          await prisma.participant.upsert({
            where: { username: p.username },
            update: {},
            create: {
              username: p.username,
              fullName: p.fullName,
              accessToken: p.accessToken,
              sessionBatch: p.sessionBatch,
              hasSpun: false,
            },
          }).catch(() => {});
        }
      }

      globalForPrisma.prismaWalConfigured = true;
    } catch (err) {
      console.error("Warning: Failed to set SQLite WAL/busy_timeout:", err);
    } finally {
      walInitPromise = null;
    }
  })();

  return walInitPromise;
}
