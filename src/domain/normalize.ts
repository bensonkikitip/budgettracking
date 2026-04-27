export function normalizeDescription(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function mmddyyyyToIso(date: string): string {
  const [month, day, year] = date.split('/');
  if (!month || !day || !year) throw new Error(`Cannot parse date: "${date}"`);
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
