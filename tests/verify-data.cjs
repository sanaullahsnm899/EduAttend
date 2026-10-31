/** Run with plain Node 18+ (no native Expo app required): node tests/verify-data.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadSource(file, mocks, exposed) {
  let src = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8')
    .replace(/^import .*;\s*$/gm, '')
    .replace(/\bexport (?=(const|function|async function)\b)/g, '');
  src += `\nmodule.exports = { ${exposed.join(', ')} };`;
  const context = { ...mocks, module: { exports: {} }, console, Date, String, Number, Object, Promise, Set, Map, Error };
  vm.runInNewContext(src, context, { filename: file });
  return context.module.exports;
}

(async function run() {
  const data = new Map();
  const documents = 'file:///demo/';
  const fakeFS = {
    documentDirectory: documents,
    makeDirectoryAsync: async () => {},
    getInfoAsync: async uri => ({ exists: data.has(uri) }),
    writeAsStringAsync: async (uri, value) => { data.set(uri, value); },
    readAsStringAsync: async uri => {
      if (!data.has(uri)) throw new Error('No file');
      return data.get(uri);
    },
    moveAsync: async ({from,to}) => {
      if (!data.has(from) || data.has(to)) throw new Error('Cannot move');
      data.set(to, data.get(from)); data.delete(from);
    },
    deleteAsync: async uri => { data.delete(uri); },
  };
  const legacy = new Map();
  const fakeStorage = {
    getItem: async k => legacy.has(k) ? legacy.get(k) : null,
    multiRemove: async keys => keys.forEach(k => legacy.delete(k)),
  };
  const db = loadSource('src/utils/csvDatabase.js', {
    FileSystem: fakeFS, AsyncStorage: fakeStorage,
  }, ['DB_ROOT', 'encodeCsv', 'decodeCsv', 'saveData', 'loadData', 'clearData', 'saveAllData']);
  const trickyRows = [
    ['12', 'A, B', 'Sana "Dr"', 'a\r\nb', '🪴'],
    ['13', '=SUM(1,2)', '', '', ''],
  ];
  const csv = db.encodeCsv(['id','name','teacher','start','end'], trickyRows);
  assert.deepEqual(JSON.parse(JSON.stringify(db.decodeCsv(csv))), [['id','name','teacher','start','end'], ...trickyRows]);
  assert.throws(() => db.decodeCsv('a,"unterminated'), /Incomplete/);

  const CLASSES = 'eduattend_classes';
  const STUDENTS = 'eduattend_students';
  const ATT = 'eduattend_attendance';
  const EDIT = 'eduattend_edit_history';
  const SETTINGS = 'eduattend_settings';
  const cls = [{ id: 12345, name: 'S.E, 6th "B"', teacher: 'Maryam', start: '2026-09-01', end: '2027-01-01' }];
  legacy.set(CLASSES, JSON.stringify(cls));
  legacy.set(SETTINGS, JSON.stringify({ schoolName: 'University, Campus' }));
  const migrated = await db.loadData(CLASSES);
  assert.deepEqual(JSON.parse(JSON.stringify(migrated)), cls);
  assert.equal(legacy.size, 0);
  assert.ok(data.has(`${db.DB_ROOT}classes.csv`));
  assert.equal((await db.loadData(SETTINGS)).schoolName, 'University, Campus');

  const sts = [{ id: 900, name: 'Ali, "A"\nTeacher', reg: 'SE-01', classId: 12345, gender: 'Male', doa: '2026-09-01' }];
  await db.saveData(STUDENTS, sts);
  await db.saveData(ATT, { '2026-10-30_12345': { 900: 'P', 901: 'L' } });
  await db.saveData(EDIT, { '2026-10-30_12345': [ { student: 'Ali, "A"\nTeacher', from: 'A', to: 'P', time: '30 Oct 2026, 09:01' } ] });
  assert.equal((await db.loadData(STUDENTS))[0].name, sts[0].name);
  assert.equal((await db.loadData(ATT))['2026-10-30_12345'][901], 'L');
  assert.equal((await db.loadData(EDIT))['2026-10-30_12345'][0].time, '30 Oct 2026, 09:01');

  // Concurrent writes must not corrupt the on-device CSV file.
  await Promise.all([db.saveData(ATT, { a_1: { 900: 'A' } }), db.saveData(ATT, { a_1: { 900: 'P' } })]);
  assert.equal((await db.loadData(ATT)).a_1[900], 'P');
  await db.clearData([SETTINGS]);
  assert.equal((await db.loadData(CLASSES)).length, 0);
  assert.equal((await db.loadData(STUDENTS)).length, 0);
  assert.equal((await db.loadData(SETTINGS)).schoolName, 'University, Campus');

  const dates = loadSource('src/utils/dates.js', {}, ['localDateKey', 'isValidDateKey']);
  assert.equal(dates.localDateKey(new Date(2026,9,30)), '2026-10-30');
  assert.equal(dates.isValidDateKey('2026-02-29'), false);
  assert.equal(dates.isValidDateKey('2024-02-29'), true);
  assert.equal(dates.isValidDateKey('2026-13-01'), false);
  // Workbook backup schema round-trip, without native Expo or xlsx runtime.
  const XLSX = {
    utils: {
      book_new: () => ({ SheetNames: [], Sheets: {} }),
      aoa_to_sheet: arr => ({ _rows: arr.map(r => [...r]), A1: { v: arr[0]?.[0] } }),
      book_append_sheet: (wb, ws, name) => { wb.Sheets[name] = ws; wb.SheetNames.push(name); },
      sheet_to_json: ws => ws._rows,
      encode_cell: ({ r, c }) => `${String.fromCharCode(65+c)}${r+1}`,
      encode_col: c => String.fromCharCode(65+c),
    },
  };
  const book = loadSource('src/utils/workbookBackup.js', {
    XLSX, FileSystem: fakeFS, Sharing: {},
  }, ['createBackupWorkbook', 'parseBackupWorkbook']);
  const example = {
    classes: cls, students: sts,
    attendance: { '2026-10-30_12345': { 900: 'P', 901: 'L' } },
    editHistory: { '2026-10-30_12345': [ { student: 'Ali, "A"\nTeacher', from: 'A', to: 'P', time: '30 Oct 2026, 09:01' } ] },
    settings: { schoolName: 'University, Campus' },
  };
  const wb = book.createBackupWorkbook(example);
  assert.deepEqual(wb.SheetNames, ['Read Me', 'Classes', 'Students', 'Attendance', 'Edit History', 'Settings']);
  const restored = book.parseBackupWorkbook(wb);
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), example);
  delete wb.Sheets.Students;
  assert.throws(() => book.parseBackupWorkbook(wb), /missing the Students worksheet/);
  console.log('PASS: full XLSX backup worksheet schema round-trip and invalid-sheet rejection.');
  console.log('PASS: CSV quoting, multiline Unicode, migration, persistence, attendance, edit history, queued writes, clear, and dates.');
})().catch(err => { console.error('FAIL:', err); process.exitCode = 1; });
