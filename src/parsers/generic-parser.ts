import Papa from 'papaparse';
import { normalizeDescription, mmddyyyyToIso } from '../domain/normalize';
import { parseDollarsToCents } from '../domain/money';
import { ColumnConfig } from './column-config';

export interface GenericRow {
  dateIso:             string;
  amountCents:         number;
  description:         string;
  originalDescription: string;
  isPending:           boolean;
}

function toIso(raw: string, format: ColumnConfig['dateFormat']): string {
  const s = raw.trim();
  if (format === 'YYYY-MM-DD') return s;
  if (format === 'DD/MM/YYYY') {
    const [day, month, year] = s.split('/');
    if (!day || !month || !year) throw new Error(`Cannot parse date: "${raw}"`);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // MM/DD/YYYY
  return mmddyyyyToIso(s);
}

export function parseGeneric(config: ColumnConfig, csvText: string): GenericRow[] {
  let text = csvText.trim();

  // Skip preamble lines until we find the header row
  if (config.headerContains) {
    const lines = text.split('\n');
    const idx = lines.findIndex((l) => l.includes(config.headerContains!));
    if (idx === -1) throw new Error(`Could not find header row containing "${config.headerContains}"`);
    text = lines.slice(idx).join('\n');
  }

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows: GenericRow[] = [];

  for (const row of result.data) {
    const dateRaw = row[config.dateColumn]?.trim() ?? '';
    if (!dateRaw) continue;
    // Validate the date separator matches the expected format
    if (config.dateFormat === 'YYYY-MM-DD' && !dateRaw.includes('-')) continue;
    if (config.dateFormat !== 'YYYY-MM-DD' && !dateRaw.includes('/')) continue;

    let amountCents: number;
    if (config.amountStyle === 'signed') {
      const raw = row[config.signedAmountColumn ?? '']?.trim() ?? '';
      if (!raw) continue; // e.g. BoA "Beginning balance" row
      amountCents = parseDollarsToCents(raw);
    } else {
      // debit_credit: credit field holds a negative string (e.g. "-988.56") meaning payment
      const creditRaw = row[config.creditColumn ?? '']?.trim() ?? '';
      if (creditRaw) {
        amountCents = -parseDollarsToCents(creditRaw);
      } else {
        const debitRaw = row[config.debitColumn ?? '']?.trim() ?? '';
        amountCents = -parseDollarsToCents(debitRaw);
      }
    }

    const isPending = config.pendingColumn
      ? row[config.pendingColumn]?.trim() !== config.clearedValue
      : false;

    const originalDescription = row[config.descriptionColumn] ?? '';

    rows.push({
      dateIso:             toIso(dateRaw, config.dateFormat),
      amountCents,
      description:         normalizeDescription(originalDescription),
      originalDescription,
      isPending,
    });
  }

  return rows;
}
