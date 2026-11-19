import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const THEMES_AND_MOTIONS = [
  {
    name: "Teknologi & Kecerdasan Buatan",
    description: "Isu etika digital, kecerdasan buatan, privasi data, dan otomatisasi algoritma.",
    motions: [
      "Dewan ini percaya bahwa penggunaan Generative AI dalam pengerjaan tugas pemrograman dasar mahasiswa tahun pertama lebih banyak menghambat kemampuan berpikir logis daripada membantu proses belajar.",
      "Dewan ini mewajibkan seluruh platform media sosial menerapkan verifikasi identitas asli (real-name policy) untuk menekan penyebaran disinformasi dan perundungan siber.",
      "Dewan ini percaya bahwa pengembangan sistem pengawasan berbasis pengenalan wajah (facial recognition) di ruang publik harus dihentikan demi melindungi privasi warga negara.",
    ],
  },
  {
    name: "Pendidikan Tinggi & Dunia Kampus",
    description: "Transformasi pedagogi teknologi, kurikulum kolaboratif, dan aktivitas kemahasiswaan.",
    motions: [
      "Dewan ini percaya bahwa sistem penilaian berbasis proyek kolaboratif (project-based assessment) sepenuhnya harus menggantikan ujian tulis konvensional di program studi berbasis teknologi.",
      "Dewan ini mewajibkan mahasiswa tahun pertama untuk aktif minimal di satu organisasi atau kepanitiaan kampus sebagai syarat kelulusan mata kuliah pengembangan karakter.",
      "Dewan ini percaya bahwa kebijakan kuliah hibrida (hybrid learning) secara permanen meningkatkan kualitas dan aksesibilitas pendidikan tinggi di Indonesia.",
    ],
  },
  {
    name: "Karier Digital & Masa Depan Pekerjaan",
    description: "Dinamika industri kerja teknologi, sertifikasi kompetensi, dan keseimbangan kerja.",
    motions: [
      "Dewan ini percaya bahwa portofolio proyek nyata dan sertifikasi keahlian industri akan membuat gelar sarjana menjadi tidak lagi relevan dalam perekrutan talenta teknologi di masa depan.",
      "Dewan ini mendukung penerapan aturan Right to Disconnect (hak karyawan untuk tidak merespons komunikasi kerja di luar jam kantor) secara ketat di perusahaan rintisan (startup) teknologi.",
    ],
  },
  {
    name: "Sosial, Lingkungan & Kebijakan Publik",
    description: "Keberlanjutan ekologi komputasi, kesehatan mental remaja, dan regulasi digital publik.",
    motions: [
      "Dewan ini percaya bahwa pemerintah harus memberikan insentif pajak besar bagi perusahaan teknologi yang menggunakan pusat data (data center) berbasis energi terbarukan meskipun berdampak pada kenaikan biaya layanan digital.",
      "Dewan ini percaya bahwa pembatasan waktu layar (screen time) secara regulatif oleh negara bagi remaja di bawah usia 16 tahun adalah langkah yang dibenarkan untuk menjaga kesehatan mental generasi muda.",
    ],
  },
];

async function main() {
  console.log("Seeding SQLite database for Generatics 2026...");

  // WAL Pragmas
  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");

  // 1. Seed Admin
  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
  const rawAdminPass = process.env.DEFAULT_ADMIN_PASSWORD || "generatics2026";
  const passwordHash = await bcrypt.hash(rawAdminPass, 10);

  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: { passwordHash },
    create: {
      username: adminUsername,
      passwordHash,
    },
  });
  console.log(`Admin user '${adminUsername}' ready.`);

  // 2. Seed SystemSetting
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      isSpinOpen: false,
      randomMode: "BALANCED",
      prepDurationSeconds: 300,
    },
  });
  console.log("System settings configured.");

  // 3. Seed Themes and Motions
  for (const item of THEMES_AND_MOTIONS) {
    let theme = await prisma.theme.findFirst({
      where: { name: item.name },
    });

    if (!theme) {
      theme = await prisma.theme.create({
        data: {
          name: item.name,
          description: item.description,
          isActive: true,
        },
      });
    }

    for (const motionText of item.motions) {
      const existingMotion = await prisma.motion.findFirst({
        where: { themeId: theme.id, motionText },
      });

      if (!existingMotion) {
        await prisma.motion.create({
          data: {
            themeId: theme.id,
            motionText,
            maxUsage: 10,
            usedCount: 0,
            isActive: true,
          },
        });
      }
    }
  }

  console.log("Themes and motions seeded successfully (without dummy participants).");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
