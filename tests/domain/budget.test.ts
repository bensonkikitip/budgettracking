import {
  splitYearTotal,
  computeYearTotal,
  applyPercentage,
  monthsInYear,
} from '../../src/domain/budget';

describe('splitYearTotal', () => {
  it('produces 12 values', () => {
    expect(splitYearTotal(12000)).toHaveLength(12);
  });

  it('values sum exactly to the input', () => {
    for (const total of [12000, 10000, 1, -6000, 0, 100, 99, -1]) {
      const parts = splitYearTotal(total);
      const sum = parts.reduce((a, b) => a + b, 0);
      expect(sum).toBe(total);
    }
  });

  it('spreads evenly when divisible by 12', () => {
    const parts = splitYearTotal(12000);
    expect(parts).toEqual(Array(12).fill(1000));
  });

  it('assigns the rounding remainder to December (last element)', () => {
    // 1000 / 12 = 83.33... → 83 per month × 11 = 913; last = 1000 - 913 = 87
    const parts = splitYearTotal(1000);
    expect(parts[11]).toBe(1000 - 83 * 11);
    expect(parts.slice(0, 11).every(v => v === 83)).toBe(true);
  });

  it('handles negative totals correctly (expense budgets)', () => {
    const parts = splitYearTotal(-6000);
    const sum = parts.reduce((a, b) => a + b, 0);
    expect(sum).toBe(-6000);
    expect(parts[0]).toBe(-500);
  });

  it('handles zero', () => {
    expect(splitYearTotal(0)).toEqual(Array(12).fill(0));
  });

  it('handles a total of 1 (all months 0 except December which gets 1)', () => {
    const parts = splitYearTotal(1);
    expect(parts.slice(0, 11).every(v => v === 0)).toBe(true);
    expect(parts[11]).toBe(1);
  });

  it('handles a total of -1', () => {
    const parts = splitYearTotal(-1);
    expect(parts.slice(0, 11).every(v => v === 0)).toBe(true);
    expect(parts[11]).toBe(-1);
  });
});

describe('computeYearTotal', () => {
  it('sums all 12 months for the given year', () => {
    const map = new Map([
      ['2026-01', -500],
      ['2026-02', -500],
      ['2026-12', -500],
    ]);
    expect(computeYearTotal(map, '2026')).toBe(-1500);
  });

  it('treats missing months as 0', () => {
    const map = new Map([['2026-06', -300]]);
    expect(computeYearTotal(map, '2026')).toBe(-300);
  });

  it('returns 0 for an empty map', () => {
    expect(computeYearTotal(new Map(), '2026')).toBe(0);
  });

  it('ignores months from other years', () => {
    const map = new Map([
      ['2025-01', -999],
      ['2026-01', -100],
    ]);
    expect(computeYearTotal(map, '2026')).toBe(-100);
  });

  it('handles mixed income and expense months', () => {
    const map = new Map([
      ['2026-01', 500000], // salary
      ['2026-02', -40000], // expenses
    ]);
    expect(computeYearTotal(map, '2026')).toBe(460000);
  });
});

describe('applyPercentage', () => {
  it('returns the same value for 0%', () => {
    expect(applyPercentage(-50000, 0)).toBe(-50000);
  });

  it('+5% increases the value by 5%', () => {
    expect(applyPercentage(-10000, 5)).toBe(-10500);
  });

  it('-10% decreases the value by 10%', () => {
    expect(applyPercentage(-10000, -10)).toBe(-9000);
  });

  it('rounds to the nearest cent', () => {
    // -333 * 1.05 = -349.65 → -350
    expect(applyPercentage(-333, 5)).toBe(-350);
  });

  it('handles positive amounts (income budget)', () => {
    // 500000 + 3% = 515000
    expect(applyPercentage(500000, 3)).toBe(515000);
  });

  it('handles zero input', () => {
    expect(applyPercentage(0, 50)).toBe(0);
  });
});

describe('monthsInYear', () => {
  it('returns exactly 12 months', () => {
    expect(monthsInYear('2026')).toHaveLength(12);
  });

  it('starts with January and ends with December', () => {
    const months = monthsInYear('2026');
    expect(months[0]).toBe('2026-01');
    expect(months[11]).toBe('2026-12');
  });

  it('pads month numbers with leading zero', () => {
    const months = monthsInYear('2026');
    expect(months[8]).toBe('2026-09');
  });

  it('uses the supplied year', () => {
    const months = monthsInYear('2024');
    expect(months.every(m => m.startsWith('2024-'))).toBe(true);
  });

  it('all months are in YYYY-MM format', () => {
    const re = /^\d{4}-\d{2}$/;
    monthsInYear('2026').forEach(m => expect(m).toMatch(re));
  });
});

describe('splitYearTotal + computeYearTotal roundtrip', () => {
  it('splitting then summing always returns the original total', () => {
    const totals = [0, 1, -1, 100, -100, 12000, -6000, 9999, -9999, 100000];
    for (const total of totals) {
      const parts   = splitYearTotal(total);
      const months  = monthsInYear('2026');
      const map     = new Map(months.map((m, i) => [m, parts[i]]));
      const resum   = computeYearTotal(map, '2026');
      expect(resum).toBe(total);
    }
  });
});
