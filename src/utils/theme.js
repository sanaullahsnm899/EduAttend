// FILE: src/utils/theme.js

export const COLORS = {
  primary: '#0d9e7a',
  primaryDark: '#085041',
  primaryLight: '#e1f5ee',
  secondary: '#185fa5',
  danger: '#a32d2d',
  warning: '#854f0b',
  success: '#27500a',
  background: '#f4f6f9',
  card: '#ffffff',
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  border: '#e0e0e0',
  shadow: '#00000018',

  // Attendance status colors
  presentBg: '#27500a',
  presentText: '#eaf3de',
  presentRow: '#f0faf5',

  absentBg: '#791f1f',
  absentText: '#fce8e8',
  absentRow: '#fff5f5',

  leaveBg: '#854f0b',
  leaveText: '#faeeda',
  leaveRow: '#fffbea',

  editedRow: '#fff8e1',
  editedBadgeBg: '#faeeda',
  editedBadgeText: '#854f0b',
};

// Gradient stop arrays — used with expo-linear-gradient's `colors` prop.
// Kept centralized so every header/card/button shares one consistent system.
export const GRADIENTS = {
  // Primary brand gradient — headers, primary buttons, logo mark
  brand: ['#0fb892', '#0d9e7a', '#085041'],
  brandSubtle: ['#e1f5ee', '#cdf0e3'],
  // Secondary (blue) actions — restore, info buttons
  secondary: ['#2a7bc4', '#185fa5'],
  // Danger actions
  danger: ['#c23e3e', '#8a2424'],
  // Warm gold accent — leave status, highlights, edited markers
  gold: ['#e8b84b', '#c9952c'],
  // Card top accent strips (used sparingly, one per screen section)
  cardTeal: ['#0fb892', '#0d9e7a'],
  cardBlue: ['#3a8fd0', '#185fa5'],
  cardGold: ['#f0c85f', '#c9952c'],
  cardRose: ['#c4504f', '#8a2424'],
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  radius: 10,
  radiusSm: 6,
  radiusLg: 16,
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 28,
  },
};
