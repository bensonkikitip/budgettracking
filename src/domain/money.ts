export function centsToDollars(cents: number): string {
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const formatted = `$${dollars.toLocaleString()}.${String(remainder).padStart(2, '0')}`;
  return cents < 0 ? `-${formatted}` : formatted;
}

export function parseDollarsToCents(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, '');
  const float = parseFloat(cleaned);
  if (isNaN(float)) throw new Error(`Cannot parse amount: "${value}"`);
  return Math.round(float * 100);
}
