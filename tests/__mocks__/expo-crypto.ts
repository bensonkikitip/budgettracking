// Stub for expo-crypto — only used in the Node/Jest test environment.
export const randomUUID = () => 'test-uuid-' + Math.random().toString(36).slice(2);
export const digestStringAsync = () => Promise.resolve('');
