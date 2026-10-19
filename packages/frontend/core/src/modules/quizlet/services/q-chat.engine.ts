/**
 * Q-Chat Conversational AI Tutor Engine (RAG-based)
 * Complies with SPEC-QUIZLET-RE-2026-V1 Section 4.3.E & Section 8
 */

import type { StudySetModel } from '../models/study-set.model';
import { isFuzzyMatch } from './spaced-repetition.engine';

export type QChatMode = 'quiz_me' | 'teach_me' | 'story';

export interface QChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedActions?: string[];
}

export class QChatEngine {
  private readonly studySet: StudySetModel;
  private currentMode: QChatMode = 'quiz_me';
  private activeCardIndex: number = 0;
  private readonly messages: QChatMessage[] = [];

  constructor(studySet: StudySetModel) {
    if (!studySet.cards || studySet.cards.length === 0) {
      throw new Error('Q-Chat requires a study set with at least 1 card');
    }
    this.studySet = studySet;
    this.initGreeting();
  }

  private initGreeting(): void {
    const greeting: QChatMessage = {
      id: 'msg_0',
      sender: 'ai',
      text: `Xin chào! Tôi là Q-Chat - gia sư AI của bạn cho học phần "${this.studySet.title}". Bạn muốn "Kiểm tra tôi" (Quiz me), "Dạy tôi" (Teach me) hay "Kể chuyện ghi nhớ"?`,
      timestamp: new Date().toISOString(),
      suggestedActions: ['Kiểm tra tôi', 'Dạy tôi', 'Kể chuyện ghi nhớ'],
    };
    this.messages.push(greeting);
  }

  public getMessages(): QChatMessage[] {
    return [...this.messages];
  }

  public setMode(mode: QChatMode): QChatMessage {
    this.currentMode = mode;
    const card = this.studySet.cards[this.activeCardIndex];

    let responseText = '';
    if (mode === 'quiz_me') {
      responseText = `Tuyệt vời! Bắt đầu kiểm tra nhé. Hãy cho tôi biết: "${card.term}" có nghĩa là gì?`;
    } else if (mode === 'teach_me') {
      responseText = `Hãy cùng tìm hiểu về "${card.term}". Định nghĩa cốt lõi: ${card.definition}. Ví dụ thực tế: hãy tưởng tượng đây là thành phần thiết yếu giúp hệ thống vận hành trơn tru!`;
    } else if (mode === 'story') {
      const terms = this.studySet.cards
        .slice(0, 3)
        .map(c => `"${c.term}"`)
        .join(', ');
      responseText = `Câu chuyện ghi nhớ: Ngày xửa ngày xưa, ${terms} cùng đồng hành trong một hành trình khám phá tri thức!`;
    }

    const aiMsg: QChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'ai',
      text: responseText,
      timestamp: new Date().toISOString(),
    };
    this.messages.push(aiMsg);
    return aiMsg;
  }

  public sendMessage(userText: string): QChatMessage {
    const userMsg: QChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
      timestamp: new Date().toISOString(),
    };
    this.messages.push(userMsg);

    const currentCard = this.studySet.cards[this.activeCardIndex];
    let aiReply = '';

    if (this.currentMode === 'quiz_me') {
      const isCorrect = isFuzzyMatch(userText, currentCard.definition);
      if (isCorrect) {
        this.activeCardIndex =
          (this.activeCardIndex + 1) % this.studySet.cards.length;
        const nextCard = this.studySet.cards[this.activeCardIndex];
        aiReply = `Chính xác 100%! Bạn nắm rất chắc khái niệm này. Tiếp tục câu tiếp theo: "${nextCard.term}" là gì?`;
      } else {
        aiReply = `Gần đúng rồi! Gợi ý thêm cho bạn: định nghĩa chuẩn là "${currentCard.definition}". Bạn hãy thử diễn đạt lại theo cách hiểu của mình nhé?`;
      }
    } else {
      aiReply = `Cảm ơn câu hỏi của bạn về "${userText}". Để hiểu sâu hơn về học phần "${this.studySet.title}", bạn có muốn chuyển sang chế độ kiểm tra câu hỏi ngắn không?`;
    }

    const aiMsg: QChatMessage = {
      id: `ai_${Date.now()}`,
      sender: 'ai',
      text: aiReply,
      timestamp: new Date().toISOString(),
    };
    this.messages.push(aiMsg);
    return aiMsg;
  }
}
