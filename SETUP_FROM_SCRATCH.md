# EduAttend — Clean Dependency Setup (run these in order)

Run this from inside your project folder:
`~/My Projects/p6/EduAttend`

## 1. Wipe everything dependency-related

```bash
rm -rf node_modules
rm -f package-lock.json
rm -rf .expo
```

## 2. Tell npm to use legacy peer resolution for this project

Expo's CLI tooling (expo-router) pulls in some web-only packages
(`@expo/ui`, `vaul`, `@radix-ui/*`) with strict React peer-dependency
ranges that conflict with plain `npm install`. Expo's own install
commands handle this automatically, but plain `npm install` does not —
so we tell npm once, project-wide, to relax peer resolution:

```bash
echo "legacy-peer-deps=true" > .npmrc
```

This creates a `.npmrc` file in the project root. From this point on,
every `npm install` and `npx expo install` in this folder will use
`--legacy-peer-deps` automatically — no need to type the flag every time.

## 3. Replace package.json

Delete the contents of your `package.json` and replace it with the
`package.json` provided below (only `name`, `expo`, and `xlsx` are
manually pinned — everything else gets resolved by Expo itself in step 5).

## 4. Install only Expo + the two plain-JS libraries first

```bash
npm install expo@~56.0.0
npm install xlsx-js-style
```

## 5. Let Expo resolve every native module's correct version

This is the step that actually fixes "Native module is null" — it reads
your installed `expo` version and installs the EXACT matching version of
every other Expo/native package, instead of us guessing numbers by hand.

```bash
npx expo install expo-router expo-status-bar expo-file-system expo-sharing expo-document-picker @react-native-async-storage/async-storage react-native-safe-area-context react-native-screens react react-native
```

## 6. Run the fixer as a final safety net

```bash
npx expo install --fix
```

## 7. Clear caches and start fresh

```bash
npx expo start --clear
```

## 8. On your phone

Make sure Expo Go is updated to the latest version (Play Store → Expo Go → Update),
then scan the QR code.

---

### Why the ERESOLVE error happened

`expo-router@56.2.11` includes optional web-platform support, which pulls
in `@expo/ui` → `vaul` → `@radix-ui/react-*` packages. Those packages
pin a peer range of `react-dom@^19.2.7`, but Expo itself pins plain
`react@19.2.0`. Both are valid for React Native (the web-only packages
never actually run in your Android app) — npm just refuses to proceed by
default when any peer ranges disagree, even on packages you'll never use.
`legacy-peer-deps=true` tells npm "install anyway, like npm v6 did" —
which is exactly what `npx expo install` does internally on your behalf
normally, and is safe here since none of the conflicting web packages
affect the Android/Expo Go runtime.

### Why this fixes "Native module is null"

That error means the JS package version of `@react-native-async-storage/async-storage`
(or another native module) doesn't match the native binary that's actually
compiled into your installed Expo Go app. Hand-typing version numbers in
package.json (what we were doing before) causes exactly this kind of drift.
`npx expo install <package>` instead asks the Expo CLI itself — which knows
your exact SDK version — to pick the one correct version. That's the only
reliable way to keep everything in sync on Expo Go (no native rebuild needed).
