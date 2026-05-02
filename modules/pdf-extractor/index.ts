import { requireNativeModule } from 'expo-modules-core';
import { PdfTextItem } from '../../src/parsers/pdf-parsers/pdf-types';

interface PdfExtractorNativeModule {
  extractTextItems(uri: string): Promise<string>;
}

const PdfExtractor = requireNativeModule<PdfExtractorNativeModule>('PdfExtractor');

/**
 * Extract word-level text items from a PDF file.
 *
 * @param uri - File URI (e.g. from expo-document-picker or expo-file-system)
 * @returns Array of PdfTextItem sorted by (page ASC, y DESC, x ASC).
 *          Returns an empty array if the PDF has no selectable text (scanned image).
 */
export async function extractTextItems(uri: string): Promise<PdfTextItem[]> {
  const json = await PdfExtractor.extractTextItems(uri);
  const raw: PdfTextItem[] = JSON.parse(json);
  // Sort: page ascending, y descending (top of page first), x ascending
  return raw.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (Math.abs(a.y - b.y) > 2) return b.y - a.y; // higher y = closer to top
    return a.x - b.x;
  });
}
