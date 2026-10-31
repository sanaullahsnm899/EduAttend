/** Pure roster rules: UI and data actions must enforce the same constraints. */
export const registrationKey = (value) => String(value ?? '')
  .normalize('NFKC').replace(/\s+/g, '').toUpperCase();

export function duplicateRegistration(students, classId, reg, excludeId = null) {
  const key = registrationKey(reg);
  if (!key) return null;
  return students.find(s =>
    s.classId === classId &&
    s.id !== excludeId &&
    registrationKey(s.reg) === key
  ) || null;
}

export function rosterError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

export function validateStudent(students, data, excludeId = null) {
  const name = String(data.name ?? '').trim();
  const reg = String(data.reg ?? '').trim();
  const classId = data.classId ?? null;
  if (!name) throw rosterError('INVALID_NAME', 'Please enter the student name.');
  if (!registrationKey(reg)) throw rosterError('INVALID_REG', 'Please enter the registration number.');
  const conflict = duplicateRegistration(students, classId, reg, excludeId);
  if (conflict) throw rosterError('DUPLICATE_REGISTRATION',
    `Registration number "${reg}" is already assigned to ${conflict.name} in this class. Please use a different number or edit the existing student.`);
  return { name, reg, classId, gender: data.gender || 'Male', doa: String(data.doa ?? '').trim() };
}

export function makeStudentIds(students, count) {
  const existing = new Set(students.map(s => Number(s.id)));
  const ids = [];
  let next = Math.max(Date.now() * 1000, 1);
  for (let i = 0; i < count; i++) {
    while (existing.has(next)) next++;
    if (!Number.isSafeInteger(next)) throw rosterError('ID_OVERFLOW','Could not allocate a safe student ID.');
    ids.push(next); existing.add(next); next++;
  }
  return ids;
}

/** Skip existing registrations and repeated registrations in source; never carry attendance. */
export function planRosterCopy(students, sourceClassId, targetClassId) {
  if (sourceClassId == null || targetClassId == null || sourceClassId === targetClassId)
    throw rosterError('INVALID_COPY', 'Select two different classes to copy students.');
  const source = students.filter(s => s.classId === sourceClassId);
  const targetKeys = new Set(students.filter(s => s.classId === targetClassId).map(s => registrationKey(s.reg)));
  const incoming = []; let skipped = 0;
  for (const student of source) {
    const key = registrationKey(student.reg);
    if (!key || targetKeys.has(key)) { skipped++; continue; }
    incoming.push({ name: student.name, reg: student.reg, gender: student.gender, doa: student.doa, classId: targetClassId });
    targetKeys.add(key);
  }
  return { incoming, skipped, sourceCount: source.length };
}

export function findRosterDuplicates(students, classId = 'all') {
  const seen = new Map(); const duplicates = [];
  for (const student of students) {
    if (classId !== 'all' && student.classId !== classId) continue;
    const key = registrationKey(student.reg);
    if (!key) continue;
    const scope = `${student.classId ?? 'unassigned'}:${key}`;
    if (seen.has(scope)) duplicates.push({ student, first: seen.get(scope) });
    else seen.set(scope, student);
  }
  return duplicates;
}

/**
 * View-only deduplication for the All Classes list.
 * The records themselves stay separate because attendance is saved per class.
 * Match both registration number and name to avoid accidentally merging two
 * different people who happen to use the same number in different classes.
 * Existing duplicate registrations within ONE class are never hidden.
 */
export function groupStudentsForDisplay(students) {
  const grouped = [];
  const byIdentity = new Map();
  for (const student of students) {
    const reg = registrationKey(student.reg);
    const name = String(student.name ?? '').normalize('NFKC')
      .trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    const identity = reg && name ? `${reg}::${name}` : `record::${student.id}`;
    const candidates = byIdentity.get(identity) || [];
    // A duplicate in the same class needs its own row and warning.
    let group = candidates.find(item => !item.entries.some(entry => entry.classId === student.classId));
    if (!group) {
      group = { key: String(student.id), student, entries: [] };
      grouped.push(group);
      candidates.push(group);
      byIdentity.set(identity, candidates);
    }
    group.entries.push(student);
  }
  return grouped;
}
