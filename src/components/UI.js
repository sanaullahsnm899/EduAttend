// FILE: src/components/UI.js
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS, GRADIENTS } from '../utils/theme';

// ── Logo ─────────────────────────────────────────────────────────────────────
// The app's signature mark: a clipboard-with-checkmark badge on a gradient
// rounded-square, matching assets/icon.png. Used in headers and the home
// screen — built from primitives (not an <Image>) so it stays crisp at any
// size and recolors instantly if the brand palette ever changes.
export function Logo({ size = 44 }) {
  const checkSize = size * 0.42;
  return (
    <LinearGradient
      colors={GRADIENTS.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        logoStyles.wrap,
        { width: size, height: size, borderRadius: size * 0.28 },
      ]}
    >
      <View
        style={[
          logoStyles.board,
          {
            width: size * 0.5,
            height: size * 0.66,
            borderRadius: size * 0.08,
          },
        ]}
      >
        <View style={[logoStyles.clip, { width: size * 0.26, height: size * 0.1 }]} />
      </View>
      <LinearGradient
        colors={GRADIENTS.cardTeal}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          logoStyles.badge,
          {
            width: checkSize,
            height: checkSize,
            borderRadius: checkSize / 2,
            borderWidth: size * 0.045,
          },
        ]}
      >
        <Text style={[logoStyles.check, { fontSize: checkSize * 0.55 }]}>✓</Text>
      </LinearGradient>
    </LinearGradient>
  );
}

const logoStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    backgroundColor: '#f4fbf8',
    alignItems: 'center',
    paddingTop: 4,
  },
  clip: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 4,
    marginTop: -6,
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#fff',
  },
  check: {
    color: '#fff',
    fontWeight: '900',
  },
});

