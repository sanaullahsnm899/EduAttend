// FILE: app/backup.js
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
import { File } from 'expo-file-system';
import { useApp } from '../src/context/AppContext';
import { Header, PrimaryBtn, Card } from '../src/components/UI';
import { exportBackupJSON, exportAllXLSX } from '../src/utils/xlsxExport';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';

export default function BackupScreen() {
  const router = useRouter();
  const { classes, students, attendance, editHistory, settings, updateSettings, restoreData, clearAll } = useApp();

  const [exporting, setExporting] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleDownloadBackup() {
    setExporting(true);
    try {
      await exportBackupJSON(classes, students, attendance, editHistory, settings);
    } catch (e) {
      Alert.alert('Export Error', e.message || 'Failed to export backup.');
    } finally {
      setExporting(false);
    }
  }

  async function handleRestoreBackup() {
    try {
      // File.pickFileAsync (the modern expo-file-system API) opens the
      // system picker and returns a real File instance backed by the
      // current native bridge. Unlike expo-document-picker's URI +
      // expo-file-system/legacy readAsStringAsync combo, this avoids the
      // known Android bug where cache-copied content:// URIs are
      // intermittently "not readable" by the legacy bridge — File.text()
      const pickResult = await File.pickFileAsync({
        mimeTypes: ['application/json', '*/*'],
      });

      if (pickResult.canceled || !pickResult.result) {
        return;
      }

      const file = pickResult.result;

      // Validate it looks like a JSON file by extension (mimeTypes above
      // already narrows the system picker, but Android file providers
      // don't always report a clean mimeType, so we also check the URI).
      const looksLikeJSON = (file.uri || '').toLowerCase().endsWith('.json');

      setRestoring(true);

      let content;
      try {
        content = await file.text();
      } catch (readErr) {
        Alert.alert(
          'Read Error',
          'Could not read the selected file: ' + (readErr.message || 'unknown error')
        );
        setRestoring(false);
        return;
      }

      if (!content) {
        Alert.alert(
          'Read Error',
          'The selected file appears to be empty or unreadable. Please try a different file.'
        );
        setRestoring(false);
        return;
      }

      let data;
      try {
        data = JSON.parse(content);
      } catch (parseErr) {
        Alert.alert(
          'Invalid File',
          looksLikeJSON
            ? 'This .json file could not be parsed. It may be corrupted.'
            : 'The selected file is not valid JSON. Please select a proper EduAttend backup file.'
        );
        setRestoring(false);
        return;
      }

      if (!data.classes || !data.students) {
        Alert.alert(
          'Invalid Backup',
          'This file does not appear to be an EduAttend backup. Missing required fields (classes / students).'
        );
        setRestoring(false);
        return;
      }

      Alert.alert(
        'Confirm Restore',
        `This will replace ALL current data with the backup.\nThis action cannot be undone.\n\nBackup contains:\n• ${data.classes.length} classes\n• ${data.students.length} students\n• ${Object.keys(data.attendance || {}).length} attendance records`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setRestoring(false),
          },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreData(data);
                Alert.alert('✅ Success', 'Backup restored successfully!');
              } catch (e) {
                Alert.alert('Restore Error', 'Failed to restore data: ' + e.message);
              } finally {
                setRestoring(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not open file picker: ' + e.message);
      setRestoring(false);
    }
  }

  async function handleExportAllCSV() {
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
              'Are you absolutely sure? All data will be lost forever.',
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
          <Text style={styles.sectionTitle}>📦 Current Data Summary</Text>
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

        {/* Settings shortcut */}
        <TouchableOpacity
          style={styles.settingsShortcut}
          onPress={() => router.push('/settings')}
          activeOpacity={0.8}
        >
          <Text style={styles.settingsShortcutIcon}>🏫</Text>
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
          <Text style={styles.sectionHeader}>💾 BACKUP</Text>
          <Card style={styles.actionCard} accent="cardTeal">
            <Text style={styles.actionTitle}>⬇ Download Backup (.json)</Text>
            <Text style={styles.actionDesc}>
              Export all your data as a JSON file. Save it somewhere safe — you
              can restore it any time from this screen.
            </Text>
            <PrimaryBtn
              label="⬇ Download Backup (.json)"
              onPress={handleDownloadBackup}
              loading={exporting}
              style={{ marginTop: SIZES.sm }}
            />
          </Card>
        </View>

        {/* Restore Section */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionHeader}>⬆ RESTORE</Text>
          <Card style={styles.actionCard} accent="cardBlue">
            <Text style={styles.actionTitle}>⬆ Restore from Backup</Text>
            <Text style={styles.actionDesc}>
              Select a previously exported EduAttend <Text style={styles.bold}>.json</Text> backup
              file. Browse to where you saved it (Downloads, Drive, etc.).
              Your current data will be fully replaced.
            </Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                💡 Tip: If you shared the file to Google Drive, tap Drive in the
                file picker. If you saved to Downloads, tap the ☰ menu → Downloads.
              </Text>
            </View>
            <PrimaryBtn
              label="⬆ Restore from Backup"
              onPress={handleRestoreBackup}
              loading={restoring}
              color={COLORS.secondary}
              style={{ marginTop: SIZES.sm }}
            />
          </Card>
        </View>

        {/* Export Excel Section */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionHeader}>📤 EXPORT</Text>
          <Card style={styles.actionCard} accent="cardGold">
            <Text style={styles.actionTitle}>📋 Export All Classes (Excel)</Text>
            <Text style={styles.actionDesc}>
              Export a complete attendance register for all classes and all
              dates as a single .xlsx file — one sheet per class, formatted
              exactly like the official printed register sheet with live
              Att / Att% formulas.
            </Text>
            <PrimaryBtn
              label="📋 Export All Classes (Excel)"
              onPress={handleExportAllCSV}
              loading={exportingCSV}
              color="#444"
              style={{ marginTop: SIZES.sm }}
            />
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.actionSection}>
          <Text style={[styles.sectionHeader, { color: COLORS.danger }]}>
            ⚠️ DANGER ZONE
          </Text>
          <Card style={[styles.actionCard, styles.dangerCard]} accent="cardRose">
            <Text style={styles.actionTitle}>🗑️ Clear All Data</Text>
            <Text style={styles.actionDesc}>
              Permanently delete all classes, students, attendance records, and
              edit history. Download a backup first if needed.
            </Text>
            <PrimaryBtn
              label="🗑️ Clear All Data"
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
    fontSize: FONTS.sizes.xs,
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
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsShortcutIcon: {
    fontSize: 22,
    marginRight: SIZES.md,
  },
  settingsShortcutTitle: {
    fontSize: FONTS.sizes.xs,
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
