const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const src = file => fs.readFileSync(path.join(root, file), 'utf8');
assert.match(pkg.dependencies.expo, /^~58\./);
assert.equal(pkg.dependencies.react, '19.3.0');
assert.match(pkg.dependencies['react-native'], /^0\.88\./);
assert.match(pkg.dependencies['expo-router'], /^~58\./);
for (const name of ['expo-file-system', 'expo-document-picker', 'expo-sharing', 'expo-splash-screen', 'expo-status-bar', 'expo-linking', 'expo-linear-gradient']) {
  assert.match(pkg.dependencies[name], /^~58\./, `${name} needs SDK 58 alignment`);
}
assert.equal(pkg.dependencies['@react-native-async-storage/async-storage'], '2.2.0');
assert.ok(Number(pkg.engines.node.match(/\d+/)[0]) >= 22);
assert.equal(config.expo.android.package, 'com.eduattend.app');
assert.ok(config.expo.plugins.some(x => x === 'expo-router'));
assert.match(src('src/utils/csvDatabase.js'), /from 'expo-file-system\/legacy'/);
assert.match(src('src/utils/xlsxExport.js'), /from 'expo-file-system\/legacy'/);
assert.match(src('src/utils/workbookBackup.js'), /from 'expo-file-system\/legacy'/);
assert.match(src('app/backup.js'), /from 'expo-file-system'/);
assert.doesNotMatch(src('app/_layout.js'), /<StatusBar[^>]*backgroundColor/);
if (fs.existsSync(path.join(root, 'package-lock.json'))) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  assert.match(lock.packages?.['']?.dependencies?.expo || '', /^~58\./, 'package-lock.json must target Expo SDK 58');
  assert.match(lock.packages?.['node_modules/expo']?.version || '', /^58\./, 'installed Expo must target SDK 58');
}
console.log('PASS: Expo SDK 58 package/config and FileSystem API compatibility checks.');
