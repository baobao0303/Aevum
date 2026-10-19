/**
 * Flexible Test Mode Engine
 * Complies with SPEC-QUIZLET-RE-2026-V1 Section 4.3.C & AC-TST-01
 * Supports True/False, Multiple Choice, Matching, Written question formats
 */

import type { TermCardModel } from '../models/study-set.model';
import { isFuzzyMatch, normalizeText } from './spaced-repetition.engine';

export type TestQuestionType =
  | 'true_false'
  | 'multiple_choice'
  | 'matching'
  | 'written';

export interface TestConfig {
  questionCount?: number;
  questionTypes?: TestQuestionType[];
  answerWith?: 'definition' | 'term';
}

export interface BaseTestQuestion {
  id: string;
  type: TestQuestionType;
  prompt: string;
  cardId: string;
}

export interface TrueFalseQuestion extends BaseTestQuestion {
  type: 'true_false';
  displayedAnswer: string;
  isActuallyTrue: boolean;
}

export interface MultipleChoiceQuestion extends BaseTestQuestion {
  type: 'multiple_choice';
  options: string[];
  correctAnswer: string;
}

export interface MatchingQuestionItem {
  promptId: string;
  promptText: string;
  correctAnswerText: string;
}

export interface MatchingQuestion extends BaseTestQuestion {
  type: 'matching';
  items: MatchingQuestionItem[];
  shuffledAnswers: string[];
}

export interface WrittenQuestion extends BaseTestQuestion {
  type: 'written';
  correctAnswer: string;
}

export type GeneratedQuestion =
  | TrueFalseQuestion
  | MultipleChoiceQuestion
  | MatchingQuestion
  | WrittenQuestion;

export interface TestSubmission {
  questionId: string;
  userAnswer: string | Record<string, string>; // Record for matching
}

export interface QuestionGradingResult {
  questionId: string;
  cardId: string;
  isCorrect: boolean;
  userAnswer: string | Record<string, string>;
  correctAnswer: string | Record<string, string>;
}

export interface TestReport {
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  scorePercent: number;
  results: QuestionGradingResult[];
  incorrectCardIds: string[];
}

export class TestModeEngine {
  private questions: GeneratedQuestion[] = [];
  private readonly cards: TermCardModel[];
  private readonly config: Required<TestConfig>;

  constructor(cards: TermCardModel[], config?: TestConfig) {
    if (cards.length < 2) {
      throw new Error('Test mode requires at least 2 cards');
    }
    this.cards = [...cards];
    this.config = {
      questionCount: Math.min(
        config?.questionCount || cards.length,
        cards.length
      ),
      questionTypes: config?.questionTypes || [
        'true_false',
        'multiple_choice',
        'matching',
        'written',
      ],
      answerWith: config?.answerWith || 'definition',
    };
    this.generateTest();
  }

  public getQuestions(): GeneratedQuestion[] {
    return this.questions;
  }

  private generateTest(): void {
    const selectedCards = [...this.cards]
      .sort(() => 0.5 - Math.random())
      .slice(0, this.config.questionCount);

    this.questions = selectedCards.map((card, index) => {
      const allowedTypes = this.config.questionTypes;
      const type = allowedTypes[index % allowedTypes.length];
      const qId = `q_${card.id}_${index}`;

      const prompt =
        this.config.answerWith === 'definition' ? card.term : card.definition;
      const targetAnswer =
        this.config.answerWith === 'definition' ? card.definition : card.term;

      if (type === 'true_false') {
        const isTrue = Math.random() > 0.5;
        let displayedAnswer = targetAnswer;
        if (!isTrue) {
          const otherCards = this.cards.filter(c => c.id !== card.id);
          const randomOther =
            otherCards[Math.floor(Math.random() * otherCards.length)];
          displayedAnswer =
            this.config.answerWith === 'definition'
              ? randomOther.definition
              : randomOther.term;
        }
        return {
          id: qId,
          type: 'true_false',
          cardId: card.id,
          prompt,
          displayedAnswer,
          isActuallyTrue: displayedAnswer === targetAnswer,
        } as TrueFalseQuestion;
      }

      if (type === 'multiple_choice') {
        const otherCards = this.cards.filter(c => c.id !== card.id);
        const distractors = [...otherCards]
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(c =>
            this.config.answerWith === 'definition' ? c.definition : c.term
          );

        const options = [targetAnswer, ...distractors].sort(
          () => 0.5 - Math.random()
        );
        return {
          id: qId,
          type: 'multiple_choice',
          cardId: card.id,
          prompt,
          options,
          correctAnswer: targetAnswer,
        } as MultipleChoiceQuestion;
      }

      if (type === 'matching') {
        const matchCards = [
          card,
          ...this.cards.filter(c => c.id !== card.id).slice(0, 3),
        ];
        const items: MatchingQuestionItem[] = matchCards.map((c, i) => ({
          promptId: `${qId}_item_${i}`,
          promptText:
            this.config.answerWith === 'definition' ? c.term : c.definition,
          correctAnswerText:
            this.config.answerWith === 'definition' ? c.definition : c.term,
        }));
        const shuffledAnswers = items
          .map(i => i.correctAnswerText)
          .sort(() => 0.5 - Math.random());
        return {
          id: qId,
          type: 'matching',
          cardId: card.id,
          prompt: 'Ghép cặp thuật ngữ với định nghĩa tương ứng',
          items,
          shuffledAnswers,
        } as MatchingQuestion;
      }

      // Default: written
      return {
        id: qId,
        type: 'written',
        cardId: card.id,
        prompt,
        correctAnswer: targetAnswer,
      } as WrittenQuestion;
    });
  }

