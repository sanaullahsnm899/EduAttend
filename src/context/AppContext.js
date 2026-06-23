// FILE: src/context/AppContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadData, saveData, clearData } from '../utils/storage';

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
  const [attendance, setAttendance] = useState({});
  const [editHistory, setEditHistory] = useState({});
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initLoad();
  }, []);

  async function initLoad() {
    try {
      const cls = await loadData(STORAGE_KEYS.CLASSES);
      const stu = await loadData(STORAGE_KEYS.STUDENTS);
      const att = await loadData(STORAGE_KEYS.ATTENDANCE);
      const edt = await loadData(STORAGE_KEYS.EDIT_HISTORY);
      const set = await loadData(STORAGE_KEYS.SETTINGS);
      if (cls) setClasses(cls);
      if (stu) setStudents(stu);
      if (att) setAttendance(att);
      if (edt) setEditHistory(edt);
      if (set) setSettings({ ...DEFAULT_SETTINGS, ...set });
    } catch (e) {
      console.error('initLoad error', e);
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
    setClasses(updated);
    await saveData(STORAGE_KEYS.CLASSES, updated);
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
    setClasses(updated);
    await saveData(STORAGE_KEYS.CLASSES, updated);
  }

  async function deleteClass(id) {
    const updatedClasses = classes.filter((c) => c.id !== id);
    const updatedStudents = students.map((s) =>
      s.classId === id ? { ...s, classId: null } : s
    );
    setClasses(updatedClasses);
    setStudents(updatedStudents);
    await saveData(STORAGE_KEYS.CLASSES, updatedClasses);
    await saveData(STORAGE_KEYS.STUDENTS, updatedStudents);
  }

  // ── STUDENTS ─────────────────────────────────────────────────────
  async function addStudent(studentData) {
    const newStudent = {
      id: Date.now(),
      name: studentData.name.trim(),
      reg: studentData.reg.trim(),
      classId: studentData.classId || null,
      gender: studentData.gender || 'Male',
      doa: studentData.doa.trim(),
    };
    const updated = [...students, newStudent];
    setStudents(updated);
    await saveData(STORAGE_KEYS.STUDENTS, updated);
    return newStudent;
  }

  async function updateStudent(id, studentData) {
    const updated = students.map((s) =>
      s.id === id
        ? {
            ...s,
            name: studentData.name.trim(),
            reg: studentData.reg.trim(),
            classId: studentData.classId || null,
            gender: studentData.gender || 'Male',
            doa: studentData.doa.trim(),
          }
        : s
    );
    setStudents(updated);
    await saveData(STORAGE_KEYS.STUDENTS, updated);
  }

  async function deleteStudent(id) {
    const updated = students.filter((s) => s.id !== id);
    setStudents(updated);
    await saveData(STORAGE_KEYS.STUDENTS, updated);
  }

  // ── ATTENDANCE ───────────────────────────────────────────────────
  async function saveAttendance(date, classId, record) {
    const key = `${date}_${classId}`;
    const updated = { ...attendance, [key]: record };
    setAttendance(updated);
    await saveData(STORAGE_KEYS.ATTENDANCE, updated);
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
    setEditHistory(updated);
    await saveData(STORAGE_KEYS.EDIT_HISTORY, updated);
  }

  function getEditHistory(date, classId) {
    const key = `${date}_${classId}`;
    return editHistory[key] || [];
  }

  // ── SETTINGS ─────────────────────────────────────────────────────
  async function updateSettings(partial) {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await saveData(STORAGE_KEYS.SETTINGS, updated);
  }

  // ── BACKUP / RESTORE ─────────────────────────────────────────────
  async function restoreData(data) {
    const cls = data.classes || [];
    const stu = data.students || [];
    const att = data.attendance || {};
    const edt = data.editHistory || {};
    const set = data.settings ? { ...DEFAULT_SETTINGS, ...data.settings } : settings;
    setClasses(cls);
    setStudents(stu);
    setAttendance(att);
    setEditHistory(edt);
    setSettings(set);
    await saveData(STORAGE_KEYS.CLASSES, cls);
    await saveData(STORAGE_KEYS.STUDENTS, stu);
    await saveData(STORAGE_KEYS.ATTENDANCE, att);
    await saveData(STORAGE_KEYS.EDIT_HISTORY, edt);
    await saveData(STORAGE_KEYS.SETTINGS, set);
  }

  async function clearAll() {
    setClasses([]);
    setStudents([]);
    setAttendance({});
    setEditHistory({});
    // Settings (school name) intentionally survive "Clear All Data" — a
    // teacher wiping attendance records shouldn't have to re-type their
    // school name.
    await clearData([STORAGE_KEYS.SETTINGS]);
  }

  const todayKey = new Date().toISOString().split('T')[0];
  const todayAttCount = Object.keys(attendance).filter((k) =>
    k.startsWith(todayKey)
  ).length;

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
