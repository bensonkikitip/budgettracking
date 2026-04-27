import Papa from 'papaparse';
import { mmddyyyyToIso, normalizeDescription } from '../domain/normalize';

export interface CitiRow {
  dateIso: string;
  amountCents: number;
  description: string;
  originalDescription: string;
  isPending: boolean;
}

export function parseCitiCreditCard(csvText: string): CitiRow[] {
  const result = Papa.parse<{
    Status: string;
    Date: string;
    Description: string;
    Debit: string;
    Credit: string;
    'Member Name': string;
  }>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  const rows: CitiRow[] = [];
  for (const row of result.data) {
    if (!row.Date || !row.Date.includes('/')) continue;

    const dateIso = mmddyyyyToIso(row.Date.trim());
    const originalDescription = row.Description ?? '';

    // Net-worth sign convention:
    //   Debit (purchase): stored as negative (money out)
    //   Credit (payment/refund): stored as positive (debt decreases → net worth up)
    let amountCents: number;
    if (row.Credit && row.Credit.trim() !== '') {
      // Credit values come as negative strings (e.g. "-988.56"); negate to get positive
      amountCents = -Math.round(parseFloat(row.Credit.replace(/,/g, '')) * 100);
    } else {
      amountCents = -Math.round(parseFloat(row.Debit.replace(/,/g, '')) * 100);
    }

    rows.push({
      dateIso,
      amountCents,
      description: normalizeDescription(originalDescription),
      originalDescription,
      isPending: row.Status?.trim() !== 'Cleared',
    });
  }

  return rows;
}
