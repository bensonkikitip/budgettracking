// Splits a year total into 12 month values. First 11 months get Math.round(total/12),
// last month absorbs any rounding remainder so the 12 values sum exactly to total.
export function splitYearTotal(totalCents: number): number[] {
  const monthly = Math.round(totalCents / 12);
  const months = Array(11).fill(monthly);
  const remainder = totalCents - monthly * 11;
  months.push(remainder);
  return months;
}

// Sums all 12 months for a given category from a Map<month, cents>. Missing months = 0.
export function computeYearTotal(monthValues: Map<string, number>, year: string): number {
  let total = 0;
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`;
    total += monthValues.get(key) ?? 0;
  }
  return total;
}

// Applies a percentage adjustment: cents * (1 + pct/100), rounded to nearest cent.
export function applyPercentage(cents: number, pct: number): number {
  return Math.round(cents * (1 + pct / 100));
}

// Returns all 12 month keys for a given year, e.g. ['2026-01', ..., '2026-12'].
export function monthsInYear(year: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}
