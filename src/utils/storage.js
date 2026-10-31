// All persistent app data lives in editable CSV files, not JSON/AsyncStorage.
// The database transparently migrates older installations on first launch.
export { loadData, saveData, clearData, saveAllData, DB_ROOT } from './csvDatabase';
