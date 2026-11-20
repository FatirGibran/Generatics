// Run: node --import tsx scripts/participant-test.ts — no server or database required.
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import {
  MAX_PARTICIPANTS,
  ParticipantInputError,
  parseParticipantCsv,
  parseParticipantRows,
  parseParticipantXlsx,
  validateParticipant,
  validateParticipantBatch,
} from "../lib/participant-import";

const valid = { username: "00123", fullName: "Nama Peserta", sessionBatch: "Day 1" };
function rejects(fn: () => unknown, message: RegExp, status = 400, row?: number) {
  assert.throws(fn, (error: unknown) => {
    assert(error instanceof ParticipantInputError);
    assert.equal(error.status, status);
    assert.match(error.message, message);
    if (row !== undefined) assert.equal(error.row, row);
    return true;
  });
}

assert.deepEqual(validateParticipant({ username: " 00123 ", fullName: " Nama Peserta ", accessToken: " str-abcd " }), {
  ...valid, accessToken: "STR-ABCD",
});
assert.deepEqual(validateParticipant({ ...valid, sessionBatch: " Day 2 ", accessToken: " " }), {
  ...valid, sessionBatch: "Day 2",
});
for (const input of [null, [], "text", 42]) rejects(() => validateParticipant(input), /objek/);
for (const username of [undefined, null, 123, true, {}, [], "", " \t "]) {
  rejects(() => validateParticipant({ ...valid, username }), /Username\/NIM/);
}
for (const fullName of [undefined, null, 123, true, {}, [], "", " \t "]) {
  rejects(() => validateParticipant({ ...valid, fullName }), /Nama lengkap/);
}
for (const sessionBatch of [null, 1, {}, [], "", "day 1", "Day 3"]) {
  rejects(() => validateParticipant({ ...valid, sessionBatch }), /Day 1 atau Day 2/);
}
for (const accessToken of [null, 123, true, {}, []]) {
  rejects(() => validateParticipant({ ...valid, accessToken }), /Token/);
}
rejects(() => validateParticipant(valid, true), /Token/);
rejects(() => validateParticipant({ ...valid, accessToken: " " }, true), /Token/);
rejects(() => validateParticipant({ ...valid, sessionBatch: undefined, accessToken: "ABC" }, true), /Sesi/);
assert.deepEqual(validateParticipant({ ...valid, accessToken: " abc " }, true), { ...valid, accessToken: "ABC" });
for (const input of [null, {}, [], Array(MAX_PARTICIPANTS + 1).fill(valid)]) {
  rejects(() => validateParticipantBatch(input), /1–500/);
}
const fiveHundred = Array.from({ length: 500 }, (_, i) => ({ ...valid, username: `00${i}` }));
assert.equal(validateParticipantBatch(fiveHundred).length, 500);
rejects(() => validateParticipantBatch([valid, { ...valid, username: " 00123 " }]), /Username\/NIM.*duplikat/, 409, 2);
rejects(() => validateParticipantBatch([
  { ...valid, accessToken: "abc" }, { ...valid, username: "other", accessToken: " ABC " },
]), /Token.*duplikat/, 409, 2);
rejects(() => validateParticipantBatch([valid, { ...valid, fullName: " " }]), /Nama lengkap/, 400, 2);

assert.deepEqual(parseParticipantCsv('\uFEFFusername,full_name,session_batch,accessToken\r\n00123,"Nama, \"\"Peserta\"\"",Day 2, str-abcd \r\n'), [
  { username: "00123", fullName: 'Nama, "Peserta"', sessionBatch: "Day 2", accessToken: "STR-ABCD" },
]);
assert.deepEqual(parseParticipantCsv('00123,"Nama\nPeserta",,\n'), [{ ...valid, fullName: "Nama\nPeserta" }]);
assert.deepEqual(parseParticipantCsv("username,fullName\n12345678901234567890,Nama Peserta"), [
  { ...valid, username: "12345678901234567890" },
]);
assert.deepEqual(parseParticipantRows([
  [], [" Token ", "NIM", "Nama Lengkap", "Batch"], [" abc ", "00123", " Nama Peserta ", "Day 1"], [],
]), [{ ...valid, accessToken: "ABC" }]);
assert.deepEqual(parseParticipantRows([[123, "Nama Peserta"]]), [{ ...valid, username: "123" }]);
rejects(() => parseParticipantRows([]), /tidak berisi/);
rejects(() => parseParticipantCsv("username,full_name"), /1–500/);
rejects(() => parseParticipantRows([["username", "token"], ["001", "ABC"]]), /Header wajib/, 400, 1);
rejects(() => parseParticipantRows([["username", "nim", "fullName"]]), /Header.*duplikat/, 400, 1);
rejects(() => parseParticipantCsv("username,full_name\n00123,Nama\n00456,  "), /Nama lengkap/, 400, 3);
rejects(() => parseParticipantCsv("username,full_name\n00123,Nama\n\n00123,Lain"), /duplikat/, 409, 4);
rejects(() => parseParticipantRows([["00123", "Nama", "Day 3"]]), /Sesi/, 400, 1);
rejects(() => parseParticipantRows([["00123", "Nama", "Day 1", "ABC", "extra"]]), /Terlalu banyak kolom/, 400, 1);
rejects(() => parseParticipantRows([["00123", true]]), /Nama lengkap/, 400, 1);
rejects(() => parseParticipantRows(Array.from({ length: 501 }, (_, i) => [String(i), "Nama"])), /500/, 400, 501);
assert.equal(parseParticipantRows(fiveHundred.map((p) => [p.username, p.fullName])).length, 500);

const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([["username", "full_name", "session_batch"], [123, "Nama Peserta", "Day 2"]]);
sheet.A2.z = "00000";
XLSX.utils.book_append_sheet(workbook, sheet, "Peserta");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["ignored"]]), "Diabaikan");
assert.deepEqual(parseParticipantXlsx(XLSX.write(workbook, { type: "array", bookType: "xlsx" })), [
  { ...valid, sessionBatch: "Day 2" },
]);
console.log("Participant parser and validation assertions passed (no database).");
