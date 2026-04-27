import { CATEGORY_COLORS } from '../../src/domain/category-colors';

describe('CATEGORY_COLORS', () => {
  it('has exactly 8 entries', () => {
    expect(CATEGORY_COLORS).toHaveLength(8);
  });

  it('every entry has a label and a hex color', () => {
    for (const color of CATEGORY_COLORS) {
      expect(typeof color.label).toBe('string');
      expect(color.label.length).toBeGreaterThan(0);
      expect(color.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('all hex values are unique', () => {
    const hexes = CATEGORY_COLORS.map(c => c.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it('all labels are unique', () => {
    const labels = CATEGORY_COLORS.map(c => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
