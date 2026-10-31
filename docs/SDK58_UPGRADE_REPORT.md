# EduAttend Expo SDK 58 upgrade report

Date: 2026-10-30

## Scope

Dependency and API compatibility update only. No new attendance features. Existing visual design and navigation remain unchanged. CSV storage, legacy AsyncStorage migration, XLSX reports and XLSX backup/restore remain in place.

## Source changes

- Expo SDK: `~56.0.0` → `~58.0.0`.
- React: `19.2.3` → `19.3.0`.
- React Native: `0.85.3` → `0.88.1`.
- Expo Router: `~56.2.11` → `~58.0.28`.
- Aligned document picker, filesystem, gradient, linking, sharing, splash screen, status bar, safe area and screens packages to the Expo SDK 58 reference.
- Removed `StatusBar backgroundColor` override to avoid depending on obsolete Android status-bar coloring behavior.
- Retained the compatible `expo-file-system/legacy` API for CSV files and XLSX output and `File` for picking an XLSX backup.
- Removed stale SDK 56 `package-lock.json`; must regenerate with `npm install` under Node >= 22.13.0.
- Removed the `legacy-peer-deps=true` npm setting; peer compatibility is no longer silently bypassed.

## Validation performed

- `npm test`: **PASS** (CSV record serialization, migration and persistence; XLSX worksheet schema using mock workbook utility; SDK configuration consistency).
- `node --check tests/verify-data.cjs`: **PASS**.
- `node --check tests/verify-sdk58.cjs`: **PASS**.
- Read-through of app imports: no React Native `InteractionManager`, removed root `Touchable`, or deep `react-native/Libraries/*` imports. StatusBar override removed.

## Not completed / required on the user's laptop

This execution environment could not resolve `registry.npmjs.org`, so package installation, native runtime verification, `expo-doctor`, Metro bundling and Android installation were not possible. The final npm dependency graph and security findings are **not yet verified**. Node-based tests do not verify real XLSX binary write/read or Android file permissions.

To complete verification:

```bash
npm install
npx expo install --fix
npx expo-doctor
npm test
npx expo start --offline --clear
```

After `npm install`, retain the new lockfile and run `npm audit --omit=dev` to review any production dependency advisories. Do **not** use `npm audit fix --force` without testing the SDK compatibility.

## Reference links

- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- https://expo.dev/changelog/sdk-58
- https://docs.expo.dev/versions/v58.0.0/
- https://docs.expo.dev/versions/v58.0.0/sdk/filesystem-legacy/
