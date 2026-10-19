/**
 * Document OCR & Text-to-Flashcard Extraction Service
 * Complies with SPEC-QUIZLET-RE-2026-V1 Section 4.2.2 & Section 8
 */

import type { TermCardModel } from '../models/study-set.model';

export class OcrGeneratorService {
  public static extractFlashcardsFromRawText(
    rawText: string
  ): Array<Pick<TermCardModel, 'term' | 'definition' | 'displayOrder'>> {
    if (!rawText || !rawText.trim()) {
      return [];
    }

    const lines = rawText
      .split(/\r\n|\n|\r/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const cards: Array<
      Pick<TermCardModel, 'term' | 'definition' | 'displayOrder'>
    > = [];
    const separators = [' - ', ' : ', ' -> ', ' = ', '\t', ': '];

    lines.forEach(line => {
      // Strip leading number bullet (e.g. "1.", "1)", "[1]")
      const cleanLine = line.replace(/^\(?\[?\d+[.)\]]\s*/, '').trim();

      let matchedTerm = '';
      let matchedDef = '';

      for (const sep of separators) {
        if (cleanLine.includes(sep)) {
          const parts = cleanLine.split(sep);
          matchedTerm = parts[0].trim();
          matchedDef = parts.slice(1).join(sep).trim();
          break;
        }
      }

      if (matchedTerm && matchedDef) {
        cards.push({
          term: matchedTerm,
          definition: matchedDef,
          displayOrder: cards.length,
        });
      }
    });

    return cards;
  }
}
