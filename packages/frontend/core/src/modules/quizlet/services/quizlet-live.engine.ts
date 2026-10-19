/**
 * Quizlet Live Realtime Arena Engine
 * Complies with SPEC-QUIZLET-RE-2026-V1 Section 8.2 & AC-LIV-01..02
 */

import type { TermCardModel } from '../models/study-set.model';

export type RoomState = 'LOBBY' | 'TEAMS_FORMED' | 'IN_GAME' | 'PODIUM';

export interface Player {
  id: string;
  name: string;
  teamId?: string;
  isHost?: boolean;
}

export interface Team {
  id: string;
  name: string; // e.g. Tigers, Eagles, Lions
  score: number;
  playerIds: string[];
  isFrozen?: boolean;
}

export interface PlayerQuestionView {
  term: string;
  options: string[];
  hasCorrectCard: boolean;
}

export class QuizletLiveRoom {
  public roomPin: string;
  public state: RoomState = 'LOBBY';
  private readonly players: Map<string, Player> = new Map();
  private readonly teams: Map<string, Team> = new Map();
  private readonly cards: TermCardModel[];
  private currentCardIndex: number = 0;
  public winningTeamId: string | null = null;
  public targetScore: number = 12;

  constructor(cards: TermCardModel[], pin?: string) {
    if (cards.length < 4) {
      throw new Error('Quizlet Live requires at least 4 cards');
    }
    this.cards = [...cards].sort(() => 0.5 - Math.random());
    this.roomPin =
      pin || Math.floor(100000 + Math.random() * 900000).toString();
  }

  public joinPlayer(id: string, name: string, isHost = false): Player {
    if (this.state !== 'LOBBY') {
      throw new Error('Cannot join room: Game has already started');
    }
    const player: Player = { id, name: name.trim(), isHost };
    this.players.set(id, player);
    return player;
  }

  public formTeams(
    teamNames = ['Tigers', 'Eagles', 'Lions', 'Pandas']
  ): Team[] {
    const studentList = Array.from(this.players.values()).filter(
      p => !p.isHost
    );
    if (studentList.length < 2) {
      throw new Error(
        'Quizlet Live requires at least 2 players to form teams (AC-LIV-01)'
      );
    }

    this.teams.clear();
    const effectiveTeamCount = Math.min(
      teamNames.length,
      Math.max(2, Math.floor(studentList.length / 2))
    );

    for (let i = 0; i < effectiveTeamCount; i++) {
      const teamId = `team_${i + 1}`;
      this.teams.set(teamId, {
        id: teamId,
        name: teamNames[i],
        score: 0,
        playerIds: [],
      });
    }

    const teamList = Array.from(this.teams.values());
    studentList.forEach((player, idx) => {
      const assignedTeam = teamList[idx % teamList.length];
      assignedTeam.playerIds.push(player.id);
      player.teamId = assignedTeam.id;
    });

    this.state = 'TEAMS_FORMED';
    return teamList;
  }

  public startGame(): void {
    if (this.teams.size === 0) {
      this.formTeams();
    }
    this.state = 'IN_GAME';
    this.currentCardIndex = 0;
  }

  public getTargetCard(): TermCardModel {
    return this.cards[this.currentCardIndex % this.cards.length];
  }

  public getPlayerQuestionView(playerId: string): PlayerQuestionView {
    if (this.state !== 'IN_GAME') {
      throw new Error('Game is not currently active');
    }

    const player = this.players.get(playerId);
    if (!player || !player.teamId) {
      throw new Error('Player not in an active team');
    }

    const team = this.teams.get(player.teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    const currentCard = this.cards[this.currentCardIndex % this.cards.length];

    // Pick 1 designated player in the team to hold the correct card
    const designatedHolderId =
      team.playerIds[this.currentCardIndex % team.playerIds.length];
    const hasCorrectCard = player.id === designatedHolderId;

    const otherCards = this.cards.filter(c => c.id !== currentCard.id);
    const shuffledDistractors = [...otherCards].sort(() => 0.5 - Math.random());

    let options: string[];
    if (hasCorrectCard) {
      // 1 correct + 3 distractors
      const distractors = shuffledDistractors
        .slice(0, 3)
        .map(c => c.definition);
      options = [currentCard.definition, ...distractors].sort(
        () => 0.5 - Math.random()
      );
    } else {
      // 4 pure distractors
      options = shuffledDistractors
        .slice(0, 4)
        .map(c => c.definition)
        .sort(() => 0.5 - Math.random());
    }

    return {
      term: currentCard.term,
      options,
      hasCorrectCard,
    };
  }

  public submitAnswer(
    playerId: string,
    chosenDefinition: string
  ): { isCorrect: boolean; teamScore: number; isGameOver: boolean } {
    if (this.state !== 'IN_GAME') {
      throw new Error('Game is not active');
    }

    const player = this.players.get(playerId);
    if (!player || !player.teamId) {
      throw new Error('Player not in an active team');
    }

    const team = this.teams.get(player.teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    const currentCard = this.cards[this.currentCardIndex % this.cards.length];

    if (chosenDefinition === currentCard.definition) {
      // Correct!
      team.score += 1;
      this.currentCardIndex++;

      if (team.score >= this.targetScore) {
        this.state = 'PODIUM';
        this.winningTeamId = team.id;
        return { isCorrect: true, teamScore: team.score, isGameOver: true };
      }
      return { isCorrect: true, teamScore: team.score, isGameOver: false };
    } else {
      // AC-LIV-02: Incorrect answer resets team score to 0
      team.score = 0;
      team.isFrozen = true;
      return { isCorrect: false, teamScore: 0, isGameOver: false };
    }
  }

  public getLeaderboard(): Array<{
    teamId: string;
    teamName: string;
    score: number;
  }> {
    return Array.from(this.teams.values())
      .map(t => ({ teamId: t.id, teamName: t.name, score: t.score }))
      .sort((a, b) => b.score - a.score);
  }
}
