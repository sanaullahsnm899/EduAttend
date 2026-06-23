// FILE: app/reports.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import {
  Header,
  PrimaryBtn,
  InputField,
  StatusBadge,
  EmptyState,
  PickerRow,
} from '../src/components/UI';
import { exportAttendanceXLSX } from '../src/utils/xlsxExport';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';

export default function ReportsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { classes, students, attendance, settings } = useApp();

  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedClassId, setSelectedClassId] = useState(
    params.classId ? Number(params.classId) : null
  );
  const [exporting, setExporting] = useState(false);

  const classOptions = [
    { label: 'All Classes', value: null },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  const reportData = useMemo(() => {
    if (!selectedClassId || !selectedDate) return [];

    const key = `${selectedDate}_${selectedClassId}`;
    const record = attendance[key];
    const studentsInClass = students.filter((s) => s.classId === selectedClassId);

    return studentsInClass.map((student) => ({
      student,
      status: record ? record[student.id] || 'A' : null,
    }));
  }, [selectedDate, selectedClassId, attendance, students]);

  const stats = useMemo(() => {
    const present = reportData.filter((r) => r.status === 'P').length;
    const absent = reportData.filter((r) => r.status === 'A').length;
    const leave = reportData.filter((r) => r.status === 'L').length;
    return { present, absent, leave, total: reportData.length };
  }, [reportData]);

  const hasRecord = useMemo(() => {
    if (!selectedClassId || !selectedDate) return false;
    const key = `${selectedDate}_${selectedClassId}`;
    return !!attendance[key];
  }, [selectedDate, selectedClassId, attendance]);

  function getClassName(classId) {
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : '—';
  }

  async function handleExport() {
    if (!selectedClassId) {
      Alert.alert('Select Class', 'Please select a class to export.');
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

    const studentsInClass = students.filter((s) => s.classId === selectedClassId);
    setExporting(true);
    try {
      await exportAttendanceXLSX(classObj, studentsInClass, attendance, allDates, settings.schoolName);
    } catch (e) {
      Alert.alert('Export Error', e.message || 'Failed to export Excel file.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={styles.root}>
      <Header title="Reports" onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <View style={styles.filtersCard}>
          <InputField
            label="Date (YYYY-MM-DD)"
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="2024-11-15"
            keyboardType="numbers-and-punctuation"
          />
          <View style={{ zIndex: 10 }}>
            <PickerRow
              label="Class"
              value={selectedClassId}
              options={classOptions}
              onSelect={setSelectedClassId}
            />
          </View>
        </View>

        {/* No class selected */}
        {!selectedClassId ? (
          <EmptyState
            icon="📊"
            title="Select a class"
            subtitle="Choose a class and date to view the attendance report."
          />
        ) : !hasRecord ? (
          <EmptyState
            icon="📋"
            title="No record for this date"
            subtitle={`No attendance was taken for ${getClassName(selectedClassId)} on ${selectedDate}.`}
            actionLabel="Take Attendance"
            onAction={() =>
              router.push({
                pathname: '/attendance',
                params: { classId: selectedClassId },
              })
            }
          />
        ) : (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { borderTopColor: COLORS.presentBg }]}>
                <Text style={[styles.statVal, { color: COLORS.presentBg }]}>
                  {stats.present}
                </Text>
                <Text style={styles.statLabel}>Present</Text>
                {stats.total > 0 && (
                  <Text style={styles.statPct}>
                    {((stats.present / stats.total) * 100).toFixed(0)}%
                  </Text>
                )}
              </View>
              <View style={[styles.statBox, { borderTopColor: COLORS.absentBg }]}>
                <Text style={[styles.statVal, { color: COLORS.absentBg }]}>
                  {stats.absent}
                </Text>
                <Text style={styles.statLabel}>Absent</Text>
                {stats.total > 0 && (
                  <Text style={styles.statPct}>
                    {((stats.absent / stats.total) * 100).toFixed(0)}%
                  </Text>
                )}
              </View>
              <View style={[styles.statBox, { borderTopColor: COLORS.leaveBg }]}>
                <Text style={[styles.statVal, { color: COLORS.leaveBg }]}>
                  {stats.leave}
                </Text>
                <Text style={styles.statLabel}>Leave</Text>
                {stats.total > 0 && (
                  <Text style={styles.statPct}>
                    {((stats.leave / stats.total) * 100).toFixed(0)}%
                  </Text>
                )}
              </View>
            </View>

            {/* Student List */}
            <View style={styles.listCard}>
              <Text style={styles.listHeader}>
                {getClassName(selectedClassId)} — {selectedDate}
              </Text>
              {reportData.map(({ student, status }, idx) => (
                <View key={student.id} style={styles.reportRow}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowIdx}>{idx + 1}.</Text>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowName}>{student.name}</Text>
                      <Text style={styles.rowReg}>{student.reg}</Text>
                    </View>
                  </View>
                  <StatusBadge status={status || 'A'} />
                </View>
              ))}
            </View>

            {/* Export Button */}
            <PrimaryBtn
              label="⬇ Export Report (Excel)"
              onPress={handleExport}
              loading={exporting}
              color={COLORS.secondary}
              style={styles.exportBtn}
            />
          </>
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
  filtersCard: {
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
  statsRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    alignItems: 'center',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statVal: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statPct: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
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
  listHeader: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: SIZES.sm,
  },
  rowIdx: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    width: 22,
    flexShrink: 0,
  },
  rowInfo: { flex: 1 },
  rowName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rowReg: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  exportBtn: {
    marginBottom: SIZES.md,
  },
});
