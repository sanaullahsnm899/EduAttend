// FILE: app/students.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import {
  Header,
  PrimaryBtn,
  InputField,
  Avatar,
  Chip,
  EmptyState,
  BottomSheetModal,
  PickerRow,
  FadeInUp,
} from '../src/components/UI';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';

const EMPTY_FORM = {
  name: '',
  reg: '',
  classId: null,
  gender: 'Male',
  doa: '',
};

const GENDER_OPTIONS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

export default function StudentsScreen() {
  const router = useRouter();
  const { classes, students, addStudent, updateStudent, deleteStudent } = useApp();

  const [filterClassId, setFilterClassId] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const classOptions = [
    { label: 'All Classes', value: 'all' },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  const classPickerOptions = [
    { label: 'No Class', value: null },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  const filteredStudents = useMemo(() => {
    if (filterClassId === 'all') return students;
    return students.filter((s) => s.classId === filterClassId);
  }, [students, filterClassId]);

  function getClassName(classId) {
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : 'No Class';
  }

  function openAdd() {
    setEditingStudent(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(student) {
    setEditingStudent(student);
    setForm({
      name: student.name,
      reg: student.reg,
      classId: student.classId,
      gender: student.gender || 'Male',
      doa: student.doa || '',
    });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingStudent(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Student name is required.');
      return;
    }
    if (!form.reg.trim()) {
      Alert.alert('Validation', 'Registration number is required.');
      return;
    }
    setSaving(true);
    try {
      if (editingStudent) {
        await updateStudent(editingStudent.id, form);
      } else {
        await addStudent(form);
      }
      closeModal();
    } catch (e) {
      Alert.alert('Error', 'Failed to save student. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(student) {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete "${student.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteStudent(student.id),
        },
      ]
    );
  }

  const genderColors = {
    Male: COLORS.secondary,
    Female: '#8b4eb7',
    Other: COLORS.warning,
  };

  return (
    <View style={styles.root}>
      <Header
        title="Students"
        onBack={() => router.back()}
        rightComponent={
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.filterWrap}>
        <PickerRow
          label="Filter by Class"
          value={filterClassId}
          options={classOptions}
          onSelect={setFilterClassId}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon="👨‍🎓"
            title="No students found"
            subtitle={
              filterClassId === 'all'
                ? 'Add your first student to start taking attendance.'
                : 'No students in this class yet.'
            }
            actionLabel="+ Add Student"
            onAction={openAdd}
          />
        ) : (
          filteredStudents.map((student, idx) => (
            <FadeInUp key={student.id} delay={idx * 40}>
            <View style={styles.studentRow}>
              <Avatar
                name={student.name}
                size={44}
                bg={genderColors[student.gender] || COLORS.primary}
              />
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentReg}>{student.reg}</Text>
                <View style={styles.chipRow}>
                  <Chip
                    label={getClassName(student.classId)}
                    color={COLORS.primaryLight}
                    textColor={COLORS.primaryDark}
                    style={{ marginRight: 4, marginBottom: 2 }}
                  />
                  <Chip
                    label={student.gender || 'Male'}
                    color={
                      student.gender === 'Female'
                        ? '#f3e8fb'
                        : student.gender === 'Other'
                        ? '#fff3e0'
                        : '#e8f0fe'
                    }
                    textColor={genderColors[student.gender] || COLORS.secondary}
                    style={{ marginRight: 4, marginBottom: 2 }}
                  />
                  {student.doa ? (
                    <Chip
                      label={`📅 ${student.doa}`}
                      color="#f5f5f5"
                      textColor={COLORS.textSecondary}
                      style={{ marginBottom: 2 }}
                    />
                  ) : null}
                </View>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  onPress={() => openEdit(student)}
                  style={styles.iconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.iconBtnText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(student)}
                  style={[styles.iconBtn, styles.iconBtnDelete]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.iconBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
            </FadeInUp>
          ))
        )}
        <View style={{ height: SIZES.xxxl }} />
      </ScrollView>

      <BottomSheetModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
      >
        <InputField
          label="Full Name *"
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="e.g. Muhammad Ali"
        />
        <InputField
          label="Registration Number *"
          value={form.reg}
          onChangeText={(v) => setForm({ ...form, reg: v })}
          placeholder="e.g. 2021-BSCS-001"
        />
        <PickerRow
          label="Class"
          value={form.classId}
          options={classPickerOptions}
          onSelect={(v) => setForm({ ...form, classId: v })}
        />
        <PickerRow
          label="Gender"
          value={form.gender}
          options={GENDER_OPTIONS}
          onSelect={(v) => setForm({ ...form, gender: v })}
        />
        <InputField
          label="Date of Admission (YYYY-MM-DD)"
          value={form.doa}
          onChangeText={(v) => setForm({ ...form, doa: v })}
          placeholder="2024-09-01"
          keyboardType="numbers-and-punctuation"
        />
        <View style={styles.modalBtns}>
          <PrimaryBtn
            label="Cancel"
            onPress={closeModal}
            color="#f0f0f0"
            textColor={COLORS.textPrimary}
            style={{ flex: 1, marginRight: SIZES.sm }}
          />
          <PrimaryBtn
            label={editingStudent ? 'Update' : 'Save'}
            onPress={handleSave}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  filterWrap: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: 0,
    backgroundColor: COLORS.card,
    zIndex: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.xxxl,
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs + 2,
    borderRadius: SIZES.radiusSm,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONTS.sizes.sm,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  studentInfo: {
    flex: 1,
    marginLeft: SIZES.md,
    paddingRight: SIZES.sm,
  },
  studentName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  studentReg: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
    fontFamily: 'monospace',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: SIZES.radiusSm,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDelete: {
    backgroundColor: '#fdf0f0',
  },
  iconBtnText: { fontSize: 16 },
  modalBtns: {
    flexDirection: 'row',
    marginTop: SIZES.md,
  },
});
