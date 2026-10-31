/** All app copy uses bundled Inter (not the device's theme font). */
import React from 'react';
import { Text as NativeText, StyleSheet } from 'react-native';
const FAMILY = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};
function resolveFamily(weight) {
  const n = Number(weight);
  if (weight === 'bold' || (Number.isFinite(n) && n >= 700)) return FAMILY.bold;
  if (Number.isFinite(n) && n >= 600) return FAMILY.semibold;
  if (weight === '500' || (Number.isFinite(n) && n >= 500)) return FAMILY.medium;
  return FAMILY.regular;
}
export const Text = React.forwardRef(function EduText({ style, ...props }, ref) {
  const flat = StyleSheet.flatten(style) || {};
  return (
    <NativeText
      ref={ref}
      style={[{ fontFamily: resolveFamily(flat.fontWeight), includeFontPadding: false }, style, { fontWeight: 'normal' }]}
      {...props}
    />
  );
});
