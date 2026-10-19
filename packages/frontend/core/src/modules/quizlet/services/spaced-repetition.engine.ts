/**
 * Adaptive Spaced Repetition 3-Bucket Engine & Fuzzy Matching
 * Complies with SPEC-QUIZLET-RE-2026-V1 Section 8.1 & AC-LRN-01..03
 */

import type { TermCardModel } from '../models/study-set.model';

export type MasteryBucket = 'unstudied' | 'learning' | 'mastered';
export type QuestionType = 'multiple_choice' | 'written';

export interface CardStudyState {
  cardId: string;
  bucket: MasteryBucket;
  correctStreak: number;
  incorrectCount: number;
  hasPassedWritten: boolean;
  lastAnsweredAt?: string;
}

export interface LearnQuestion {
  card: TermCardModel;
  type: QuestionType;
  options?: string[]; // 4 options for multiple choice (1 correct + 3 distractors)
}

export interface AnswerResult {
  cardId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  newBucket: MasteryBucket;
  newStreak: number;
  reinsertedInTurns?: number;
}

export function normalizeText(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function isFuzzyMatch(
  userAnswer: string,
  expectedAnswer: string
): boolean {
  const normUser = normalizeText(userAnswer);
  const normExpected = normalizeText(expectedAnswer);

  if (normUser === normExpected) {
    return true;
  }

  // Levenshtein distance <= 1 for words with length >= 5
  if (normExpected.length >= 5) {
    const dist = levenshteinDistance(normUser, normExpected);
    return dist <= 1;
  }

  return false;
}

export class SpacedRepetitionSession {
  private readonly cards: TermCardModel[];
  private readonly cardStates: Map<string, CardStudyState> = new Map();
  private readonly questionQueue: TermCardModel[] = [];

  constructor(cards: TermCardModel[]) {
    this.cards = [...cards];
    this.cards.forEach(card => {
      this.cardStates.set(card.id, {
        cardId: card.id,
        bucket: 'unstudied',
        correctStreak: 0,
        incorrectCount: 0,
        hasPassedWritten: false,
      });
    });
    this.questionQueue = [...this.cards];
  }

  public getStats() {
    let unstudied = 0;
    let learning = 0;
    let mastered = 0;

    this.cardStates.forEach(state => {
      if (state.bucket === 'unstudied') unstudied++;
      else if (state.bucket === 'learning') learning++;
      else if (state.bucket === 'mastered') mastered++;
    });

    const total = this.cards.length;
    const progressPercent =
      total > 0 ? Math.round(((learning * 0.5 + mastered) / total) * 100) : 0;

    return {
      total,
      unstudied,
      learning,
      mastered,
      remainingInQueue: this.questionQueue.length,
      progressPercent,
    };
  }

  public getNextQuestion(): LearnQuestion | null {
    if (this.questionQueue.length === 0) {
      return null;
    }

    const card = this.questionQueue[0];
    const state = this.cardStates.get(card.id);
    if (!state) {
      return null;
    }

    // AC-LRN-01: Unstudied cards start with Multiple Choice
    // AC-LRN-02: Learning cards progress to Written test
    const type: QuestionType =
      state.bucket === 'unstudied' ? 'multiple_choice' : 'written';

    let options: string[] | undefined;
    if (type === 'multiple_choice') {
      options = this.generateMultipleChoiceOptions(card);
    }

    return { card, type, options };
  }

  private generateMultipleChoiceOptions(targetCard: TermCardModel): string[] {
    const correct = targetCard.definition;
    const otherCards = this.cards.filter(c => c.id !== targetCard.id);
    const shuffled = [...otherCards].sort(() => 0.5 - Math.random());
    const distractors = shuffled.slice(0, 3).map(c => c.definition);

    const pool = [correct, ...distractors];
    return pool.sort(() => 0.5 - Math.random());
  }

  public submitAnswer(userAnswer: string): AnswerResult {
    if (this.questionQueue.length === 0) {
      throw new Error('No active question in queue');
    }

    const currentCard = this.questionQueue.shift();
    if (!currentCard) {
      throw new Error('No active question in queue');
    }
    const state = this.cardStates.get(currentCard.id);
    if (!state) {
      throw new Error('Card state not found');
    }
    const isMultipleChoice = state.bucket === 'unstudied';

    const isCorrect = isMultipleChoice
      ? normalizeText(userAnswer) === normalizeText(currentCard.definition)
      : isFuzzyMatch(userAnswer, currentCard.definition);

    let reinsertedInTurns: number | undefined;

    if (isCorrect) {
      state.correctStreak += 1;
      state.lastAnsweredAt = new Date().toISOString();

      // AC-LRN-01: Correct on unstudied -> Learning
      if (state.bucket === 'unstudied') {
        state.bucket = 'learning';
        // Add to queue for written recall phase
        this.questionQueue.push(currentCard);
      }
      // AC-LRN-02: Correct on learning written -> Mastered
      else if (state.bucket === 'learning') {
        state.hasPassedWritten = true;
        state.bucket = 'mastered';
        // Does not re-insert if mastered!
      }
    } else {
      // AC-LRN-03: Regression rule when wrong -> reset streak, demote to learning, reinsert in 3 turns
      state.correctStreak = 0;
      state.incorrectCount += 1;
      state.bucket = 'learning';
      state.hasPassedWritten = false;

      // Reinsert after 3 questions (or at end if queue < 3)
      const reinsertIndex = Math.min(3, this.questionQueue.length);
      this.questionQueue.splice(reinsertIndex, 0, currentCard);
      reinsertedInTurns = reinsertIndex;
    }

    return {
      cardId: currentCard.id,
      isCorrect,
      userAnswer,
      correctAnswer: currentCard.definition,
      newBucket: state.bucket,
      newStreak: state.correctStreak,
      reinsertedInTurns,
    };
  }
}
