import { describe, expect, it } from 'vitest';

import type { StudySetModel } from '../models/study-set.model';
import { QChatEngine } from '../services/q-chat.engine';

describe('QChatEngine (AI Tutor RAG Conversational Study)', () => {
  const mockSet: StudySetModel = {
    id: 'set-1',
    title: 'Hóa học đại cương',
    description: 'Nguyên tử và phân tử',
    termLanguage: 'vi',
    definitionLanguage: 'vi',
    isDiagram: false,
    createdAt: '2026-10-19',
    updatedAt: '2026-10-19',
    cards: [
      {
        id: 'c1',
        setId: 'set-1',
        term: 'Proton',
        definition: 'Hạt mang điện tích dương trong hạt nhân',
        displayOrder: 0,
      },
      {
        id: 'c2',
        setId: 'set-1',
        term: 'Electron',
        definition: 'Hạt mang điện tích âm quay quanh hạt nhân',
        displayOrder: 1,
      },
    ],
  };

  it('should initialize with greeting and list of suggested actions', () => {
    const qchat = new QChatEngine(mockSet);
    const msgs = qchat.getMessages();

    expect(msgs.length).toBe(1);
    expect(msgs[0].sender).toBe('ai');
    expect(msgs[0].text).toContain('Hóa học đại cương');
    expect(msgs[0].suggestedActions).toContain('Kiểm tra tôi');
  });

  it('should support switching to Teach Me mode and explain concept', () => {
    const qchat = new QChatEngine(mockSet);
    const msg = qchat.setMode('teach_me');

    expect(msg.text).toContain('Proton');
    expect(msg.text).toContain('Hạt mang điện tích dương trong hạt nhân');
  });

  it('should evaluate answers correctly in Quiz Me mode and advance card', () => {
    const qchat = new QChatEngine(mockSet);
    qchat.setMode('quiz_me');

    // Answer correctly
    const reply = qchat.sendMessage('Hạt mang điện tích dương trong hạt nhân');
    expect(reply.text).toContain('Chính xác');
    expect(reply.text).toContain('Electron'); // Next question
  });

  it('should provide supportive hint when answer is incorrect', () => {
    const qchat = new QChatEngine(mockSet);
    qchat.setMode('quiz_me');

    const reply = qchat.sendMessage('Không biết');
    expect(reply.text).toContain('Gần đúng rồi');
    expect(reply.text).toContain('Hạt mang điện tích dương');
  });
});
