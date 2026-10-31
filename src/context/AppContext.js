// FILE: src/context/AppContext.js
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { loadData, saveData, clearData, saveAllData } from '../utils/storage';
import { localDateKey } from '../utils/dates';
import { validateStudent, planRosterCopy, makeStudentIds, rosterError } from '../utils/studentRoster';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  CLASSES: 'eduattend_classes',
  STUDENTS: 'eduattend_students',
  ATTENDANCE: 'eduattend_attendance',
  EDIT_HISTORY: 'eduattend_edit_history',
  SETTINGS: 'eduattend_settings',
};

const DEFAULT_SETTINGS = {
  schoolName: 'My School',
};

export function AppProvider({ children }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const studentsRef = useRef([]);
  const studentsQueue = useRef(Promise.resolve());
  const [attendance, setAttendance] = useState({});
  const [editHistory, setEditHistory] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    initLoad();
  }, []);

  async function initLoad() {
    setLoadError(null);
    try {
      const cls = await loadData(STORAGE_KEYS.CLASSES);
      const stu = await loadData(STORAGE_KEYS.STUDENTS);
      const att = await loadData(STORAGE_KEYS.ATTENDANCE);
      const edt = await loadData(STORAGE_KEYS.EDIT_HISTORY);
      const set = await loadData(STORAGE_KEYS.SETTINGS);
      if (cls) setClasses(cls);
      if (stu) { studentsRef.current = stu; setStudents(stu); }
      if (att) setAttendance(att);
      if (edt) setEditHistory(edt);
      if (set) setSettings({ ...DEFAULT_SETTINGS, ...set });
    } catch (e) {
      console.error('initLoad error', e);
      setLoadError(e.message || 'Could not read local CSV files');
    } finally {
      setLoading(false);
    }
  }

  // ── CLASSES ──────────────────────────────────────────────────────
  async function addClass(classData) {
    const newClass = {
      id: Date.now(),
      name: classData.name.trim(),
      teacher: classData.teacher.trim(),
      start: classData.start.trim(),
      end: classData.end.trim(),
    };
    const updated = [...classes, newClass];
    await saveData(STORAGE_KEYS.CLASSES, updated);
    setClasses(updated);
    return newClass;
  }

  async function updateClass(id, classData) {
    const updated = classes.map((c) =>
      c.id === id
        ? {
            ...c,
            name: classData.name.trim(),
            teacher: classData.teacher.trim(),
            start: classData.start.trim(),
            end: classData.end.trim(),
          }
        : c
    );
    await saveData(STORAGE_KEYS.CLASSES, updated);
    setClasses(updated);
  }

  async function deleteClass(id) {
    const updatedClasses = classes.filter((c) => c.id !== id);
    const updatedStudents = students.map((s) =>
      s.classId === id ? { ...s, classId: null } : s
    );
    await saveData(STORAGE_KEYS.CLASSES, updatedClasses);
    await saveData(STORAGE_KEYS.STUDENTS, updatedStudents);
    setClasses(updatedClasses);
    studentsRef.current = updatedStudents;
    setStudents(updatedStudents);
  }

  // ── STUDENTS ─────────────────────────────────────────────────────
  // Serialize roster mutations: consecutive taps/copies must not lose writes
  // or bypass duplicate detection through stale React render snapshots.
  function mutateStudents(change) {
    const operation = studentsQueue.current.catch(() => {}).then(async () => {
      const { next, result } = change(studentsRef.current);
      await saveData(STORAGE_KEYS.STUDENTS, next);
      studentsRef.current = next;
      setStudents(next);
      return result;
    });
    studentsQueue.current = operation;
    return operation;
  }

  function addStudent(studentData) {
    return mutateStudents((current) => {
      const normalized = validateStudent(current, studentData);
      if (normalized.classId !== null && !classes.some(c => c.id === normalized.classId))
        throw rosterError('MISSING_CLASS', 'The selected class no longer exists.');
      const [id] = makeStudentIds(current, 1);
      const newStudent = { id, ...normalized };
      return { next: [...current, newStudent], result: newStudent };
    });
  }

  function updateStudent(id, studentData) {
    return mutateStudents((current) => {
      if (!current.some(s => s.id === id))
        throw rosterError('MISSING_STUDENT', 'This student no longer exists.');
      const normalized = validateStudent(current, studentData, id);
      if (normalized.classId !== null && !classes.some(c => c.id === normalized.classId))
        throw rosterError('MISSING_CLASS', 'The selected class no longer exists.');
      return { next: current.map(s => s.id === id ? { ...s, ...normalized } : s) };
    });
  }

  function deleteStudent(id) {
    return mutateStudents(current => ({ next: current.filter(s => s.id !== id) }));
  }

  function copyStudentsToClass(sourceClassId, targetClassId) {
    return mutateStudents((current) => {
      if (!classes.some(c => c.id === sourceClassId) || !classes.some(c => c.id === targetClassId))
        throw rosterError('MISSING_CLASS', 'Please select existing source and destination classes.');
      const plan = planRosterCopy(current, sourceClassId, targetClassId);
      if (!plan.incoming.length) return { next: current, result: { copied: 0, skipped: plan.skipped, sourceCount: plan.sourceCount } };
      const ids = makeStudentIds(current, plan.incoming.length);
      const copies = plan.incoming.map((student, i) => ({ id: ids[i], ...student }));
      return {
        next: [...current, ...copies],
        result: { copied: copies.length, skipped: plan.skipped, sourceCount: plan.sourceCount },
      };
    });
  }

  // ── ATTENDANCE ───────────────────────────────────────────────────
  async function saveAttendance(date, classId, record) {
    const key = `${date}_${classId}`;
    const updated = { ...attendance, [key]: record };
    await saveData(STORAGE_KEYS.ATTENDANCE, updated);
    setAttendance(updated);
  }

  function getAttendance(date, classId) {
    const key = `${date}_${classId}`;
    return attendance[key] || null;
  }

  // ── EDIT HISTORY ─────────────────────────────────────────────────
  async function saveEditHistory(date, classId, entries) {
    const key = `${date}_${classId}`;
    const existing = editHistory[key] || [];
    const updated = { ...editHistory, [key]: [...entries, ...existing] };
    await saveData(STORAGE_KEYS.EDIT_HISTORY, updated);
    setEditHistory(updated);
  }

  function getEditHistory(date, classId) {
    const key = `${date}_${classId}`;
    return editHistory[key] || [];
  }

  // ── SETTINGS ─────────────────────────────────────────────────────
  async function updateSettings(partial) {
    const updated = { ...settings, ...partial };
    await saveData(STORAGE_KEYS.SETTINGS, updated);
    setSettings(updated);
  }

  // ── BACKUP / RESTORE ─────────────────────────────────────────────
  async function restoreData(data) {
    const cls = data.classes || [];
    const stu = data.students || [];
    const att = data.attendance || {};
    const edt = data.editHistory || {};
    const set = data.settings ? { ...DEFAULT_SETTINGS, ...data.settings } : settings;
    await saveAllData({
      [STORAGE_KEYS.CLASSES]: cls,
      [STORAGE_KEYS.STUDENTS]: stu,
      [STORAGE_KEYS.ATTENDANCE]: att,
      [STORAGE_KEYS.EDIT_HISTORY]: edt,
      [STORAGE_KEYS.SETTINGS]: set,
    });
    setClasses(cls);
    studentsRef.current = stu;
    setStudents(stu);
    setAttendance(att);
    setEditHistory(edt);
    setSettings(set);
  }

  async function clearAll() {
    await clearData([STORAGE_KEYS.SETTINGS]);
    setClasses([]);
    studentsRef.current = [];
    setStudents([]);
    setAttendance({});
    setEditHistory({});
  }

  const todayKey = localDateKey();
  const todayAttCount = Object.keys(attendance).filter((k) =>
    k.startsWith(todayKey)
  ).length;

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#F4F8FA', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#0B806D" />
      <Text style={{ color: '#37515D', marginTop: 18 }}>Preparing your attendance records…</Text>
    </View>
  );
  if (loadError) return (
    <View style={{ flex: 1, backgroundColor: '#F4F8FA', padding: 28, justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#123240' }}>Unable to open saved records</Text>
      <Text style={{ marginVertical: 14, color: '#526A77', lineHeight: 23 }}>{loadError}</Text>
      <Text style={{ color: '#526A77', marginBottom: 22 }}>Your files have not been cleared. Please do not uninstall the app.</Text>
      <Pressable onPress={() => { setLoading(true); initLoad(); }} style={{ backgroundColor: '#0B806D', padding: 15, borderRadius: 13 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '800' }}>Try again</Text>
      </Pressable>
    </View>
  );

  return (
    <AppContext.Provider
      value={{
        classes,
        students,
        attendance,
        editHistory,
        settings,
        loading,
        todayAttCount,
        addClass,
        updateClass,
        deleteClass,
        addStudent,
        updateStudent,
        deleteStudent,
        copyStudentsToClass,
        saveAttendance,
        getAttendance,
        saveEditHistory,
        getEditHistory,
        updateSettings,
        restoreData,
        clearAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
