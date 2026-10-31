import { Text } from '../src/components/Typography';
// FILE: app/backup.js
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import { useApp } from '../src/context/AppContext';
import { Header, PrimaryBtn, Card } from '../src/components/UI';
import { exportAllXLSX } from '../src/utils/xlsxExport';
import { exportBackupXLSX, readBackupBase64 } from '../src/utils/workbookBackup';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';

export default function BackupScreen() {
  const router = useRouter();
  const { classes, students, attendance, editHistory, settings, updateSettings, restoreData, clearAll } = useApp();

  const [exporting, setExporting] = useState(false);
  const [exportingXLSX, setExportingCSV] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleDownloadBackup() {
    setExporting(true);
    try {
      await exportBackupXLSX(classes, students, attendance, editHistory, settings);
    } catch (e) {
      Alert.alert('Export Error', e.message || 'Failed to export Excel backup.');
    } finally {
      setExporting(false);
    }
  }

  async function handleRestoreBackup() {
    try {
      const result = await File.pickFileAsync({
        mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });
      if (result.canceled || !result.result) return;
      const file = result.result;
      if (file.size && file.size > 20 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Select an Excel backup smaller than 20 MB.');
        return;
      }
      setRestoring(true);
      const base64 = await file.base64();
      const data = readBackupBase64(base64);
      Alert.alert(
        'Restore Excel Backup?',
        `This will replace ALL saved records with the selected workbook.\n\n${data.classes.length} classes · ${data.students.length} students · ${Object.keys(data.attendance).length} attendance sessions\n\nExport a backup of your current data first.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setRestoring(false) },
          {
            text: 'Restore Data', style: 'destructive',
            onPress: async () => {
              try {
                await restoreData(data);
                Alert.alert('Restored', 'Your Excel backup is now saved as local CSV files.');
              } catch (e) {
                Alert.alert('Restore Failed', e.message || 'Could not save the restored files.');
              } finally { setRestoring(false); }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Invalid Backup', e.message || 'Could not read that Excel backup file.');
      setRestoring(false);
    }
  }

  async function handleExportAllXLSX() {
    setExportingCSV(true);
    try {
      await exportAllXLSX(classes, students, attendance, settings.schoolName);
    } catch (e) {
      Alert.alert('Export Error', e.message || 'Failed to export Excel file.');
    } finally {
      setExportingCSV(false);
    }
  }

  function handleClearAll() {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete ALL classes, students, attendance records, and edit history. This CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Clear Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? All data will be deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete All Data',
                  style: 'destructive',
                  onPress: async () => {
                    setClearing(true);
                    try {
                      await clearAll();
                      Alert.alert('Done', 'All data has been cleared.');
                    } catch (e) {
                      Alert.alert('Error', 'Failed to clear data.');
                    } finally {
                      setClearing(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  const totalAttRecords = Object.keys(attendance).length;
  const totalEditHistory = Object.keys(editHistory).reduce(
    (sum, k) => sum + (editHistory[k]?.length || 0),
    0
  );

  return (
    <View style={styles.root}>
      <Header title="Backup / Restore" onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Data Summary */}
        <Card style={styles.summaryCard} accent="cardTeal">
          <Text style={styles.sectionTitle}>Your data at a glance</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: COLORS.primary }]}>
                {classes.length}
              </Text>
              <Text style={styles.summaryLabel}>Classes</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: COLORS.secondary }]}>
                {students.length}
              </Text>
              <Text style={styles.summaryLabel}>Students</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: COLORS.success }]}>
                {totalAttRecords}
              </Text>
              <Text style={styles.summaryLabel}>Att. Records</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: COLORS.warning }]}>
                {totalEditHistory}
              </Text>
              <Text style={styles.summaryLabel}>Edits Logged</Text>
            </View>
          </View>
        </Card>

        <View style={styles.csvNote}>
          <Text style={styles.csvNoteTitle}>Saved as CSV · Ready for Excel</Text>
          <Text style={styles.csvNoteBody}>Edits are stored on this device as separate CSV files. Backups and attendance reports use XLSX.</Text>
        </View>

        {/* Settings shortcut */}
        <TouchableOpacity
          style={styles.settingsShortcut}
          onPress={() => router.push('/settings')}
          activeOpacity={0.8}
        >
          <Ionicons name="school-outline" size={22} color={COLORS.primaryDark} style={{marginRight:12}}/>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsShortcutTitle}>School Name</Text>
            <Text style={styles.settingsShortcutValue} numberOfLines={1}>
              {settings.schoolName || 'Not set — tap to add'}
            </Text>
          </View>
          <Text style={styles.settingsShortcutArrow}>›</Text>
        </TouchableOpacity>

        {/* Backup Section */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionHeader}>BACKUP · EXCEL</Text>
          <Card style={styles.actionCard} accent="cardTeal">
            <Text style={styles.actionTitle}>Download backup (.xlsx)</Text>
            <Text style={styles.actionDesc}>
              Save classes, students, attendance, edit history and settings in one Excel workbook. Keep a copy in Downloads or Drive.
            </Text>
            <PrimaryBtn
              label="Download backup (.xlsx)"
              onPress={handleDownloadBackup}
              loading={exporting}
              style={{ marginTop: SIZES.sm }}
            />
          </Card>
        </View>

        {/* Restore Section */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionHeader}>RESTORE · EXCEL</Text>
          <Card style={styles.actionCard} accent="cardBlue">
            <Text style={styles.actionTitle}>Restore Excel backup</Text>
            <Text style={styles.actionDesc}>
              Choose an EduAttend <Text style={styles.bold}>.xlsx</Text> backup from your files or Drive. Your current records will be replaced after confirmation.
            </Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                Tip: If you shared the file to Google Drive, tap Drive in the
                file picker. If you saved to Downloads, tap the menu → Downloads.
              </Text>
            </View>
            <PrimaryBtn
              label="Restore Excel backup"
              onPress={handleRestoreBackup}
              loading={restoring}
              color={COLORS.secondary}
              style={{ marginTop: SIZES.sm }}
            />
          </Card>
        </View>

        {/* Export Excel Section */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionHeader}>EXPORT</Text>
          <Card style={styles.actionCard} accent="cardGold">
            <Text style={styles.actionTitle}>Export all classes (Excel)</Text>
            <Text style={styles.actionDesc}>
              Export a complete attendance register for all classes and all
              dates as a single .xlsx file — one sheet per class, formatted
              exactly like the official printed register sheet with live
              Att / Att% formulas.
            </Text>
            <PrimaryBtn
              label="Export all classes (Excel)"
              onPress={handleExportAllXLSX}
              loading={exportingXLSX}
              color="#444"
              style={{ marginTop: SIZES.sm }}
            />
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.actionSection}>
          <Text style={[styles.sectionHeader, { color: COLORS.danger }]}>
            DANGER ZONE
          </Text>
          <Card style={[styles.actionCard, styles.dangerCard]} accent="cardRose">
            <Text style={styles.actionTitle}>Clear all data</Text>
            <Text style={styles.actionDesc}>
              Permanently remove local CSV records. Download an Excel backup first if needed.
            </Text>
            <PrimaryBtn
              label="Clear all data"
              onPress={handleClearAll}
              loading={clearing}
              color={COLORS.danger}
              style={{ marginTop: SIZES.sm }}
            />
          </Card>
        </View>

        <View style={{ height: SIZES.xxxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  csvNote: { backgroundColor: '#E7F6F1', borderWidth: 1, borderColor: '#C8EBE0', borderRadius: 16, padding: 16, marginBottom: 16 },
  csvNoteTitle: { fontSize: 14, fontWeight: '800', color: '#086C57', marginBottom: 5 },
  csvNoteBody: { fontSize: 12, lineHeight: 19, color: '#466E67' },
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.xxxl,
  },
  summaryCard: { marginBottom: SIZES.lg },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '900',
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionSection: { marginBottom: SIZES.lg },
  sectionHeader: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: SIZES.sm,
  },
  actionCard: { padding: SIZES.lg },
  dangerCard: {
    borderWidth: 1,
    borderColor: '#f0d0d0',
    backgroundColor: '#fffafa',
  },
  actionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  actionDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tipBox: {
    backgroundColor: '#fffbe6',
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    marginTop: SIZES.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#f0c040',
  },
  tipText: {
    fontSize: FONTS.sizes.xs,
    color: '#7a5800',
    lineHeight: 17,
  },
  settingsShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.025,
    shadowRadius: 12,
    elevation: 1,
  },
  settingsShortcutIcon: {
    fontSize: 22,
    marginRight: SIZES.md,
  },
  settingsShortcutTitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsShortcutValue: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: 1,
  },
  settingsShortcutArrow: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
});
