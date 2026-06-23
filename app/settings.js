// FILE: app/settings.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/context/AppContext';
import { Header, PrimaryBtn, InputField, Card, Logo } from '../src/components/UI';
import { COLORS, SIZES, FONTS } from '../src/utils/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useApp();

  const [schoolName, setSchoolName] = useState(settings.schoolName || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSchoolName(settings.schoolName || '');
  }, [settings.schoolName]);

  async function handleSave() {
    const trimmed = schoolName.trim();
    if (!trimmed) {
      Alert.alert('School Name Required', 'Please enter a school or department name.');
      return;
    }
    setSaving(true);
    try {
      await updateSettings({ schoolName: trimmed });
      Alert.alert('Saved', 'Your school name has been updated. It will now appear at the top of every exported Excel register.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <Header title="Settings" onBack={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <Logo size={64} />
        </View>

        <Card accent="cardTeal" style={styles.card}>
          <Text style={styles.sectionTitle}>🏫 School / Institution</Text>
          <Text style={styles.sectionDesc}>
            This name appears at the top of every Excel attendance register
            you export — in place of a generic department title. Set it once
            and every export from now on will use it automatically.
          </Text>
          <InputField
            label="School or Department Name"
            value={schoolName}
            onChangeText={setSchoolName}
            placeholder="e.g. Greenwood High School"
          />
          <PrimaryBtn
            label="💾 Save School Name"
            onPress={handleSave}
            loading={saving}
            style={{ marginTop: SIZES.sm }}
          />
        </Card>

        <Card style={styles.previewCard}>
          <Text style={styles.previewLabel}>Preview — Excel register header</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {schoolName.trim() || 'My School'}
            </Text>
          </View>
        </Card>

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
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.xxxl,
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  card: { padding: SIZES.lg },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  sectionDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SIZES.lg,
  },
  previewCard: {
    backgroundColor: '#fafafa',
  },
  previewLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SIZES.sm,
  },
  previewBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});
