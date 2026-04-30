// In-memory expo-file-system/legacy mock. Captures writes so backup tests can
// inspect what was written (and restore it on the read side) without touching disk.
const _files = new Map<string, string>();

export const documentDirectory = '/tmp/test-app/';

export const getInfoAsync = async (path: string) => {
  const content = _files.get(path);
  if (content === undefined) return { exists: false } as const;
  return { exists: true, size: content.length, isDirectory: false } as const;
};

export const readAsStringAsync = async (path: string): Promise<string> => {
  const content = _files.get(path);
  if (content === undefined) {
    throw new Error(`File not found: ${path}`);
  }
  return content;
};

export const writeAsStringAsync = async (path: string, contents: string): Promise<void> => {
  _files.set(path, contents);
};

export const deleteAsync = async (path: string): Promise<void> => {
  _files.delete(path);
};

/** Test-only: clear the in-memory filesystem between tests. */
export function _resetMockFs(): void {
  _files.clear();
}

/** Test-only: read the raw map (handy for assertions). */
export function _peekMockFs(): Map<string, string> {
  return _files;
}
