import { beforeEach, describe, expect, it } from 'vitest';

import {
  parseCsvCards,
  serializeCardsToCsv,
} from '../services/csv-parser.util';
import { StudySetRepository } from '../services/study-set.repository';

describe('StudySetRepository & CSV Parser (Aevum Quizlet Integration)', () => {
  let repo: StudySetRepository;

  beforeEach(() => {
    repo = new StudySetRepository();
  });

  describe('AC-SET-01: Set Creation Validation', () => {
    it('should create a valid study set with at least 2 cards', () => {
      const set = repo.createSet({
        title: 'Từ vựng tiếng Anh cơ bản',
        description: 'Bộ thẻ học từ vựng A1-A2',
        termLanguage: 'en',
        definitionLanguage: 'vi',
        cards: [
          { term: 'Apple', definition: 'Quả táo', displayOrder: 0 },
          { term: 'Banana', definition: 'Quả chuối', displayOrder: 1 },
        ],
      });

      expect(set.id).toBeDefined();
      expect(set.title).toBe('Từ vựng tiếng Anh cơ bản');
      expect(set.cards.length).toBe(2);
      expect(set.cards[0].term).toBe('Apple');
    });

    it('should reject study set with fewer than 2 cards', () => {
      expect(() => {
        repo.createSet({
          title: 'Học phần lỗi',
          cards: [{ term: 'Single', definition: 'Đơn lẻ', displayOrder: 0 }],
        });
      }).toThrowError(/at least 2 cards/);
    });

    it('should reject study set with empty title', () => {
      expect(() => {
        repo.createSet({
          title: '',
          cards: [
            { term: 'A', definition: '1', displayOrder: 0 },
            { term: 'B', definition: '2', displayOrder: 1 },
          ],
        });
      }).toThrowError(/title is required/);
    });
  });

  describe('AC-SET-02: CSV/TSV Import & Export (RFC 4180)', () => {
    it('should correctly parse 50 cards with tabs, quotes, and newlines', () => {
      const lines: string[] = [];
      for (let i = 1; i <= 50; i++) {
        lines.push(`Term_${i}\t"Definition ${i} with, commas and\nline break"`);
      }
      const rawTsv = lines.join('\n');

      const parsed = parseCsvCards(rawTsv);
      expect(parsed.length).toBe(50);
      expect(parsed[0].term).toBe('Term_1');
      expect(parsed[0].definition).toContain('with, commas and\nline break');

      const set = repo.importFromCsv('50 Imported Cards', rawTsv);
      expect(set.cards.length).toBe(50);
    });

    it('should autodetect comma delimiter when tabs are absent', () => {
      const rawCsv = 'Apple,Quả táo\nBanana,Quả chuối\nOrange,Quả cam';
      const parsed = parseCsvCards(rawCsv);
      expect(parsed.length).toBe(3);
      expect(parsed[0].term).toBe('Apple');
      expect(parsed[0].definition).toBe('Quả táo');
    });

    it('should serialize cards back to TSV/CSV with proper quote escaping', () => {
      const cards = [
        { term: 'Hello', definition: 'Xin chào' },
        { term: 'Quote "Test"', definition: 'Định nghĩa có "dấu ngoặc"' },
      ];
      const exported = serializeCardsToCsv(cards, '\t');
      expect(exported).toContain('Hello\tXin chào');
      expect(exported).toContain('Quote ""Test""');
    });
  });

  describe('AC-SET-03: Diagram Pin Coordinates Validation', () => {
    it('should accept valid pin coordinates within 0..100% boundary', () => {
      const set = repo.createSet({
        title: 'Sơ đồ Sinh học',
        isDiagram: true,
        diagramImageUrl: 'https://example.com/cell.png',
        cards: [
          {
            term: 'Nhân tế bào',
            definition: 'Trung tâm điều khiển',
            displayOrder: 0,
            diagramCoordinates: { xPercent: 50.5, yPercent: 40.2 },
          },
          {
            term: 'Màng sinh chất',
            definition: 'Lớp bảo vệ',
            displayOrder: 1,
            diagramCoordinates: { xPercent: 10.0, yPercent: 90.0 },
          },
        ],
      });

      expect(set.isDiagram).toBe(true);
      expect(set.cards[0].diagramCoordinates?.xPercent).toBe(50.5);
    });

    it('should reject coordinates exceeding 100% or below 0%', () => {
      expect(() => {
        repo.createSet({
          title: 'Sơ đồ lỗi',
          isDiagram: true,
          cards: [
            {
              term: 'Lỗi',
              definition: 'Pin ngoài biên',
              displayOrder: 0,
              diagramCoordinates: { xPercent: 120.0, yPercent: 50.0 },
            },
            { term: 'Thẻ 2', definition: 'Bình thường', displayOrder: 1 },
          ],
        });
      }).toThrowError(/bounds must be 0-100%/);
    });
  });

  describe('Star Toggling & Set Management', () => {
    it('should toggle star on specific card and update set', () => {
      const set = repo.createSet({
        title: 'Star Test',
        cards: [
          { term: 'T1', definition: 'D1', displayOrder: 0 },
          { term: 'T2', definition: 'D2', displayOrder: 1 },
        ],
      });

      const cardId = set.cards[0].id;
      const isStarred = repo.toggleCardStar(set.id, cardId);
      expect(isStarred).toBe(true);

      const refreshed = repo.getSet(set.id);
      expect(refreshed?.cards[0].isStarred).toBe(true);
    });
  });
});
