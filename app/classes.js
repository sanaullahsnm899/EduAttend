// FILE: app/classes.js
import React, { useState } from 'react';
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
  Card,
  Chip,
  EmptyState,
  BottomSheetModal,
  FadeInUp,
} from '../src/components/UI';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';

const EMPTY_FORM = { name: '', teacher: '', start: '', end: '' };

export default function ClassesScreen() {
  const router = useRouter();
  const { classes, students, addClass, updateClass, deleteClass } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditingClass(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(cls) {
    setEditingClass(cls);
    setForm({
      name: cls.name,
      teacher: cls.teacher,
      start: cls.start,
      end: cls.end,
    });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingClass(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Class name is required.');
      return;
    }
    if (!form.teacher.trim()) {
      Alert.alert('Validation', 'Teacher name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editingClass) {
        await updateClass(editingClass.id, form);
      } else {
        await addClass(form);
      }
      closeModal();
    } catch (e) {
      Alert.alert('Error', 'Failed to save class. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(cls) {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${cls.name}"? Students in this class will be unassigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteClass(cls.id),
        },
      ]
    );
  }

  function getStudentCount(classId) {
    return students.filter((s) => s.classId === classId).length;
  }

  return (
    <View style={styles.root}>
      <Header
        title="Classes"
        onBack={() => router.back()}
        rightComponent={
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {classes.length === 0 ? (
          <EmptyState
            icon="🏫"
            title="No classes yet"
            subtitle="Create your first class section to start tracking attendance."
            actionLabel="+ Add Class"
            onAction={openAdd}
          />
        ) : (
          classes.map((cls, idx) => {
            const count = getStudentCount(cls.id);
            return (
              <FadeInUp key={cls.id} delay={idx * 60}>
                <Card style={styles.classCard} accent="cardTeal">
                <View style={styles.cardTopRow}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.className}>{cls.name}</Text>
                    <Text style={styles.teacherName}>👨‍🏫 {cls.teacher}</Text>
                    <Text style={styles.dateRange}>
                      📅 {cls.start || '—'} to {cls.end || '—'}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => openEdit(cls)}
                      style={styles.iconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.iconBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(cls)}
                      style={[styles.iconBtn, styles.iconBtnDelete]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.iconBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.cardBottomRow}>
                  <Chip
                    label={`👥 ${count} student${count !== 1 ? 's' : ''}`}
                    color={COLORS.primaryLight}
                    textColor={COLORS.primaryDark}
                  />
                  <View style={styles.shortcutBtns}>
                    <TouchableOpacity
                      style={[styles.shortcutBtn, { backgroundColor: COLORS.primaryLight }]}
                      onPress={() =>
                        router.push({
                          pathname: '/attendance',
                          params: { classId: cls.id },
                        })
                      }
                    >
                      <Text style={[styles.shortcutBtnText, { color: COLORS.primaryDark }]}>
                        ✅ Attendance
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.shortcutBtn, { backgroundColor: '#edf2fb' }]}
                      onPress={() =>
                        router.push({
                          pathname: '/reports',
                          params: { classId: cls.id },
                        })
                      }
                    >
                      <Text style={[styles.shortcutBtnText, { color: COLORS.secondary }]}>
                        📊 Report
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                </Card>
              </FadeInUp>
            );
          })
        )}
        <View style={{ height: SIZES.xxxl }} />
      </ScrollView>

      <BottomSheetModal
        visible={modalVisible}
        onClose={closeModal}
        title={editingClass ? 'Edit Class' : 'Add New Class'}
      >
        <InputField
          label="Class Name *"
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="e.g. BSCS 3rd Semester"
        />
        <InputField
          label="Teacher Name *"
          value={form.teacher}
          onChangeText={(v) => setForm({ ...form, teacher: v })}
          placeholder="e.g. Dr. Ahmad Khan"
        />
        <InputField
          label="Start Date (YYYY-MM-DD)"
          value={form.start}
          onChangeText={(v) => setForm({ ...form, start: v })}
          placeholder="2024-09-01"
          keyboardType="numbers-and-punctuation"
        />
        <InputField
          label="End Date (YYYY-MM-DD)"
          value={form.end}
          onChangeText={(v) => setForm({ ...form, end: v })}
          placeholder="2024-12-31"
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
            label={editingClass ? 'Update' : 'Save'}
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
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
  classCard: {
    padding: SIZES.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  cardInfo: { flex: 1, paddingRight: SIZES.sm },
  className: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  teacherName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  dateRange: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: SIZES.radiusSm,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDelete: {
    backgroundColor: '#fdf0f0',
  },
  iconBtnText: { fontSize: 17 },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  shortcutBtns: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  shortcutBtn: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  shortcutBtnText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
  },
  modalBtns: {
    flexDirection: 'row',
    marginTop: SIZES.md,
  },
});
