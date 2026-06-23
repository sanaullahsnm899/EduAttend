// FILE: app/attendance.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import {
  Header,
  PrimaryBtn,
  InputField,
  AttBtn,
  EditHistoryItem,
  EmptyState,
  PickerRow,
  Chip,
} from '../src/components/UI';
import { exportAttendanceXLSX } from '../src/utils/xlsxExport';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';

function formatDateTime(date) {
  const d = date || new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${hh}:${mm}`;
}

export default function AttendanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    classes,
    students,
    attendance,
    settings,
    saveAttendance,
    getAttendance,
    saveEditHistory,
    getEditHistory,
  } = useApp();

  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClassId, setSelectedClassId] = useState(
    params.classId ? Number(params.classId) : null
  );
  const [attRecord, setAttRecord] = useState({});
  const [savedRecord, setSavedRecord] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const classOptions = [
    { label: 'Select a class...', value: null },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  const studentsInClass = selectedClassId
    ? students.filter((s) => s.classId === selectedClassId)
    : [];

  const loadAttendance = useCallback(() => {
    if (!selectedDate || !selectedClassId) return;
    const rec = getAttendance(selectedDate, selectedClassId);
    const hist = getEditHistory(selectedDate, selectedClassId);
    if (rec) {
      setSavedRecord({ ...rec });
      setAttRecord({ ...rec });
    } else {
      setSavedRecord(null);
      const defaultRecord = {};
      studentsInClass.forEach((s) => {
        defaultRecord[s.id] = 'A';
      });
      setAttRecord(defaultRecord);
    }
    setEditHistory(hist || []);
    setIsEditMode(false);
  }, [selectedDate, selectedClassId, attendance]);

  useEffect(() => {
    loadAttendance();
  }, [selectedDate, selectedClassId, attendance]);

  function setStatus(studentId, status) {
    setAttRecord((prev) => ({ ...prev, [studentId]: status }));
  }

  function getRowStyle(student) {
    const status = attRecord[student.id] || 'A';
    const isEdited = savedRecord && savedRecord[student.id] !== attRecord[student.id];
    if (isEdited && isEditMode) return { backgroundColor: COLORS.editedRow };
    if (status === 'P') return { backgroundColor: COLORS.presentRow };
    if (status === 'L') return { backgroundColor: COLORS.leaveRow };
    return { backgroundColor: COLORS.absentRow };
  }

  function isEdited(student) {
    return (
      isEditMode &&
      savedRecord &&
      savedRecord[student.id] !== attRecord[student.id]
    );
  }

  async function handleSave() {
    if (!selectedClassId) {
      Alert.alert('Select Class', 'Please select a class first.');
      return;
    }
    if (studentsInClass.length === 0) {
      Alert.alert('No Students', 'No students in this class.');
      return;
    }
    setSaving(true);
    try {
      if (isEditMode && savedRecord) {
        const changes = [];
        studentsInClass.forEach((s) => {
          const oldStatus = savedRecord[s.id] || 'A';
          const newStatus = attRecord[s.id] || 'A';
          if (oldStatus !== newStatus) {
            changes.push({
              student: s.name,
              from: oldStatus,
              to: newStatus,
              time: formatDateTime(new Date()),
            });
          }
        });
        if (changes.length > 0) {
          await saveEditHistory(selectedDate, selectedClassId, changes);
        }
      }
      await saveAttendance(selectedDate, selectedClassId, attRecord);
      setSavedRecord({ ...attRecord });
      setIsEditMode(false);
      Alert.alert('Saved', 'Attendance record saved successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportCSV() {
    if (!selectedClassId) {
      Alert.alert('Select Class', 'Please select a class first.');
      return;
    }
    const classObj = classes.find((c) => c.id === selectedClassId);
    if (!classObj) return;
    const allDates = Object.keys(attendance)
      .filter((k) => {
        const parts = k.split('_');
        return parts[parts.length - 1] === String(selectedClassId);
      })
      .map((k) => {
        const parts = k.split('_');
        parts.pop();
        return parts.join('_');
      });
    if (allDates.length === 0) {
      Alert.alert('No Data', 'No attendance records found for this class.');
      return;
    }
    setExporting(true);
    try {
      await exportAttendanceXLSX(classObj, studentsInClass, attendance, allDates, settings.schoolName);
    } catch (e) {
      Alert.alert('Error', 'Excel export failed: ' + e.message);
    } finally {
      setExporting(false);
    }
  }

  function enterEditMode() {
    setIsEditMode(true);
  }

  function exitEditMode() {
    setIsEditMode(false);
    if (savedRecord) {
      setAttRecord({ ...savedRecord });
    }
  }

  const isLocked = savedRecord !== null && !isEditMode;
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  const presentCount = studentsInClass.filter(
    (s) => attRecord[s.id] === 'P'
  ).length;
  const absentCount = studentsInClass.filter(
    (s) => attRecord[s.id] === 'A'
  ).length;
  const leaveCount = studentsInClass.filter(
    (s) => attRecord[s.id] === 'L'
  ).length;

  const recentHistory = editHistory.slice(0, 20);

  return (
    <View style={styles.root}>
      <Header
        title="Take Attendance"
        onBack={() => router.back()}
        rightComponent={
          savedRecord && !isEditMode ? (
            <TouchableOpacity style={styles.editHeaderBtn} onPress={enterEditMode}>
              <Text style={styles.editHeaderBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Controls */}
        <View style={styles.controlsCard}>
          <InputField
            label="Date (YYYY-MM-DD)"
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="2024-11-15"
            keyboardType="numbers-and-punctuation"
          />
          <View style={{ zIndex: 10 }}>
            <PickerRow
              label="Select Class"
              value={selectedClassId}
              options={classOptions}
              onSelect={setSelectedClassId}
            />
          </View>
        </View>

        {/* Edit Mode Banner */}
        {isEditMode && (
          <View style={styles.editBanner}>
            <View style={styles.editBannerLeft}>
              <Text style={styles.editBannerText}>
                ✏️ Edit Mode ON — Tap any button to correct a mistake. Amber highlight = changed from saved record.
              </Text>
            </View>
            <TouchableOpacity style={styles.donePill} onPress={exitEditMode}>
              <Text style={styles.donePillText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Banner */}
        {selectedClassId && savedRecord && !isEditMode && (
          <View style={styles.savedBanner}>
            <Text style={styles.savedBannerText}>
              ✅ Record exists for this date. Tap "✏️ Edit" to make corrections.
            </Text>
          </View>
        )}

        {/* Color Legend */}
        {selectedClassId && studentsInClass.length > 0 && (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.presentBg }]} />
              <Text style={styles.legendText}>Present</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.absentBg }]} />
              <Text style={styles.legendText}>Absent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.leaveBg }]} />
              <Text style={styles.legendText}>Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#c9a227' }]} />
              <Text style={styles.legendText}>Edited</Text>
            </View>
          </View>
        )}

        {/* Summary Row */}
        {selectedClassId && studentsInClass.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryBox, { borderLeftColor: COLORS.presentBg }]}>
              <Text style={[styles.summaryVal, { color: COLORS.presentBg }]}>{presentCount}</Text>
              <Text style={styles.summaryLabel}>Present</Text>
            </View>
            <View style={[styles.summaryBox, { borderLeftColor: COLORS.absentBg }]}>
              <Text style={[styles.summaryVal, { color: COLORS.absentBg }]}>{absentCount}</Text>
              <Text style={styles.summaryLabel}>Absent</Text>
            </View>
            <View style={[styles.summaryBox, { borderLeftColor: COLORS.leaveBg }]}>
              <Text style={[styles.summaryVal, { color: COLORS.leaveBg }]}>{leaveCount}</Text>
              <Text style={styles.summaryLabel}>Leave</Text>
            </View>
          </View>
        )}

        {/* Student List */}
        {!selectedClassId ? (
          <EmptyState
            icon="📋"
            title="Select a class"
            subtitle="Choose a class and date above to start taking attendance."
          />
        ) : studentsInClass.length === 0 ? (
          <EmptyState
            icon="👨‍🎓"
            title="No students in this class"
            subtitle="Add students to this class to start taking attendance."
            actionLabel="Go to Students"
            onAction={() => router.push('/students')}
          />
        ) : (
          <View style={styles.listCard}>
            <Text style={styles.listTitle}>
              {selectedClass?.name} — {studentsInClass.length} Student{studentsInClass.length !== 1 ? 's' : ''}
            </Text>
            {studentsInClass.map((student, idx) => {
              const status = attRecord[student.id] || 'A';
              const editedRow = isEdited(student);
              return (
                <View
                  key={student.id}
                  style={[styles.studentRow, getRowStyle(student)]}
                >
                  <View style={styles.studentLeft}>
                    <Text style={styles.studentIdx}>{idx + 1}.</Text>
                    <View style={styles.studentNameWrap}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {student.name}
                      </Text>
                      <View style={styles.studentMetaRow}>
                        <Text style={styles.studentReg}>{student.reg}</Text>
                        {editedRow && (
                          <View style={styles.editedPill}>
                            <Text style={styles.editedPillText}>edited</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <View style={styles.attBtns}>
                    <AttBtn
                      status={status}
                      type="P"
                      onPress={() => setStatus(student.id, 'P')}
                      locked={isLocked}
                    />
                    <AttBtn
                      status={status}
                      type="A"
                      onPress={() => setStatus(student.id, 'A')}
                      locked={isLocked}
                    />
                    <AttBtn
                      status={status}
                      type="L"
                      onPress={() => setStatus(student.id, 'L')}
                      locked={isLocked}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        {selectedClassId && studentsInClass.length > 0 && (
          <View style={styles.actionRow}>
            <PrimaryBtn
              label="💾 Save"
              onPress={handleSave}
              loading={saving}
              style={styles.saveBtn}
              disabled={isLocked}
            />
            <PrimaryBtn
              label="⬇ Excel"
              onPress={handleExportCSV}
              loading={exporting}
              color={COLORS.secondary}
              style={styles.csvBtn}
            />
          </View>
        )}

        {/* Edit History */}
        {recentHistory.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>📋 Edit History</Text>
            {recentHistory.map((entry, idx) => (
              <EditHistoryItem key={idx} entry={entry} />
            ))}
          </View>
        )}

        <View style={{ height: SIZES.xxxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.xxxl,
  },
  editHeaderBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs + 2,
    borderRadius: SIZES.radiusSm,
  },
  editHeaderBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONTS.sizes.sm,
  },
  controlsCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  editBanner: {
    backgroundColor: '#fff8e1',
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
    borderLeftWidth: 4,
    borderLeftColor: '#c9a227',
  },
  editBannerLeft: { flex: 1, paddingRight: SIZES.sm },
  editBannerText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.warning,
    fontWeight: '600',
    lineHeight: 18,
  },
  donePill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: 20,
  },
  donePillText: {
    color: '#fff',
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
  },
  savedBanner: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  savedBannerText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: SIZES.sm,
    gap: SIZES.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: SIZES.md,
    gap: SIZES.sm,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryVal: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginBottom: SIZES.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  studentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SIZES.sm,
  },
  studentIdx: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    width: 22,
    flexShrink: 0,
  },
  studentNameWrap: { flex: 1 },
  studentName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  studentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 1,
  },
  studentReg: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  editedPill: {
    backgroundColor: COLORS.editedBadgeBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  editedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.editedBadgeText,
  },
  attBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  saveBtn: { flex: 2 },
  csvBtn: { flex: 1 },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  historyTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
});
