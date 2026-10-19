import { describe, expect, it } from 'vitest';

import type { TermCardModel } from '../models/study-set.model';
import { MatchGameEngine } from '../services/match-game.engine';

describe('MatchGameEngine (AC-MTC-01)', () => {
  const cards: TermCardModel[] = [
    { id: 'c1', setId: 's1', term: 'T1', definition: 'D1', displayOrder: 0 },
    { id: 'c2', setId: 's1', term: 'T2', definition: 'D2', displayOrder: 1 },
    { id: 'c3', setId: 's1', term: 'T3', definition: 'D3', displayOrder: 2 },
  ];

  it('should initialize 6 tiles for 3 pairs and start timer', () => {
    const engine = new MatchGameEngine(cards, 3);
    const tiles = engine.getTiles();

    expect(tiles.length).toBe(6);
    expect(tiles.filter(t => t.kind === 'term').length).toBe(3);
    expect(tiles.filter(t => t.kind === 'definition').length).toBe(3);

    const stats = engine.getStats();
    expect(stats.totalPairs).toBe(3);
    expect(stats.isCompleted).toBe(false);
  });

  it('should match matching term and definition and mark isMatched', () => {
    const engine = new MatchGameEngine(cards, 3);
    const termTile = engine
      .getTiles()
      .find(t => t.cardId === 'c1' && t.kind === 'term')!;
    const defTile = engine
      .getTiles()
      .find(t => t.cardId === 'c1' && t.kind === 'definition')!;

    // Select first
    const res1 = engine.selectTile(termTile.id);
    expect(res1.isMatch).toBe(false);
    expect(termTile.isSelected).toBe(true);

    // Select matching second
    const res2 = engine.selectTile(defTile.id);
    expect(res2.isMatch).toBe(true);
    expect(termTile.isMatched).toBe(true);
    expect(defTile.isMatched).toBe(true);
  });

  it('should apply +1.0s penalty when mismatch occurs', () => {
    const engine = new MatchGameEngine(cards, 3);
    const termTile = engine
      .getTiles()
      .find(t => t.cardId === 'c1' && t.kind === 'term')!;
    const wrongDefTile = engine
      .getTiles()
      .find(t => t.cardId === 'c2' && t.kind === 'definition')!;

    engine.selectTile(termTile.id);
    const res = engine.selectTile(wrongDefTile.id);

    expect(res.isMismatch).toBe(true);
    expect(termTile.isError).toBe(true);
    expect(wrongDefTile.isError).toBe(true);

    const stats = engine.getStats();
    expect(stats.penaltySeconds).toBe(1.0);
    expect(stats.totalTime).toBeGreaterThanOrEqual(1.0);
  });

  it('should complete game when all pairs are matched', () => {
    const engine = new MatchGameEngine(cards.slice(0, 2), 2);

    cards.slice(0, 2).forEach(c => {
      const t = engine
        .getTiles()
        .find(tile => tile.cardId === c.id && tile.kind === 'term')!;
      const d = engine
        .getTiles()
        .find(tile => tile.cardId === c.id && tile.kind === 'definition')!;
      engine.selectTile(t.id);
      engine.selectTile(d.id);
    });

    const stats = engine.getStats();
    expect(stats.isCompleted).toBe(true);
    expect(stats.matchedPairs).toBe(2);
  });
});
