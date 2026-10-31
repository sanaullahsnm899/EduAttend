# EduAttend — Expo SDK 58 Upgrade

This ZIP contains the original redesigned EduAttend screens and local CSV/XLSX data layer, with SDK 58 dependency versions and a small StatusBar compatibility change. It is **source code**, not an APK.

## What changed

- Expo SDK 56 → SDK 58; React Native 0.85 → 0.88; React 19.2 → 19.3.
- Expo Router, FileSystem, document picker, sharing, splash screen, status bar, linking, gradient and native screen packages aligned to the **SDK 58 reference**.
- Legacy file APIs stay imported from `expo-file-system/legacy`, which remains supported and is necessary for the existing CSV migration and XLSX sharing code.
- Removes the **SDK 56** `package-lock.json` to prevent accidentally installing an incompatible dependency graph. `npm install` regenerates it. Do not use `npm ci` before that.
- Removes the old `legacy-peer-deps=true` override so npm flags dependency conflicts instead of hiding them.
- Removes the Android status bar color override that is obsolete with modern edge-to-edge Android.

## Install on Ubuntu (new ZIP / clean folder)

1. **Back up your current project files and any attendance records on your phone before upgrading.** Do not uninstall the existing production app. Installing a new APK with a different signing key can prevent in-place migration; Expo Go development data also lives in separate project scopes.
2. Extract the ZIP to a **new directory**, open a terminal *inside* its `EduAttend-main` folder. Use Node.js **22.13 or newer** (`node -v`).
3. Run:

```bash
npm install
npx expo install --fix
npx expo-doctor
npm test
npx expo start --offline --clear
```

If `npx expo-doctor` cannot connect to the internet, run it when connected. Offline mode affects the Metro/Expo CLI online checks, **not** npm installation. npm needs a working npm registry connection to install SDK 58.

Connect the Android phone and laptop to the same Wi-Fi, then open Expo Go SDK 58 and scan the code.

### If updating your *existing* SDK 56 project directory instead

Make a copy first. Then replace it with this SDK 58 source and delete **only** old JS install artifacts before installing:

```bash
rm -rf node_modules .expo
rm -f package-lock.json
npm install
npx expo install --fix
npx expo-doctor
npm test
npx expo start --offline --clear
```

The regenerated `package-lock.json` should be committed to your repository **after** installing and verifying compatible dependencies. Once generated, subsequent clean installs can use `npm ci` again.

## Verify these phone workflows

- Launch Home and navigate through Classes, Students, Attendance, Reports, Settings and Backup.
- Create one disposable class and student; mark and save attendance. Quit/reopen and verify it remains saved in CSV-backed storage.
- Export an `.xlsx` report; open it in Excel or LibreOffice.
- Download a full `.xlsx` backup, confirm that it has six sheets, then restore it in the app.
- On a real existing installation, verify the old AsyncStorage records migrated into CSV files. **Do not uninstall the app to test migration**, since uninstalling normally erases application data.

## Limits of verification

The included Node-based tests verify data conversion and configuration. This build environment cannot reach the npm registry, so an SDK 58 `npm install`, `expo-doctor`, Metro bundle, Android APK build, and phone UI tests **have not been run here**. The upgrade package is prepared for these final steps on your Ubuntu computer, not certified as release-ready.

## Sources

- Expo upgrade guide: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- Expo SDK 58 release notes: https://expo.dev/changelog/sdk-58
- Expo SDK 58 reference: https://docs.expo.dev/versions/v58.0.0/
- Legacy Expo FileSystem API: https://docs.expo.dev/versions/v58.0.0/sdk/filesystem-legacy/