// ── Header ───────────────────────────────────────────────────────────────────
export function Header({ title, onBack, rightComponent }) {
  return (
    <LinearGradient
      colors={GRADIENTS.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={headerStyles.container}
    >
      <View style={headerStyles.left}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={headerStyles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={headerStyles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={headerStyles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {rightComponent && (
        <View style={headerStyles.right}>{rightComponent}</View>
      )}
    </LinearGradient>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingBottom: SIZES.lg,
    paddingHorizontal: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: SIZES.md,
    padding: SIZES.xs,
  },
  backIcon: {
    color: '#fff',
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    flex: 1,
  },
  right: {
    marginLeft: SIZES.sm,
  },
});

// ── PrimaryBtn ────────────────────────────────────────────────────────────────
// Gradient-filled by default. Pass `color` as a hex string for a flat-color
// button (used for neutral/cancel actions), or rely on the default brand
// gradient. Internally maps known flat colors to their gradient equivalents
// so existing call sites (color={COLORS.secondary} etc.) upgrade for free.
// Includes a subtle scale-down press animation for tactile feedback.
const COLOR_TO_GRADIENT = {
  [COLORS.secondary]: GRADIENTS.secondary,
  [COLORS.danger]: GRADIENTS.danger,
  [COLORS.primary]: GRADIENTS.brand,
};

function usePressScale(toValue = 0.96) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return { scale, onPressIn, onPressOut };
}

export function PrimaryBtn({ label, onPress, color, textColor, style, disabled, loading }) {
  const tc = textColor || '#fff';
  const isFlat = color && !COLOR_TO_GRADIENT[color];
  const gradientColors = !isFlat ? (COLOR_TO_GRADIENT[color] || GRADIENTS.brand) : null;
  const { scale, onPressIn, onPressOut } = usePressScale();
  const isDisabled = disabled || loading;

  if (isFlat) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={isDisabled ? undefined : onPressIn}
        onPressOut={isDisabled ? undefined : onPressOut}
        disabled={isDisabled}
      >
        <Animated.View
          style={[
            btnStyles.btn,
            { backgroundColor: color, transform: [{ scale }] },
            isDisabled && btnStyles.disabled,
            style,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={tc} size="small" />
          ) : (
            <Text style={[btnStyles.label, { color: tc }]}>{label}</Text>
          )}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={isDisabled ? undefined : onPressIn}
      onPressOut={isDisabled ? undefined : onPressOut}
      disabled={isDisabled}
      style={[isDisabled && btnStyles.disabled, style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={btnStyles.btn}
        >
          {loading ? (
            <ActivityIndicator color={tc} size="small" />
          ) : (
            <Text style={[btnStyles.label, { color: tc }]}>{label}</Text>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const btnStyles = StyleSheet.create({
  btn: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.xl,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  disabled: { opacity: 0.5 },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

// ── InputField ────────────────────────────────────────────────────────────────
export function InputField({ label, value, onChangeText, placeholder, keyboardType, style }) {
  return (
    <View style={inputStyles.wrapper}>
      {label ? <Text style={inputStyles.label}>{label}</Text> : null}
      <TextInput
        style={[inputStyles.input, style]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor={COLORS.textSecondary}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="sentences"
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: SIZES.md },
  label: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
  },
});

// ── FadeInUp ──────────────────────────────────────────────────────────────────
// Lightweight entrance animation for list items — fade + slight rise.
// Pass `delay` (ms) to stagger items in a list for a more orchestrated feel.
// Capped at a low max delay so long lists don't feel sluggish to populate.
export function FadeInUp({ children, delay = 0, style }) {
  const anim = React.useRef(new Animated.Value(0)).current;
  const cappedDelay = Math.min(delay, 240);

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 360,
      delay: cappedDelay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
// `accent` (optional): a GRADIENTS key (e.g. 'cardTeal') draws a 4px gradient
// strip along the top edge. Used sparingly — one accented card per section,
// not on every card, so it stays a signal rather than noise.
export function Card({ children, style, accent }) {
  const gradientColors = accent && GRADIENTS[accent] ? GRADIENTS[accent] : null;
  return (
    <View style={[cardStyles.card, style]}>
      {gradientColors && (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cardStyles.accentStrip}
        />
      )}
      <View style={gradientColors ? cardStyles.contentWithAccent : null}>
        {children}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  accentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  contentWithAccent: {
    paddingTop: SIZES.xs,
  },
});

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, size, bg }) {
  const initials = name
    ? name
        .trim()
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '?';
  const sz = size || 40;
  const backgroundColor = bg || COLORS.primary;
  return (
    <View
      style={[
        avatarStyles.circle,
        { width: sz, height: sz, borderRadius: sz / 2, backgroundColor },
      ]}
    >
      <Text style={[avatarStyles.text, { fontSize: sz * 0.35 }]}>
        {initials}
      </Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

// ── AttBtn ────────────────────────────────────────────────────────────────────
const ATT_BTN_GRADIENTS = {
  P: ['#3a7a1a', COLORS.presentBg],
  A: ['#a83838', COLORS.absentBg],
  L: GRADIENTS.gold,
};

export function AttBtn({ status, type, onPress, locked }) {
  const configs = {
    P: { text: COLORS.presentText, label: 'P' },
    A: { text: COLORS.absentText, label: 'A' },
    L: { text: '#4a3000', label: 'L' },
  };

  const active = status === type;
  const cfg = configs[type];
  const pop = React.useRef(new Animated.Value(1)).current;
  const wasActive = React.useRef(active);

  React.useEffect(() => {
    // Only pop when this button transitions TO active (a real selection
    // event), not on every re-render or when other buttons in the row change.
    if (active && !wasActive.current) {
      pop.setValue(0.78);
      Animated.spring(pop, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 14,
      }).start();
    }
    wasActive.current = active;
  }, [active]);

  if (active) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={locked}
        activeOpacity={0.7}
        style={locked && attBtnStyles.locked}
        pointerEvents={locked ? 'none' : 'auto'}
      >
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <LinearGradient
            colors={ATT_BTN_GRADIENTS[type]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.3, y: 1 }}
            style={attBtnStyles.btn}
          >
            <Text style={[attBtnStyles.label, { color: cfg.text, fontWeight: 'bold' }]}>
              {cfg.label}
            </Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={locked}
      activeOpacity={0.7}
      style={[attBtnStyles.btn, attBtnStyles.inactive, locked && attBtnStyles.locked]}
      pointerEvents={locked ? 'none' : 'auto'}
    >
      <Text style={[attBtnStyles.label, attBtnStyles.inactiveLabel]}>{cfg.label}</Text>
    </TouchableOpacity>
  );
}

const attBtnStyles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  inactive: {
    backgroundColor: '#e8e8e8',
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  locked: {
    opacity: 0.35,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
  },
  inactiveLabel: {
    color: COLORS.textSecondary,
  },
});

// ── StatusBadge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const configs = {
    P: { bg: COLORS.presentBg, text: COLORS.presentText, label: 'Present' },
    A: { bg: COLORS.absentBg, text: COLORS.absentText, label: 'Absent' },
    L: { bg: COLORS.leaveBg, text: COLORS.leaveText, label: 'Leave' },
  };
  const cfg = configs[status] || { bg: COLORS.border, text: COLORS.textSecondary, label: status || '—' };

  return (
    <View style={[badgeStyles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[badgeStyles.label, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: 20,
  },
  label: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

// ── StatBox ───────────────────────────────────────────────────────────────────
export function StatBox({ label, value, color, icon }) {
  return (
    <View style={[statStyles.box, { borderLeftColor: color || COLORS.primary }]}>
      {icon ? <Text style={statStyles.icon}>{icon}</Text> : null}
      <Text style={[statStyles.value, { color: color || COLORS.primary }]}>
        {value}
      </Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    alignItems: 'center',
    borderLeftWidth: 4,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  icon: { fontSize: 20, marginBottom: 2 },
  value: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  label: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        emptyStyles.container,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={emptyStyles.iconBackdrop}>
        <Text style={emptyStyles.icon}>{icon || '📭'}</Text>
      </View>
      <Text style={emptyStyles.title}>{title || 'Nothing here yet'}</Text>
      {subtitle ? (
        <Text style={emptyStyles.subtitle}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={emptyStyles.actionBtn}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={emptyStyles.actionLabel}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xxxl * 1.5,
    paddingHorizontal: SIZES.xxl,
  },
  iconBackdrop: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.lg,
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: SIZES.xl,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radius,
  },
  actionLabel: {
    color: '#fff',
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
  },
});

// ── Chip ──────────────────────────────────────────────────────────────────────
export function Chip({ label, color, textColor, style }) {
  return (
    <View
      style={[
        chipStyles.chip,
        { backgroundColor: color || COLORS.primaryLight },
        style,
      ]}
    >
      <Text
        style={[
          chipStyles.label,
          { color: textColor || COLORS.primaryDark },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 3,
    borderRadius: 20,
  },
  label: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '600',
  },
});

// ── BottomSheetModal ──────────────────────────────────────────────────────────
export function BottomSheetModal({ visible, onClose, title, children }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={modalStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.handle} />
        <View style={modalStyles.titleRow}>
          <Text style={modalStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={modalStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={modalStyles.content}
        >
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xxxl,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SIZES.sm,
    marginBottom: SIZES.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  content: {
    paddingBottom: SIZES.lg,
  },
});

// ── EditHistoryItem ───────────────────────────────────────────────────────────
export function EditHistoryItem({ entry }) {
  const statusColors = {
    P: COLORS.presentBg,
    A: COLORS.absentBg,
    L: COLORS.leaveBg,
  };
  const statusLabels = { P: 'P', A: 'A', L: 'L' };

  const fromColor = statusColors[entry.from] || COLORS.border;
  const toColor = statusColors[entry.to] || COLORS.border;
  const dotColor = toColor;

  return (
    <View style={editHistStyles.row}>
      <View style={[editHistStyles.dot, { backgroundColor: dotColor }]} />
      <View style={editHistStyles.content}>
        <View style={editHistStyles.nameRow}>
          <Text style={editHistStyles.studentName}>{entry.student}</Text>
          <View style={editHistStyles.badges}>
            <View style={[editHistStyles.smallBadge, { backgroundColor: fromColor }]}>
              <Text style={editHistStyles.badgeText}>{statusLabels[entry.from] || entry.from}</Text>
            </View>
            <Text style={editHistStyles.arrow}> → </Text>
            <View style={[editHistStyles.smallBadge, { backgroundColor: toColor }]}>
              <Text style={editHistStyles.badgeText}>{statusLabels[entry.to] || entry.to}</Text>
            </View>
          </View>
        </View>
        <Text style={editHistStyles.time}>{entry.time}</Text>
      </View>
    </View>
  );
}

const editHistStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: SIZES.sm,
    flexShrink: 0,
  },
  content: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  studentName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    flexShrink: 1,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SIZES.sm,
  },
  smallBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: FONTS.sizes.xs,
    fontWeight: 'bold',
  },
  arrow: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  time: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

// ── PickerRow (simple dropdown replacement) ───────────────────────────────────
// Renders the option list INLINE (not absolutely positioned) so it works
// correctly inside Modal > ScrollView without any clipping issues.
export function PickerRow({ label, value, options, onSelect }) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={pickerStyles.wrapper}>
      {label ? <Text style={pickerStyles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[pickerStyles.trigger, open && pickerStyles.triggerOpen]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Text style={pickerStyles.triggerText}>
          {selected ? selected.label : 'Select...'}
        </Text>
        <Text style={pickerStyles.arrow}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={pickerStyles.inlineList}>
          {options.map((opt) => (
            <TouchableOpacity
              key={String(opt.value)}
              style={[
                pickerStyles.option,
                opt.value === value && pickerStyles.optionSelected,
              ]}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  pickerStyles.optionText,
                  opt.value === value && pickerStyles.optionTextSelected,
                ]}
              >
                {opt.value === value ? '✓  ' : '    '}
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrapper: { marginBottom: SIZES.md },
  label: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
    fontWeight: '600',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    minHeight: 44,
  },
  triggerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  triggerText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
  arrow: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  // Inline list — renders in normal flow, no absolute positioning
  inlineList: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.primary,
    borderBottomLeftRadius: SIZES.radiusSm,
    borderBottomRightRadius: SIZES.radiusSm,
    marginBottom: SIZES.xs,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  option: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  optionText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
  },
  optionTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
});
