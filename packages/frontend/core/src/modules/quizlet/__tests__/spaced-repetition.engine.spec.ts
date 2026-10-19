import { describe, expect, it } from 'vitest';

import type { TermCardModel } from '../models/study-set.model';
import {
  isFuzzyMatch,
  levenshteinDistance,
  normalizeText,
  SpacedRepetitionSession,
} from '../services/spaced-repetition.engine';

describe('SpacedRepetitionEngine (Adaptive 3-Bucket Algorithm)', () => {
  const sampleCards: TermCardModel[] = [
    {
      id: 'c1',
      setId: 's1',
      term: 'Chloroplast',
      definition: 'Lục lạp thực hiện quang hợp',
      displayOrder: 0,
    },
    {
      id: 'c2',
      setId: 's1',
      term: 'Ribosome',
      definition: 'Tổng hợp protein tế bào',
      displayOrder: 1,
    },
    {
      id: 'c3',
      setId: 's1',
      term: 'Vacuole',
      definition: 'Không bào lưu trữ nước',
      displayOrder: 2,
    },
    {
      id: 'c4',
      setId: 's1',
      term: 'Nucleus',
      definition: 'Nhân chứa ADN',
      displayOrder: 3,
    },
  ];

  describe('Fuzzy Matching & String Normalization', () => {
    it('should strip punctuation, casing and extra spaces', () => {
      expect(normalizeText('  Hello, World! -- ')).toBe('hello world');
    });

    it('should calculate accurate Levenshtein distance', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('cat', 'cats')).toBe(1);
    });

    it('should match terms with minor typos (Levenshtein <= 1)', () => {
      expect(isFuzzyMatch('Ribosome', 'ribosomes')).toBe(true);
      expect(isFuzzyMatch('Chloroplasts', 'Chloroplast')).toBe(true);
      expect(isFuzzyMatch('CompletelyWrong', 'Chloroplast')).toBe(false);
    });
  });

  describe('AC-LRN-01: Unstudied Card State & Promotion', () => {
    it('should start card in unstudied bucket with multiple choice type', () => {
      const session = new SpacedRepetitionSession(sampleCards);
      const q = session.getNextQuestion();

      expect(q).not.toBeNull();
      expect(q?.type).toBe('multiple_choice');
      expect(q?.options?.length).toBe(4);
      expect(q?.options).toContain(q?.card.definition);
    });

    it('should promote unstudied to learning upon correct answer', () => {
      const session = new SpacedRepetitionSession(sampleCards);
      const q = session.getNextQuestion()!;

      const result = session.submitAnswer(q.card.definition);
      expect(result.isCorrect).toBe(true);
      expect(result.newBucket).toBe('learning');
      expect(result.newStreak).toBe(1);
    });
  });

  describe('AC-LRN-02: Learning Card State & Mastery', () => {
    it('should present written question when card is in learning bucket', () => {
      const session = new SpacedRepetitionSession([
        sampleCards[0],
        sampleCards[1],
      ]);

      // First pass: answer correctly to move to learning
      const q1 = session.getNextQuestion()!;
      session.submitAnswer(q1.card.definition);

      const q2 = session.getNextQuestion()!;
      session.submitAnswer(q2.card.definition);

      // Now card 1 should appear as written question
      const q1Repeat = session.getNextQuestion()!;
      expect(q1Repeat.type).toBe('written');
    });

    it('should promote learning card to mastered when written answer is correct', () => {
      const singleCardSession = new SpacedRepetitionSession([
        sampleCards[0],
        sampleCards[1],
      ]);

      // Turn 1 (Multiple Choice)
      const q1 = singleCardSession.getNextQuestion()!;
      singleCardSession.submitAnswer(q1.card.definition);

      // Turn 2
      const q2 = singleCardSession.getNextQuestion()!;
      singleCardSession.submitAnswer(q2.card.definition);

      // Turn 3 (Written for card 1)
      const writtenQ = singleCardSession.getNextQuestion()!;
      const result = singleCardSession.submitAnswer(writtenQ.card.definition);

      expect(result.isCorrect).toBe(true);
      expect(result.newBucket).toBe('mastered');
      expect(result.newStreak).toBe(2);
    });
  });
  describe('AC-LRN-03: Regression & Re-insertion Penalty', () => {
    it('should reset streak, demote and re-insert after 3 questions when answered wrong', () => {
      const session = new SpacedRepetitionSession(sampleCards);
      session.getNextQuestion();

      // Answer incorrectly
      const result = session.submitAnswer('Wrong answer');
      expect(result.isCorrect).toBe(false);
      expect(result.newStreak).toBe(0);
      expect(result.newBucket).toBe('learning');
      expect(result.reinsertedInTurns).toBe(3);

      const stats = session.getStats();
      expect(stats.learning).toBe(1);
    });
  });
});
