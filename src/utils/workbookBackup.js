/** EduAttend full-fidelity, shareable Excel backup (distinct from report XLSX). */
import XLSX from 'xlsx-js-style';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FORMAT = 'EduAttend CSV Database Backup';
const HEADERS = {
  Classes: ['id', 'name', 'teacher', 'start', 'end'],
  Students: ['id', 'name', 'reg', 'classId', 'gender', 'doa'],
  Attendance: ['date', 'classId', 'studentId', 'status'],
  'Edit History': ['date', 'classId', 'student', 'from', 'to', 'time'],
  Settings: ['key', 'value'],
};
function keyParts(k) {
  const i = k.lastIndexOf('_');
  return [k.slice(0, i), k.slice(i + 1)];
}
export function createBackupWorkbook(data) {
  const { classes = [], students = [], attendance = {}, editHistory = {}, settings = {} } = data;
  const wb = XLSX.utils.book_new();
  const rows = {
    Classes: classes.map(x => [x.id, x.name, x.teacher, x.start, x.end]),
    Students: students.map(x => [x.id, x.name, x.reg, x.classId ?? '', x.gender, x.doa]),
    Attendance: Object.entries(attendance).flatMap(([key, record]) =>
      Object.entries(record || {}).map(([studentId, status]) => [...keyParts(key), studentId, status])),
    'Edit History': Object.entries(editHistory).flatMap(([key, entries]) =>
      (entries || []).map(e => [...keyParts(key), e.student, e.from, e.to, e.time])),
    Settings: Object.entries(settings).map(([key, value]) => [key, value]),
  };
  const intro = XLSX.utils.aoa_to_sheet([
    ['EduAttend', FORMAT],
    ['Backup version', 1],
    ['Created on', new Date().toISOString()],
    ['Contents', 'Classes, Students, Attendance, Edit History, Settings'],
    ['Note', 'Restore this workbook via EduAttend Backup / Restore. Do not rename sheet headers.'],
  ]);
  intro['!cols'] = [{ wch: 22 }, { wch: 90 }];
  intro.A1.s = { font: { bold: true, sz: 17, color: { rgb: '0A7763' } } };
  XLSX.utils.book_append_sheet(wb, intro, 'Read Me');
  for (const [name, headers] of Object.entries(HEADERS)) {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows[name]]);
    ws['!cols'] = headers.map(h => ({ wch: h === 'name' || h === 'student' ? 28 : 19 }));
    headers.forEach((_, i) => {
      const c = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
      if (c) c.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '102E3A' } } };
    });
    ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}${Math.max(rows[name].length + 1, 2)}` };
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return wb;
}
function parseId(value, nullable = false) {
  if (nullable && (value === '' || value === null || value === undefined)) return null;
  if (value === '' || value === null || value === undefined || !Number.isSafeInteger(Number(value)) || Number(value) <= 0)
    throw new Error('Backup contains an invalid record ID.');
  return Number(value);
}
function str(x) { return x == null ? '' : String(x); }
export function parseBackupWorkbook(wb) {
  const meta = wb.Sheets['Read Me'];
  if (!meta || XLSX.utils.sheet_to_json(meta, { header: 1 })[0]?.[1] !== FORMAT)
    throw new Error('Not a recognized EduAttend XLSX backup. Export a fresh backup from EduAttend.');
  const sheets = {};
  for (const [name, headers] of Object.entries(HEADERS)) {
    if (!wb.Sheets[name]) throw new Error(`Backup is missing the ${name} worksheet.`);
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true, blankrows: false });
    if (headers.some((h, i) => raw[0]?.[i] !== h)) throw new Error(`Unexpected columns in ${name}.`);
    sheets[name] = raw.slice(1).filter(r => r.some(v => v !== '')).map(r => headers.map((_, i) => r[i] ?? ''));
  }
  const classes = sheets.Classes.map(r => ({
    id: parseId(r[0]), name: str(r[1]), teacher: str(r[2]), start: str(r[3]), end: str(r[4]),
  }));
  const students = sheets.Students.map(r => ({
    id: parseId(r[0]), name: str(r[1]), reg: str(r[2]), classId: parseId(r[3], true),
    gender: str(r[4]), doa: str(r[5]),
  }));
  if (new Set(classes.map(c => c.id)).size !== classes.length ||
      new Set(students.map(s => s.id)).size !== students.length)
    throw new Error('Backup contains duplicate class or student IDs.');
  const attendance = {};
  for (const [date, classId, studentId, status] of sheets.Attendance) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str(date)) || !['P', 'A', 'L'].includes(str(status)))
      throw new Error('Backup has an invalid attendance row.');
    const key = `${date}_${parseId(classId)}`;
    if (!attendance[key]) attendance[key] = {};
    attendance[key][parseId(studentId)] = str(status);
  }
  const editHistory = {};
  for (const [date, classId, student, from, to, time] of sheets['Edit History']) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str(date))) throw new Error('Invalid edit-history date.');
    const key = `${date}_${parseId(classId)}`;
    if (!editHistory[key]) editHistory[key] = [];
    editHistory[key].push({ student: str(student), from: str(from), to: str(to), time: str(time) });
  }
  const settings = Object.fromEntries(sheets.Settings.map(([key, value]) => [str(key), str(value)]));
  return { classes, students, attendance, editHistory, settings };
}
export async function exportBackupXLSX(classes, students, attendance, editHistory, settings) {
  const wb = createBackupWorkbook({ classes, students, attendance, editHistory, settings });
  const encoded = XLSX.write(wb, { type: 'base64', bookType: 'xlsx', compression: true });
  const path = `${FileSystem.documentDirectory}EduAttend_backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await FileSystem.writeAsStringAsync(path, encoded, { encoding: 'base64' });
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('Sharing is not available on this device. The backup is saved in the app Documents directory.');
  await Sharing.shareAsync(path, { mimeType: MIME, dialogTitle: 'Save EduAttend Excel Backup', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
  return path;
}
export function readBackupBase64(base64) {
  const wb = XLSX.read(base64, { type: 'base64', cellFormula: false });
  return parseBackupWorkbook(wb);
}
