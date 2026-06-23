// FILE: src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function loadData(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`loadData(${key}) error:`, e);
    return null;
  }
}

export async function saveData(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`saveData(${key}) error:`, e);
  }
}

export async function clearData(preserveKeys = []) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const eduKeys = keys.filter(
      (k) => k.startsWith('eduattend_') && !preserveKeys.includes(k)
    );
    await AsyncStorage.multiRemove(eduKeys);
  } catch (e) {
    console.error('clearData error:', e);
  }
}
