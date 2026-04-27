import { CsvFormat } from '../db/queries';
import { parseBoaChecking, BoaRow } from './boa-checking';
import { parseCitiCreditCard, CitiRow } from './citi-credit-card';

export type ParsedRow = (BoaRow | CitiRow) & { description: string; originalDescription: string };

export function parseCsv(format: CsvFormat, csvText: string): ParsedRow[] {
  switch (format) {
    case 'boa_checking_v1':
      return parseBoaChecking(csvText);
    case 'citi_cc_v1':
      return parseCitiCreditCard(csvText);
    default: {
      const exhaustive: never = format;
      throw new Error(`Unknown CSV format: ${exhaustive}`);
    }
  }
}
