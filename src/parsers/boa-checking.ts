import Papa from 'papaparse';
import { mmddyyyyToIso, normalizeDescription } from '../domain/normalize';
import { parseDollarsToCents } from '../domain/money';

export interface BoaRow {
  dateIso: string;
  amountCents: number;
  description: string;
  originalDescription: string;
  isPending: false;
}

export function parseBoaChecking(csvText: string): BoaRow[] {
  const lines = csvText.split('\n');

  // Find the header row index
  const headerIndex = lines.findIndex((l) =>
    l.startsWith('Date,') && l.includes('Description') && l.includes('Amount'),
  );
  if (headerIndex === -1) throw new Error('BoA checking: could not find data header row');

  const dataSection = lines.slice(headerIndex).join('\n');

  const result = Papa.parse<{ Date: string; Description: string; Amount: string }>(dataSection, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: BoaRow[] = [];
  for (const row of result.data) {
    // Skip the "Beginning balance" row which has no Amount
    if (!row.Amount || row.Amount.trim() === '') continue;
    // Skip preamble rows that sneak through (no valid date)
    if (!row.Date || !row.Date.includes('/')) continue;

    const dateIso = mmddyyyyToIso(row.Date.trim());
    const amountCents = parseDollarsToCents(row.Amount);
    const originalDescription = row.Description ?? '';

    rows.push({
      dateIso,
      amountCents,
      description: normalizeDescription(originalDescription),
      originalDescription,
      isPending: false,
    });
  }

  return rows;
}
