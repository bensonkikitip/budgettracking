// Stub for expo-sqlite — only used in the Node/Jest test environment where the real native module isn't available.
export const openDatabaseAsync = () => Promise.resolve({});
export const SQLiteDatabase = class {};
