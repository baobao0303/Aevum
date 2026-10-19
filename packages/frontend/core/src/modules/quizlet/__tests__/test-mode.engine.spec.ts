import { describe, expect, it } from 'vitest';

import type { TermCardModel } from '../models/study-set.model';
import { TestModeEngine } from '../services/test-mode.engine';

describe('TestModeEngine (AC-TST-01)', () => {
  const cards: TermCardModel[] = [
    {
      id: '1',
      setId: 's1',
      term: 'Mitochondria',
      definition: 'Powerhouse of cell',
      displayOrder: 0,
    },
    {
      id: '2',
      setId: 's1',
      term: 'Nucleus',
      definition: 'Brain of cell',
      displayOrder: 1,
    },
    {
      id: '3',
      setId: 's1',
      term: 'Ribosome',
      definition: 'Protein factory',
      displayOrder: 2,
    },
    {
      id: '4',
      setId: 's1',
      term: 'Vacuole',
      definition: 'Water storage',
      displayOrder: 3,
    },
  ];

  it('should generate test with 4 different question types', () => {
    const engine = new TestModeEngine(cards, {
      questionCount: 4,
      questionTypes: ['true_false', 'multiple_choice', 'matching', 'written'],
    });

    const questions = engine.getQuestions();
    expect(questions.length).toBe(4);

    const types = questions.map(q => q.type);
    expect(types).toContain('true_false');
    expect(types).toContain('multiple_choice');
    expect(types).toContain('matching');
    expect(types).toContain('written');
  });

  it('should accurately grade submissions and calculate percentage', () => {
    const engine = new TestModeEngine(cards, {
      questionCount: 2,
      questionTypes: ['multiple_choice', 'written'],
    });

    const [q1, q2] = engine.getQuestions();

    const report = engine.grade([
      { questionId: q1.id, userAnswer: (q1 as any).correctAnswer }, // Correct
      { questionId: q2.id, userAnswer: 'Completely Wrong' }, // Wrong
    ]);

    expect(report.totalQuestions).toBe(2);
    expect(report.correctCount).toBe(1);
    expect(report.incorrectCount).toBe(1);
    expect(report.scorePercent).toBe(50);
    expect(report.incorrectCardIds).toContain(q2.cardId);
  });

  it('should generate printable HTML document with questions', () => {
    const engine = new TestModeEngine(cards);
    const html = engine.generatePrintableHtml('Sinh Học Tế Bào');

    expect(html).toContain('Sinh Học Tế Bào - Đề Kiểm Tra');
    expect(html).toContain('Câu 1');
  });
});
