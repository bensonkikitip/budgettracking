import { sha256 } from 'js-sha256';
import { normalizeDescription } from './normalize';

function baseKey(accountId: string, dateIso: string, amountCents: number, description: string): string {
  const normalized = normalizeDescription(description);
  return sha256(`${accountId}|${dateIso}|${amountCents}|${normalized}`);
}

export interface RawRow {
  accountId: string;
  dateIso: string;
  amountCents: number;
  description: string;
}

export function assignTransactionIds(rows: RawRow[]): string[] {
  const sequenceMap = new Map<string, number>();
  return rows.map((row) => {
    const key = baseKey(row.accountId, row.dateIso, row.amountCents, row.description);
    const seq = sequenceMap.get(key) ?? 0;
    sequenceMap.set(key, seq + 1);
    return sha256(`${key}|${seq}`).slice(0, 32);
  });
}
