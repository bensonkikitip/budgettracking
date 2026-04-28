// Stub for expo-file-system/legacy — native filesystem APIs not available in Jest.
export const documentDirectory = '/tmp/test-app/';
export const getInfoAsync      = () => Promise.resolve({ exists: false });
export const readAsStringAsync = () => Promise.resolve('{}');
export const writeAsStringAsync = () => Promise.resolve();