  public grade(submissions: TestSubmission[]): TestReport {
    const subMap = new Map(submissions.map(s => [s.questionId, s.userAnswer]));
    const results: QuestionGradingResult[] = [];
    const incorrectCardIds: string[] = [];

    this.questions.forEach(q => {
      const userAns = subMap.get(q.id);
      let isCorrect = false;
      let correctAnswerStr: string | Record<string, string> = '';

      if (q.type === 'true_false') {
        correctAnswerStr = q.isActuallyTrue ? 'true' : 'false';
        isCorrect = String(userAns).toLowerCase() === correctAnswerStr;
      } else if (q.type === 'multiple_choice') {
        correctAnswerStr = q.correctAnswer;
        isCorrect =
          normalizeText(String(userAns || '')) ===
          normalizeText(q.correctAnswer);
      } else if (q.type === 'written') {
        correctAnswerStr = q.correctAnswer;
        isCorrect = isFuzzyMatch(String(userAns || ''), q.correctAnswer);
      } else if (q.type === 'matching') {
        const matchMap: Record<string, string> = {};
        q.items.forEach(item => {
          matchMap[item.promptId] = item.correctAnswerText;
        });
        correctAnswerStr = matchMap;

        const userMatch = (userAns || {}) as Record<string, string>;
        isCorrect = q.items.every(
          item =>
            normalizeText(userMatch[item.promptId] || '') ===
            normalizeText(item.correctAnswerText)
        );
      }

      if (!isCorrect) {
        incorrectCardIds.push(q.cardId);
      }

      results.push({
        questionId: q.id,
        cardId: q.cardId,
        isCorrect,
        userAnswer: userAns ?? '',
        correctAnswer: correctAnswerStr,
      });
    });

    const totalQuestions = this.questions.length;
    const correctCount = results.filter(r => r.isCorrect).length;
    const incorrectCount = totalQuestions - correctCount;
    const scorePercent =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

    return {
      totalQuestions,
      correctCount,
      incorrectCount,
      scorePercent,
      results,
      incorrectCardIds: Array.from(new Set(incorrectCardIds)),
    };
  }

  public generatePrintableHtml(title: string): string {
    const listHtml = this.questions
      .map((q, idx) => {
        let body = '';
        if (q.type === 'true_false') {
          body = `<p><strong>${q.prompt}</strong>: "${q.displayedAnswer}"</p><span>[ ] Đúng  [ ] Sai</span>`;
        } else if (q.type === 'multiple_choice') {
          body = `<p><strong>${q.prompt}</strong></p><ul>${q.options.map(opt => `<li>( ) ${opt}</li>`).join('')}</ul>`;
        } else if (q.type === 'written') {
          body = `<p><strong>${q.prompt}</strong></p><p>Trả lời: ___________________________</p>`;
        } else if (q.type === 'matching') {
          body = `<p><strong>Ghép nối</strong></p><ul>${q.items.map(i => `<li>${i.promptText} ➔ [ ______ ]</li>`).join('')}</ul>`;
        }
        return `<div style="margin-bottom: 24px;"><strong>Câu ${idx + 1} (${q.type}):</strong>${body}</div>`;
      })
      .join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:sans-serif;padding:30px;line-height:1.6;}</style></head><body><h1>${title} - Đề Kiểm Tra</h1><hr>${listHtml}</body></html>`;
  }
}
