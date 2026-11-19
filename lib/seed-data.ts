export interface SeedTheme {
  name: string;
  description: string;
  motions: {
    motionText: string;
    maxUsage: number;
  }[];
}

export const SEED_THEMES: SeedTheme[] = [
  {
    name: "Teknologi & Kecerdasan Buatan",
    description: "Isu etika digital, kecerdasan buatan, privasi data, dan otomatisasi algoritma.",
    motions: [
      {
        motionText: "Dewan ini percaya bahwa penggunaan Generative AI dalam pengerjaan tugas pemrograman dasar mahasiswa tahun pertama lebih banyak menghambat kemampuan berpikir logis daripada membantu proses belajar.",
        maxUsage: 10,
      },
      {
        motionText: "Dewan ini mewajibkan seluruh platform media sosial menerapkan verifikasi identitas asli (real-name policy) untuk menekan penyebaran disinformasi dan perundungan siber.",
        maxUsage: 10,
      },
      {
        motionText: "Dewan ini percaya bahwa pengembangan sistem pengawasan berbasis pengenalan wajah (facial recognition) di ruang publik harus dihentikan demi melindungi privasi warga negara.",
        maxUsage: 10,
      },
    ],
  },
  {
    name: "Pendidikan Tinggi & Dunia Kampus",
    description: "Transformasi pedagogi teknologi, kurikulum kolaboratif, dan aktivitas kemahasiswaan.",
    motions: [
      {
        motionText: "Dewan ini percaya bahwa sistem penilaian berbasis proyek kolaboratif (project-based assessment) sepenuhnya harus menggantikan ujian tulis konvensional di program studi berbasis teknologi.",
        maxUsage: 10,
      },
      {
        motionText: "Dewan ini mewajibkan mahasiswa tahun pertama untuk aktif minimal di satu organisasi atau kepanitiaan kampus sebagai syarat kelulusan mata kuliah pengembangan karakter.",
        maxUsage: 10,
      },
      {
        motionText: "Dewan ini percaya bahwa kebijakan kuliah hibrida (hybrid learning) secara permanen meningkatkan kualitas dan aksesibilitas pendidikan tinggi di Indonesia.",
        maxUsage: 10,
      },
    ],
  },
  {
    name: "Karier Digital & Masa Depan Pekerjaan",
    description: "Dinamika industri kerja teknologi, sertifikasi kompetensi, dan keseimbangan kerja.",
    motions: [
      {
        motionText: "Dewan ini percaya bahwa portofolio proyek nyata dan sertifikasi keahlian industri akan membuat gelar sarjana menjadi tidak lagi relevan dalam perekrutan talenta teknologi di masa depan.",
        maxUsage: 10,
      },
      {
        motionText: "Dewan ini mendukung penerapan aturan Right to Disconnect (hak karyawan untuk tidak merespons komunikasi kerja di luar jam kantor) secara ketat di perusahaan rintisan (startup) teknologi.",
        maxUsage: 10,
      },
    ],
  },
  {
    name: "Sosial, Lingkungan & Kebijakan Publik",
    description: "Keberlanjutan ekologi komputasi, kesehatan mental remaja, dan regulasi digital publik.",
    motions: [
      {
        motionText: "Dewan ini percaya bahwa pemerintah harus memberikan insentif pajak besar bagi perusahaan teknologi yang menggunakan pusat data (data center) berbasis energi terbarukan meskipun berdampak pada kenaikan biaya layanan digital.",
        maxUsage: 10,
      },
      {
        motionText: "Dewan ini percaya bahwa pembatasan waktu layar (screen time) secara regulatif oleh negara bagi remaja di bawah usia 16 tahun adalah langkah yang dibenarkan untuk menjaga kesehatan mental generasi muda.",
        maxUsage: 10,
      },
    ],
  },
];

export const SEED_PARTICIPANTS = [
  {
    username: "103112430153",
    fullName: "Fatir Gibran",
    accessToken: "STR-PCE9",
    sessionBatch: "Day 1",
  },
  {
    username: "103112400101",
    fullName: "Aedil Gntgbgt",
    accessToken: "STR-73ZL",
    sessionBatch: "Day 1",
  },
  {
    username: "103012600001",
    fullName: "Alya Putri Ramadhani",
    accessToken: "STR-492A",
    sessionBatch: "Day 1",
  },
  {
    username: "103012600002",
    fullName: "Bima Sakti Nugraha",
    accessToken: "STR-718B",
    sessionBatch: "Day 1",
  },
  {
    username: "103012600003",
    fullName: "Citra Kirana Dewi",
    accessToken: "STR-230C",
    sessionBatch: "Day 2",
  },
  {
    username: "103012600004",
    fullName: "Dimas Arya Pratama",
    accessToken: "STR-894D",
    sessionBatch: "Day 2",
  },
  {
    username: "103012600005",
    fullName: "Eka Zahra Maulida",
    accessToken: "STR-561E",
    sessionBatch: "Day 1",
  },
];
