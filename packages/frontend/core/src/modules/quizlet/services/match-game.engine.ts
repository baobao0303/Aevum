/**
 * Match Game Engine with 0.1s High Precision Timer & Penalty Mechanism
 * Complies with SPEC-QUIZLET-RE-2026-V1 Section 4.3.D & AC-MTC-01
 */

import type { TermCardModel } from '../models/study-set.model';

export interface MatchTile {
  id: string;
  cardId: string;
  kind: 'term' | 'definition';
  text: string;
  isMatched: boolean;
  isSelected: boolean;
  isError: boolean;
}

export interface MatchGameStats {
  elapsedSeconds: number;
  penaltySeconds: number;
  totalTime: number;
  matchedPairs: number;
  totalPairs: number;
  isCompleted: boolean;
}

export class MatchGameEngine {
  private tiles: MatchTile[] = [];
  private selectedTileId: string | null = null;
  private startTime: number = 0;
  private endTime: number = 0;
  private penaltySeconds: number = 0;
  private isRunning: boolean = false;
  private readonly totalPairs: number = 0;

  constructor(cards: TermCardModel[], pairCount = 6) {
    if (cards.length < 2) {
      throw new Error('Match game requires at least 2 cards');
    }
    this.totalPairs = Math.min(pairCount, cards.length);
    this.initializeTiles(cards.slice(0, this.totalPairs));
  }

  private initializeTiles(cards: TermCardModel[]): void {
    const rawTiles: MatchTile[] = [];
    cards.forEach(card => {
      rawTiles.push({
        id: `term_${card.id}`,
        cardId: card.id,
        kind: 'term',
        text: card.term,
        isMatched: false,
        isSelected: false,
        isError: false,
      });
      rawTiles.push({
        id: `def_${card.id}`,
        cardId: card.id,
        kind: 'definition',
        text: card.definition,
        isMatched: false,
        isSelected: false,
        isError: false,
      });
    });

    // Shuffle tiles
    this.tiles = rawTiles.sort(() => 0.5 - Math.random());
    this.startTime = Date.now();
    this.isRunning = true;
  }

  public getTiles(): MatchTile[] {
    return this.tiles;
  }

  public selectTile(tileId: string): {
    isMatch: boolean;
    isMismatch: boolean;
    gameFinished: boolean;
  } {
    if (!this.isRunning) {
      return { isMatch: false, isMismatch: false, gameFinished: false };
    }

    const tile = this.tiles.find(t => t.id === tileId);
    if (!tile || tile.isMatched) {
      return { isMatch: false, isMismatch: false, gameFinished: false };
    }

    // Reset error states
    this.tiles.forEach(t => (t.isError = false));

    // First tile selected
    if (!this.selectedTileId) {
      this.selectedTileId = tileId;
      tile.isSelected = true;
      return { isMatch: false, isMismatch: false, gameFinished: false };
    }

    // Clicking same tile deselects
    if (this.selectedTileId === tileId) {
      this.selectedTileId = null;
      tile.isSelected = false;
      return { isMatch: false, isMismatch: false, gameFinished: false };
    }

    // Second tile selected -> Check pair
    const prevTile = this.tiles.find(t => t.id === this.selectedTileId);
    if (!prevTile) {
      this.selectedTileId = tile.id;
      tile.isSelected = true;
      return { isMatch: false, isMismatch: false, gameFinished: false };
    }
    prevTile.isSelected = false;
    this.selectedTileId = null;

    // Must be opposite kind and same cardId
    if (prevTile.cardId === tile.cardId && prevTile.kind !== tile.kind) {
      // MATCH!
      prevTile.isMatched = true;
      tile.isMatched = true;

      const allMatched = this.tiles.every(t => t.isMatched);
      if (allMatched) {
        this.endTime = Date.now();
        this.isRunning = false;
        return { isMatch: true, isMismatch: false, gameFinished: true };
      }
      return { isMatch: true, isMismatch: false, gameFinished: false };
    } else {
      // MISMATCH -> Apply +1.0s penalty
      prevTile.isError = true;
      tile.isError = true;
      this.penaltySeconds += 1.0;
      return { isMatch: false, isMismatch: true, gameFinished: false };
    }
  }

  public getStats(): MatchGameStats {
    const now = this.endTime || Date.now();
    const rawElapsed = (now - this.startTime) / 1000;
    const roundedElapsed = Math.round(rawElapsed * 10) / 10;
    const matchedCount = this.tiles.filter(t => t.isMatched).length / 2;

    return {
      elapsedSeconds: roundedElapsed,
      penaltySeconds: this.penaltySeconds,
      totalTime: Math.round((roundedElapsed + this.penaltySeconds) * 10) / 10,
      matchedPairs: matchedCount,
      totalPairs: this.totalPairs,
      isCompleted: !this.isRunning && matchedCount === this.totalPairs,
    };
  }
}
