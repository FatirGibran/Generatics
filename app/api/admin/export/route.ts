import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAdminSession } from "@/lib/auth";
import { prisma, ensurePrismaWAL } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await ensurePrismaWAL();
    const session = await getAdminSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";

    const participants = await prisma.participant.findMany({
      include: {
        assignedMotion: {
          include: { theme: true },
        },
      },
      orderBy: [{ sessionBatch: "asc" }, { username: "asc" }],
    });

    const rows = participants.map((p, index) => {
      const spunAtFormatted = p.spunAt
        ? p.spunAt.toLocaleString("id-ID")
        : "-";

      return {
        No: index + 1,
        "NIM / Username": p.username,
        "Nama Lengkap": p.fullName || "-",
        "Token Akses": p.accessToken || "-",
        "Sesi Debat": p.sessionBatch || "-",
        "Status Spin": p.hasSpun ? "SUDAH SPIN" : "BELUM SPIN",
        "Posisi Debat": p.assignedStance || "-",
        "Kategori Tema": p.assignedMotion?.theme?.name || "-",
        "Teks Mosi": p.assignedMotion?.motionText || "-",
        "Waktu Spin": spunAtFormatted,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hasil Spin Debat");

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="rekap_spin_generatics_2026_${Date.now()}.csv"`,
        },
      });
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rekap_spin_generatics_2026_${Date.now()}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengekspor laporan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
