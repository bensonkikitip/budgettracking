/**
 * App routing structure guard tests.
 *
 * Regression for: "Unable to determine the production URL...global 'location'
 * variable is not defined" crash when tapping "How do I export a CSV?" link.
 *
 * Root cause: app/help/csv-guide.tsx lived in a subdirectory that had no
 * _layout.tsx. Expo Router generates async (lazy) requires for route segments
 * in layout-less subdirectories. In production native builds there is no Metro
 * dev server, so the runtime chunk-URL resolver reads window.location (a web
 * API, undefined in React Native) and throws.
 *
 * Fix: moved csv-guide.tsx to app/ root so it is bundled eagerly.
 *
 * These tests ensure:
 *   1. The problematic file/directory no longer exists.
 *   2. The fixed file is in the right place.
 *   3. Any NEW subdirectory under app/ that contains screen files also has a
 *      _layout.tsx (prevents the same class of bug from being re-introduced).
 *
 * Known layout-less subdirectories that are intentionally layout-less:
 *   - app/account/[id]/  — nested under app/account/ which also has no layout;
 *     Expo Router inherits the root layout for these and they work correctly
 *     because they are eagerly registered at app start via the root Stack.
 *
 * The rule we enforce: a direct child directory of app/ that contains .tsx
 * files MUST either:
 *   a) have its own _layout.tsx, OR
 *   b) be in the KNOWN_LAYOUTLESS_DIRS allowlist below (manually verified safe).
 */

import * as fs from 'fs';
import * as path from 'path';

const APP_DIR = path.resolve(__dirname, '../app');

/**
 * Direct subdirectories of app/ that are intentionally layout-less.
 * Each entry here has been manually verified to not trigger async requires.
 * account/ and category/ work because their screens are flat siblings of
 * other root screens — Expo Router registers them eagerly via the root Stack.
 */
const KNOWN_LAYOUTLESS_DIRS = new Set(['account', 'category']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDirectChildDirs(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);
}

function dirContainsScreens(dir: string): boolean {
  return fs.readdirSync(dir).some(f => f.endsWith('.tsx') && f !== '_layout.tsx');
}

function hasLayout(dir: string): boolean {
  return fs.existsSync(path.join(dir, '_layout.tsx'));
}

// ---------------------------------------------------------------------------
// Regression tests for the csv-guide move
// ---------------------------------------------------------------------------

describe('csv-guide route location (regression: async-require crash in production)', () => {
  it('app/help/ directory does not exist', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'help'))).toBe(false);
  });

  it('app/help/csv-guide.tsx does not exist', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'help', 'csv-guide.tsx'))).toBe(false);
  });

  it('app/csv-guide.tsx exists at root level (eagerly bundled)', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'csv-guide.tsx'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Structural guard: new subdirectories must have _layout.tsx
// ---------------------------------------------------------------------------

describe('app/ subdirectory structure guard (prevents async-require crashes)', () => {
  it('every direct child directory of app/ with screens has a _layout.tsx OR is in the known-safe allowlist', () => {
    const childDirs = getDirectChildDirs(APP_DIR);
    const violations: string[] = [];

    for (const name of childDirs) {
      const fullPath = path.join(APP_DIR, name);
      if (!dirContainsScreens(fullPath)) continue;        // empty or no .tsx files — skip
      if (KNOWN_LAYOUTLESS_DIRS.has(name)) continue;      // explicitly allowlisted
      if (hasLayout(fullPath)) continue;                  // has its own _layout.tsx ✓

      violations.push(
        `app/${name}/ contains screen files but has no _layout.tsx and is not in KNOWN_LAYOUTLESS_DIRS. ` +
        `This will cause async-require crashes in production native builds. ` +
        `Either add a _layout.tsx or add "${name}" to KNOWN_LAYOUTLESS_DIRS in tests/app-structure.test.ts.`
      );
    }

    expect(violations).toEqual([]);
  });
});
