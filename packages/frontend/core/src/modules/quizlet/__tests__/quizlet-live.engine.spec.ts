import { describe, expect, it } from 'vitest';

import type { TermCardModel } from '../models/study-set.model';
import { QuizletLiveRoom } from '../services/quizlet-live.engine';

describe('QuizletLiveRoom (AC-LIV-01..02)', () => {
  const cards: TermCardModel[] = [
    { id: '1', setId: 's', term: 'T1', definition: 'D1', displayOrder: 0 },
    { id: '2', setId: 's', term: 'T2', definition: 'D2', displayOrder: 1 },
    { id: '3', setId: 's', term: 'T3', definition: 'D3', displayOrder: 2 },
    { id: '4', setId: 's', term: 'T4', definition: 'D4', displayOrder: 3 },
  ];

  it('should initialize room with 6-digit PIN and allow players to join (AC-LIV-01)', () => {
    const room = new QuizletLiveRoom(cards);
    expect(room.roomPin.length).toBe(6);
    expect(room.state).toBe('LOBBY');

    const p1 = room.joinPlayer('p1', 'Alice');
    const p2 = room.joinPlayer('p2', 'Bob');

    expect(p1.id).toBe('p1');
    expect(p2.name).toBe('Bob');

    const teams = room.formTeams(['Tigers', 'Eagles']);
    expect(teams.length).toBe(2);
    expect(room.state).toBe('TEAMS_FORMED');
  });

  it('should distribute cards such that exactly ONE team member has the correct definition (AC-LIV-02)', () => {
    const room = new QuizletLiveRoom(cards);
    room.joinPlayer('p1', 'Alice');
    room.joinPlayer('p2', 'Bob');
    room.formTeams(['Tigers']);
    room.startGame();

    const view1 = room.getPlayerQuestionView('p1');
    const view2 = room.getPlayerQuestionView('p2');

    // Exactly one should have the correct card
    expect(view1.hasCorrectCard !== view2.hasCorrectCard).toBe(true);

    const correctHolderView = view1.hasCorrectCard ? view1 : view2;
    const distractorHolderView = view1.hasCorrectCard ? view2 : view1;

    expect(correctHolderView.hasCorrectCard).toBe(true);
    expect(distractorHolderView.hasCorrectCard).toBe(false);
  });

  it('should increment score when correct, and reset score to 0 when incorrect (AC-LIV-02)', () => {
    const room = new QuizletLiveRoom(cards);
    room.joinPlayer('p1', 'Alice');
    room.joinPlayer('p2', 'Bob');
    room.formTeams(['Tigers']);
    room.startGame();

    // 1st question correct
    const targetCard = room.getTargetCard();
    const res1 = room.submitAnswer('p1', targetCard.definition);
    expect(res1.isCorrect).toBe(true);
    expect(res1.teamScore).toBe(1);

    // 2nd question incorrect -> Penalty reset
    const res2 = room.submitAnswer('p1', 'WrongAnswer');
    expect(res2.isCorrect).toBe(false);
    expect(res2.teamScore).toBe(0);
  });
});
