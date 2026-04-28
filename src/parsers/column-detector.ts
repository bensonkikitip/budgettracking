import Papa from 'papaparse';
import { ColumnConfig, DateFormat } from './column-config';
import { parseGeneric, GenericRow } from './generic-parser';

export interface DetectionResult {
  config: ColumnConfig;
  sampleRows: GenericRow[];
  warnings: string[];
}

const DATE_REGEX = /^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}$/;
const NUMERIC_REGEX = /^-?[\$]?[\d,]+(\.\d{1,2})?$/;

function lc(s: string) {
  return s.toLowerCase().trim();
}

function detectDateFormat(samples: string[]): DateFormat {
  for (const s of samples) {
    const clean = s.trim();
    if (clean.includes('-')) {
      const parts = clean.split('-');
      if (parts[0] && parts[0].length === 4) return 'YYYY-MM-DD';
    }
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts[0] && parseInt(parts[0], 10) > 12) return 'DD/MM/YYYY';
    }
  }
  return 'MM/DD/YYYY';
}

function scoreAsDate(header: string, samples: string[]): number {
  const name = lc(header);
  let score = 0;
  if (name.includes('date')) score += 10;
  if (name === 'posted' || name.includes('transaction date') || name.includes('post date')) score += 8;
  const matching = samples.filter(v => DATE_REGEX.test(v.trim())).length;
  score += (matching / Math.max(samples.length, 1)) * 8;
  return score;
}

function scoreAsDescription(header: string, samples: string[]): number {
  const name = lc(header);
  let score = 0;
  if (name.includes('description') || name.includes('memo') || name.includes('payee')) score += 10;
  if (name.includes('merchant') || name.includes('details') || name.includes('name') || name.includes('narrative')) score += 8;
  // Prefer column with longer, non-numeric text
  const textLength = samples.reduce((sum, v) => sum + v.trim().length, 0) / Math.max(samples.length, 1);
  const numericCount = samples.filter(v => NUMERIC_REGEX.test(v.trim())).length;
  score += Math.min(textLength / 10, 4);
  score -= numericCount * 2;
  return score;
}

function scoreAsSignedAmount(header: string, samples: string[]): number {
  const name = lc(header);
  let score = 0;
  if (name === 'amount' || name.includes('amount')) score += 10;
  if (name.includes('transaction amount')) score += 8;
  const numericCount = samples.filter(v => NUMERIC_REGEX.test(v.trim())).length;
  score += (numericCount / Math.max(samples.length, 1)) * 6;
  const hasNegative = samples.some(v => v.trim().startsWith('-') || v.trim().startsWith('('));
  if (hasNegative) score += 3;
  return score;
}

function scoreAsDebit(header: string, samples: string[]): number {
  const name = lc(header);
  let score = 0;
  if (name === 'debit' || name === 'withdrawal' || name === 'money out' || name === 'withdrawals') score += 12;
  if (name.includes('debit') || name.includes('withdrawal')) score += 8;
  const numericCount = samples.filter(v => NUMERIC_REGEX.test(v.trim()) && v.trim() !== '').length;
  score += (numericCount / Math.max(samples.length, 1)) * 4;
  return score;
}

function scoreAsCredit(header: string, samples: string[]): number {
  const name = lc(header);
  let score = 0;
  if (name === 'credit' || name === 'deposit' || name === 'money in' || name === 'credits' || name === 'deposits') score += 12;
  if (name.includes('credit') || name.includes('deposit')) score += 8;
  const numericCount = samples.filter(v => NUMERIC_REGEX.test(v.trim()) && v.trim() !== '').length;
  score += (numericCount / Math.max(samples.length, 1)) * 4;
  return score;
}

function scoreAsStatus(header: string): number {
  const name = lc(header);
  if (name === 'status' || name === 'type' || name === 'pending') return 8;
  if (name.includes('status') || name.includes('pending')) return 5;
  return 0;
}

const HEADER_KEYWORDS = [
  'date', 'description', 'amount', 'debit', 'credit', 'memo',
  'payee', 'merchant', 'balance', 'status', 'narration',
  'withdrawal', 'deposit', 'transaction', 'posting',
];

// How many recognizable financial keywords does this header line contain?
function scoreHeaderLine(line: string): number {
  const l = line.toLowerCase();
  return HEADER_KEYWORDS.reduce((n, kw) => n + (l.includes(kw) ? 1 : 0), 0);
}

// Try parsing from a given line index as the header; return a composite score.
// `score = dateRows * 100 + keywordBonus` so keyword richness only breaks ties.
function tryParseFromLine(lines: string[], headerIdx: number): { score: number; headers: string[] } {
  const slice = lines.slice(headerIdx).join('\n');
  const result = Papa.parse<Record<string, string>>(slice, { header: true, skipEmptyLines: true });
  if (!result.data.length) return { score: 0, headers: [] };

  const headers = result.meta.fields ?? [];
  if (headers.length < 2) return { score: 0, headers };

  let dateRows = 0;
  for (const row of result.data) {
    const values = Object.values(row);
    if (values.some(v => typeof v === 'string' && DATE_REGEX.test(v.trim()))) dateRows++;
  }

  const keywordBonus = scoreHeaderLine(lines[headerIdx] ?? '');
  return { score: dateRows * 100 + keywordBonus, headers };
}

