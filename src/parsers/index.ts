import { ColumnConfig } from './column-config';
import { parseGeneric, GenericRow } from './generic-parser';

export type ParsedRow = GenericRow;

export function parseCsv(config: ColumnConfig, csvText: string): ParsedRow[] {
  return parseGeneric(config, csvText);
}
