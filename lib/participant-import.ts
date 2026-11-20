import * as XLSX from "xlsx";

export const MAX_PARTICIPANTS = 500;

export interface ParticipantInput {
  username: string;
  fullName: string;
  sessionBatch: "Day 1" | "Day 2";
  accessToken?: string;
}

export class ParticipantInputError extends Error {
  constructor(message: string, public status = 400, public row?: number) {
    super(row === undefined ? message : `Baris ${row}: ${message}`);
    this.name = "ParticipantInputError";
  }
}

export function validateParticipant(input: unknown, editing = false): ParticipantInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ParticipantInputError("Data peserta harus berupa objek.");
  }
  const { username, fullName, sessionBatch, accessToken } = input as Record<string, unknown>;
  if (typeof username !== "string" || !username.trim()) {
    throw new ParticipantInputError("Username/NIM wajib berupa teks dan tidak boleh kosong.");
  }
  if (typeof fullName !== "string" || !fullName.trim()) {
    throw new ParticipantInputError("Nama lengkap wajib berupa teks dan tidak boleh kosong.");
  }
  const batch = sessionBatch === undefined && !editing ? "Day 1" : sessionBatch;
  if (typeof batch !== "string" || !["Day 1", "Day 2"].includes(batch.trim())) {
    throw new ParticipantInputError("Sesi wajib Day 1 atau Day 2.");
  }
  if (accessToken !== undefined && typeof accessToken !== "string") {
    throw new ParticipantInputError("Token wajib berupa teks.");
  }
  const token = typeof accessToken === "string" ? accessToken.trim().toUpperCase() : undefined;
  if (editing && !token) throw new ParticipantInputError("Token wajib diisi.");
  return {
    username: username.trim(),
    fullName: fullName.trim(),
    sessionBatch: batch.trim() as ParticipantInput["sessionBatch"],
    ...(token ? { accessToken: token } : {}),
  };
}

export function validateParticipantBatch(input: unknown): ParticipantInput[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_PARTICIPANTS) {
    throw new ParticipantInputError(`Import wajib berisi 1–${MAX_PARTICIPANTS} peserta.`);
  }
  const usernames = new Set<string>();
  const tokens = new Set<string>();
  return input.map((item, index) => {
    try {
      const participant = validateParticipant(item);
      if (usernames.has(participant.username)) {
        throw new ParticipantInputError(`Username/NIM ${participant.username} duplikat dalam import.`, 409);
      }
      if (participant.accessToken && tokens.has(participant.accessToken)) {
        throw new ParticipantInputError(`Token ${participant.accessToken} duplikat dalam import.`, 409);
      }
      usernames.add(participant.username);
      if (participant.accessToken) tokens.add(participant.accessToken);
      return participant;
    } catch (error) {
      if (error instanceof ParticipantInputError) {
        throw new ParticipantInputError(error.message, error.status, index + 1);
      }
      throw error;
    }
  });
}

const headerAliases: Record<string, keyof ParticipantInput> = {
  username: "username", nim: "username", "username/nim": "username",
  fullname: "fullName", name: "fullName", nama: "fullName", namalengkap: "fullName",
  sessionbatch: "sessionBatch", batch: "sessionBatch", sesi: "sessionBatch",
  accesstoken: "accessToken", token: "accessToken",
};

const isBlank = (value: unknown) => value == null || (typeof value === "string" && !value.trim());

export function parseParticipantRows(rows: unknown[][]): ParticipantInput[] {
  const first = rows.findIndex((row) => row.some((cell) => !isBlank(cell)));
  if (first === -1) throw new ParticipantInputError("File tidak berisi peserta.");
  const headers = rows[first].map((cell) => typeof cell === "string"
    ? headerAliases[cell.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_-]/g, "")]
    : undefined);
  const hasHeader = headers.includes("username") || headers.filter(Boolean).length >= 2;
  const columns: (keyof ParticipantInput | undefined)[] = hasHeader
    ? headers : ["username", "fullName", "sessionBatch", "accessToken"];
  if (hasHeader && (!columns.includes("username") || !columns.includes("fullName"))) {
    throw new ParticipantInputError("Header wajib memuat username/NIM dan full_name/nama lengkap.", 400, first + 1);
  }
  if (hasHeader && new Set(columns.filter(Boolean)).size !== columns.filter(Boolean).length) {
    throw new ParticipantInputError("Header kolom peserta duplikat.", 400, first + 1);
  }
  const participants: ParticipantInput[] = [];
  const sourceRows: number[] = [];
  for (let index = first + (hasHeader ? 1 : 0); index < rows.length; index++) {
    const row = rows[index];
    if (row.every(isBlank)) continue;
    if (participants.length === MAX_PARTICIPANTS) {
      throw new ParticipantInputError(`Maksimal ${MAX_PARTICIPANTS} peserta per import.`, 400, index + 1);
    }
    const item: Record<string, unknown> = {};
    row.forEach((value, column) => {
      const field = columns[column];
      if (!field) {
        if (!hasHeader && !isBlank(value)) {
          throw new ParticipantInputError("Terlalu banyak kolom peserta.", 400, index + 1);
        }
        return;
      }
      // Excel numeric NIMs become strings; leading zeroes require text or a formatted cell.
      item[field] = field === "username" && typeof value === "number" && Number.isFinite(value)
        ? String(value) : value;
      if ((field === "sessionBatch" || field === "accessToken") && isBlank(value)) delete item[field];
    });
    try {
      participants.push(validateParticipant(item));
      sourceRows.push(index + 1);
    } catch (error) {
      if (error instanceof ParticipantInputError) throw new ParticipantInputError(error.message, error.status, index + 1);
      throw error;
    }
  }
  try {
    return validateParticipantBatch(participants);
  } catch (error) {
    if (error instanceof ParticipantInputError && error.row !== undefined) {
      throw new ParticipantInputError(error.message.replace(/^Baris \d+: /, ""), error.status, sourceRows[error.row - 1]);
    }
    throw error;
  }
}

export function parseParticipantCsv(text: string): ParticipantInput[] {
  const workbook = XLSX.read(text.replace(/^\uFEFF/, ""), { type: "string", raw: true, FS: "," });
  return parseParticipantRows(XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1, raw: true, defval: "", blankrows: true,
  }));
}

export function parseParticipantXlsx(data: ArrayBuffer): ParticipantInput[] {
  const workbook = XLSX.read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new ParticipantInputError("File tidak memiliki lembar kerja.");
  return parseParticipantRows(XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1, raw: false, defval: "", blankrows: true,
  }));
}
