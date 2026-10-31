/**
 * EduAttend local-first CSV database.
 * Each dataset is a real RFC4180 CSV file under Documents/EduAttendData/.
 * No application records are saved as JSON. Old AsyncStorage JSON is read
 * only once during upgrades, then discarded after a completed migration.
 */
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DB_ROOT = `${FileSystem.documentDirectory}EduAttendData/`;
const READY = `${DB_ROOT}csv_database_v1.ready`;
const SCHEMAS = {
  eduattend_classes: ['id', 'name', 'teacher', 'start', 'end'],
  eduattend_students: ['id', 'name', 'reg', 'classId', 'gender', 'doa'],
  eduattend_attendance: ['date', 'classId', 'studentId', 'status'],
  eduattend_edit_history: ['date', 'classId', 'student', 'from', 'to', 'time'],
  eduattend_settings: ['key', 'value'],
};
const DEFAULTS = {
  eduattend_classes: [], eduattend_students: [],
  eduattend_attendance: {}, eduattend_edit_history: {},
  eduattend_settings: { schoolName: 'My School' },
};
const LEGACY_KEYS = Object.keys(SCHEMAS);
const pending = new Map();
let initializing = null;

function escapeCell(value) {
  const s = String(value === undefined || value === null ? '' : value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function encodeCsv(headers, rows) {
  return [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}

/** Quoted commas, newlines, quotes and CRLF are all handled without dependencies. */
export function decodeCsv(input) {
  const str = String(input || '').replace(/^\uFEFF/, '');
  if (!str.trim()) return [];
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (quoted) {
      if (ch === '"' && str[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') {
      if (cell !== '') throw new Error('Invalid CSV quoting');
      quoted = true;
    } else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && str[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (quoted) throw new Error('Incomplete quoted CSV field');
  if (row.length || cell) { row.push(cell); rows.push(row); }
  return rows;
}

function parseKey(key) {
  const i = key.lastIndexOf('_');
  return { date: key.slice(0, i), classId: key.slice(i + 1) };
}
function toRows(key, value) {
  if (key === 'eduattend_classes')
    return (value || []).map(c => [c.id, c.name, c.teacher, c.start, c.end]);
  if (key === 'eduattend_students')
    return (value || []).map(s => [s.id, s.name, s.reg, s.classId ?? '', s.gender, s.doa]);
  if (key === 'eduattend_attendance')
    return Object.entries(value || {}).flatMap(([key, rec]) => {
      const { date, classId } = parseKey(key);
      return Object.entries(rec || {}).map(([id, status]) => [date, classId, id, status]);
    });
  if (key === 'eduattend_edit_history')
    return Object.entries(value || {}).flatMap(([key, entries]) => {
      const { date, classId } = parseKey(key);
      return (entries || []).map(e => [date, classId, e.student, e.from, e.to, e.time]);
    });
  if (key === 'eduattend_settings')
    return Object.entries(value || {}).map(([k, v]) => [k, v]);
  throw new Error(`Unknown data category: ${key}`);
}
function fromRows(key, rows) {
  if (key === 'eduattend_classes') return rows.map(r => ({
    id: Number(r[0]), name: r[1], teacher: r[2], start: r[3], end: r[4],
  }));
  if (key === 'eduattend_students') return rows.map(r => ({
    id: Number(r[0]), name: r[1], reg: r[2], classId: r[3] === '' ? null : Number(r[3]),
    gender: r[4], doa: r[5],
  }));
  if (key === 'eduattend_attendance') {
    const result = {};
    rows.forEach(([date, classId, id, status]) => {
      const k = `${date}_${classId}`;
      if (!result[k]) result[k] = {};
      result[k][id] = status;
    });
    return result;
  }
  if (key === 'eduattend_edit_history') {
    const result = {};
    rows.forEach(([date, classId, student, from, to, time]) => {
      const k = `${date}_${classId}`;
      if (!result[k]) result[k] = [];
      result[k].push({ student, from, to, time });
    });
    return result;
  }
  if (key === 'eduattend_settings')
    return Object.fromEntries(rows.map(([k, v]) => [k, v]));
  throw new Error(`Unknown data category: ${key}`);
}

function pathFor(key) {
  if (!SCHEMAS[key]) throw new Error(`Unknown storage key ${key}`);
  return `${DB_ROOT}${key.replace(/^eduattend_/, '')}.csv`;
}

async function writeCsv(key, value) {
  await FileSystem.makeDirectoryAsync(DB_ROOT, { intermediates: true });
  const target = pathFor(key);
  const tmp = `${target}.tmp`;
  const bak = `${target}.bak`;
  const csv = encodeCsv(SCHEMAS[key], toRows(key, value));
  await FileSystem.writeAsStringAsync(tmp, csv, { encoding: 'utf8' });
  // Preserve a recoverable copy until replacement succeeds.
  const old = await FileSystem.getInfoAsync(target);
  if (old.exists) {
    const b = await FileSystem.getInfoAsync(bak);
    if (b.exists) await FileSystem.deleteAsync(bak, { idempotent: true });
    await FileSystem.moveAsync({ from: target, to: bak });
  }
  try {
    await FileSystem.moveAsync({ from: tmp, to: target });
    try { await FileSystem.deleteAsync(bak, { idempotent: true }); }
    catch (cleanupError) { console.warn('Old CSV backup cleanup deferred', cleanupError); }
  } catch (err) {
    const b = await FileSystem.getInfoAsync(bak);
    if (b.exists) await FileSystem.moveAsync({ from: bak, to: target });
    throw err;
  }
}
async function readCsv(key) {
  const target = pathFor(key);
  let info = await FileSystem.getInfoAsync(target);
  if (!info.exists) {
    const bak = `${target}.bak`;
    const b = await FileSystem.getInfoAsync(bak);
    if (b.exists) {
      await FileSystem.moveAsync({ from: bak, to: target });
      info = await FileSystem.getInfoAsync(target);
    }
  }
  if (!info.exists) return null;
  const rows = decodeCsv(await FileSystem.readAsStringAsync(target, { encoding: 'utf8' }));
  const schema = SCHEMAS[key];
  if (!rows.length || rows[0].join(',') !== schema.join(','))
    throw new Error(`Unexpected CSV columns in ${key}`);
  if (rows.slice(1).some(r => r.length !== schema.length))
    throw new Error(`Damaged CSV record in ${key}`);
  return fromRows(key, rows.slice(1));
}

async function init() {
  if (initializing) return initializing;
  initializing = (async () => {
    await FileSystem.makeDirectoryAsync(DB_ROOT, { intermediates: true });
    const ready = await FileSystem.getInfoAsync(READY);
    if (!ready.exists) {
      // Use pre-existing CSVs if present (e.g. fresh install interrupted on
      // its first launch), otherwise migrate legacy records exactly once.
      for (const key of LEGACY_KEYS) {
        const already = await readCsv(key);
        if (already !== null) continue;
        const legacy = await AsyncStorage.getItem(key);
        let value = DEFAULTS[key];
        if (legacy !== null) value = JSON.parse(legacy); // migration only
        await writeCsv(key, value);
      }
      await FileSystem.writeAsStringAsync(READY, 'CSV database v1\n', { encoding: 'utf8' });
      await AsyncStorage.multiRemove(LEGACY_KEYS);
    }
  })().catch(err => { initializing = null; throw err; });
  return initializing;
}
export async function loadData(key) {
  await init();
  await (pending.get(key) || Promise.resolve());
  const value = await readCsv(key);
  if (value === null) throw new Error(`Missing data file: ${key}`);
  return value;
}
export async function saveData(key, value) {
  await init();
  const previous = pending.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(() => writeCsv(key, value));
  pending.set(key, next);
  try { await next; } finally { if (pending.get(key) === next) pending.delete(key); }
}
export async function clearData(preserveKeys = []) {
  await init();
  for (const key of LEGACY_KEYS) {
    if (!preserveKeys.includes(key)) await saveData(key, DEFAULTS[key]);
  }
}
export async function saveAllData(data) {
  await init();
  // Each sheet is committed as an actual CSV. Caller should retain a backup
  // before a destructive restore (UI requires an explicit confirmation).
  const previous = {};
  for (const key of LEGACY_KEYS) previous[key] = await loadData(key);
  try {
    for (const key of LEGACY_KEYS) await saveData(key, data[key]);
  } catch (error) {
    // Best-effort rollback across files if a write fails.
    for (const key of LEGACY_KEYS) {
      try { await saveData(key, previous[key]); } catch (e) { console.error('Rollback failed', key, e); }
    }
    throw error;
  }
}
