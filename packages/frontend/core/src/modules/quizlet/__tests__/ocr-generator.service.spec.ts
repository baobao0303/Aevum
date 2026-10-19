import { describe, expect, it } from 'vitest';

import { OcrGeneratorService } from '../services/ocr-generator.service';

describe('OcrGeneratorService (Document OCR & Note Extraction)', () => {
  it('should extract flashcards from numbered lines with dashes and colons', () => {
    const rawText = `
      1. Hardware - Các linh kiện vật lý của máy tính
      2. Software : Các chương trình và phần mềm
      3) Algorithm -> Tập hợp các bước giải quyết bài toán
    `;

    const cards = OcrGeneratorService.extractFlashcardsFromRawText(rawText);
    expect(cards.length).toBe(3);

    expect(cards[0].term).toBe('Hardware');
    expect(cards[0].definition).toBe('Các linh kiện vật lý của máy tính');

    expect(cards[1].term).toBe('Software');
    expect(cards[1].definition).toBe('Các chương trình và phần mềm');

    expect(cards[2].term).toBe('Algorithm');
    expect(cards[2].definition).toBe('Tập hợp các bước giải quyết bài toán');
  });

  it('should return empty list when given empty or whitespace text', () => {
    expect(OcrGeneratorService.extractFlashcardsFromRawText('')).toEqual([]);
    expect(
      OcrGeneratorService.extractFlashcardsFromRawText('   \n\n  ')
    ).toEqual([]);
  });
});
