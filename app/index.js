// FILE: app/index.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/context/AppContext';
import { Logo, FadeInUp } from '../src/components/UI';
import { COLORS, SIZES, FONTS, GRADIENTS } from '../src/utils/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { classes, students, todayAttCount, settings } = useApp();

  const navCards = [
    {
      icon: '🏫',
      label: 'Classes',
      subtitle: 'Manage your class sections',
      route: '/classes',
      gradient: GRADIENTS.cardTeal,
    },
    {
      icon: '👨‍🎓',
      label: 'Students',
      subtitle: 'View and manage students',
      route: '/students',
      gradient: GRADIENTS.cardBlue,
    },
    {
      icon: '✅',
      label: 'Take Attendance',
      subtitle: "Mark today's attendance",
      route: '/attendance',
      gradient: GRADIENTS.cardTeal,
    },
    {
      icon: '📊',
      label: 'Reports',
      subtitle: 'Attendance summary & analytics',
      route: '/reports',
      gradient: GRADIENTS.cardGold,
    },
    {
      icon: '💾',
      label: 'Backup / Restore',
      subtitle: 'Export, import, and manage data',
      route: '/backup',
      gradient: GRADIENTS.cardRose,
    },
  ];

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Logo size={52} />
          <View style={styles.headerTitles}>
            <Text style={styles.appName}>EduAttend</Text>
            <Text style={styles.appTagline} numberOfLines={1}>
              {settings.schoolName || 'Attendance Manager'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/settings')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <FadeInUp delay={0}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>
                {classes.length}
              </Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.secondary }]}>
                {students.length}
              </Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {todayAttCount}
              </Text>
              <Text style={styles.statLabel}>Today's Att.</Text>
            </View>
          </View>
        </FadeInUp>

        {/* Nav Cards */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        {navCards.map((card, idx) => (
          <FadeInUp key={card.route} delay={60 + idx * 50}>
            <TouchableOpacity
              onPress={() => router.push(card.route)}
              activeOpacity={0.85}
              style={styles.navCardWrap}
            >
              <View style={styles.navCard}>
                <LinearGradient
                  colors={card.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.navAccent}
                />
                <View style={styles.navIconWrap}>
                  <Text style={styles.navIcon}>{card.icon}</Text>
                </View>
                <View style={styles.navInfo}>
                  <Text style={styles.navLabel}>{card.label}</Text>
                  <Text style={styles.navSub}>{card.subtitle}</Text>
                </View>
                <Text style={styles.navArrow}>›</Text>
              </View>
            </TouchableOpacity>
          </FadeInUp>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>EduAttend v1.0 • Built for Teachers</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingBottom: SIZES.xxl,
    paddingHorizontal: SIZES.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  appName: {
    color: '#fff',
    fontSize: FONTS.sizes.xxl,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appTagline: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.xxxl,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.lg,
    marginBottom: SIZES.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.sm,
  },
  statValue: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SIZES.md,
  },
  navCardWrap: {
    marginBottom: SIZES.sm,
    borderRadius: SIZES.radius,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  navCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.lg,
    paddingHorizontal: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  navAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 5,
  },
  navIconWrap: {
    marginRight: SIZES.md,
  },
  navIcon: {
    fontSize: 28,
  },
  navInfo: {
    flex: 1,
  },
  navLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  navSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  navArrow: {
    fontSize: 26,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  footer: {
    alignItems: 'center',
    marginTop: SIZES.xl,
    paddingTop: SIZES.lg,
  },
  footerText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
});
