# EduAttend SDK 58 — setup from scratch

Extract `EduAttend-SDK58.zip`, then open a terminal inside the `EduAttend-main` folder. Use Node.js **22.13 or later**.

```bash
node -v
npm install
npx expo install --fix
npx expo-doctor
npm test
npx expo start --offline --clear
```

The zip has **no `package-lock.json`** because the previous lockfile was for SDK 56. `npm install` creates the SDK 58 lockfile, which you should preserve for future `npm ci` installs. npm installation itself requires registry access; only the `expo start` command above is offline.

Connect your Android phone and laptop to the same Wi-Fi, then open this project with Expo Go **SDK 58**. Test class creation, adding students, attendance saving, Excel exports and restore on the phone.

**Keep a copy of your old project and protect your existing attendance data.** Do not uninstall your installed production EduAttend if you need to migrate its private records. An in-place update needs the original Android package name and signing key.

See [UPGRADE_TO_SDK58.md](UPGRADE_TO_SDK58.md) for more detail and [README.md](README.md) for the CSV storage and XLSX backup workflow.