// Find the best header row in the first `maxLines` lines
function findHeaderRow(csvText: string): { headerIdx: number; headerLine: string; lines: string[] } {
  const lines = csvText.trim().split('\n');
  const maxSearch = Math.min(20, lines.length);

  let bestIdx = 0;
  let bestScore = -1;

  for (let i = 0; i < maxSearch; i++) {
    if (!lines[i]?.trim()) continue; // empty lines cannot be headers
    const { score } = tryParseFromLine(lines, i);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return { headerIdx: bestIdx, headerLine: lines[bestIdx] ?? '', lines };
}

export function detectColumnConfig(csvText: string): DetectionResult {
  const warnings: string[] = [];

  const { headerIdx, headerLine, lines } = findHeaderRow(csvText);
  const slice = lines.slice(headerIdx).join('\n');

  const parsed = Papa.parse<Record<string, string>>(slice, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  const rows = parsed.data;

  if (!headers.length) {
    warnings.push('Could not find any columns in this CSV.');
    const fallback: ColumnConfig = {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      dateFormat: 'MM/DD/YYYY',
      amountStyle: 'signed',
      signedAmountColumn: 'Amount',
    };
    return { config: fallback, sampleRows: [], warnings };
  }

  // Collect up to 10 sample values per column
  const samples: Record<string, string[]> = {};
  for (const h of headers) {
    samples[h] = rows.slice(0, 10).map(r => r[h] ?? '').filter(v => v !== '');
  }

  // Score each header for each role
  const dateScores     = headers.map(h => ({ h, s: scoreAsDate(h, samples[h] ?? []) }));
  const descScores     = headers.map(h => ({ h, s: scoreAsDescription(h, samples[h] ?? []) }));
  const signedScores   = headers.map(h => ({ h, s: scoreAsSignedAmount(h, samples[h] ?? []) }));
  const debitScores    = headers.map(h => ({ h, s: scoreAsDebit(h, samples[h] ?? []) }));
  const creditScores   = headers.map(h => ({ h, s: scoreAsCredit(h, samples[h] ?? []) }));

  const bestDate   = dateScores.sort((a, b) => b.s - a.s)[0];
  const bestDesc   = descScores.sort((a, b) => b.s - a.s)[0];
  const bestSigned = signedScores.sort((a, b) => b.s - a.s)[0];
  const bestDebit  = debitScores.sort((a, b) => b.s - a.s)[0];
  const bestCredit = creditScores.sort((a, b) => b.s - a.s)[0];

  if (!bestDate || bestDate.s < 3) {
    warnings.push("Couldn't confidently find a date column. Please set it manually.");
  }
  if (!bestDesc || bestDesc.s < 2) {
    warnings.push("Couldn't confidently find a description column. Please set it manually.");
  }

  // Decide amount style: prefer debit_credit when both debit+credit columns score well
  // and neither is the same column as the best signed amount
  const debitCreditScore = (bestDebit?.s ?? 0) + (bestCredit?.s ?? 0);
  const signedScore = bestSigned?.s ?? 0;
  const useDebitCredit =
    debitCreditScore > signedScore + 4 &&
    (bestDebit?.h !== bestCredit?.h);

  const dateFormat = detectDateFormat(samples[bestDate?.h ?? ''] ?? []);

  // Detect pending column
  let pendingColumn: string | undefined;
  let clearedValue: string | undefined;
  for (const h of headers) {
    const stat = scoreAsStatus(h);
    if (stat >= 5) {
      const vals = [...new Set((samples[h] ?? []).map(v => v.trim()))];
      // Common cleared values
      const cleared = vals.find(v =>
        ['cleared', 'posted', 'complete', 'completed', 'settled'].includes(v.toLowerCase())
      );
      if (cleared) {
        pendingColumn = h;
        clearedValue = cleared;
        break;
      }
    }
  }

  // Build headerContains from the detected header line (trimmed, no trailing whitespace)
  const headerContains = headerIdx > 0 ? headerLine.trim() : undefined;

  let config: ColumnConfig;
  if (useDebitCredit) {
    config = {
      dateColumn:        bestDate?.h ?? 'Date',
      descriptionColumn: bestDesc?.h ?? 'Description',
      dateFormat,
      amountStyle:       'debit_credit',
      debitColumn:       bestDebit?.h ?? 'Debit',
      creditColumn:      bestCredit?.h ?? 'Credit',
      ...(pendingColumn ? { pendingColumn, clearedValue } : {}),
      ...(headerContains ? { headerContains } : {}),
    };
  } else {
    if (!bestSigned || bestSigned.s < 2) {
      warnings.push("Couldn't find an amount column. Please set it manually.");
    }
    config = {
      dateColumn:          bestDate?.h ?? 'Date',
      descriptionColumn:   bestDesc?.h ?? 'Description',
      dateFormat,
      amountStyle:         'signed',
      signedAmountColumn:  bestSigned?.h ?? 'Amount',
      ...(pendingColumn ? { pendingColumn, clearedValue } : {}),
      ...(headerContains ? { headerContains } : {}),
    };
  }

  // Try to generate sample rows for preview
  let sampleRows: GenericRow[] = [];
  try {
    sampleRows = parseGeneric(config, csvText).slice(0, 3);
  } catch {
    warnings.push('Could not generate a preview with the detected mapping. You may need to adjust the settings.');
  }

  return { config, sampleRows, warnings };
}
