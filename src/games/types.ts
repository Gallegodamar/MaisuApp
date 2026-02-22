import { Level } from '../types';

export type GameLevel = Extract<Level, 'A2' | 'B1' | 'B2' | 'C1'>;
export type GameType = 'matching' | 'synonyms' | 'structures';
export type TurnMode = 'auto' | 'manual';

export interface PlayerRosterEntry {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  correct: number;
}

export interface MatchingRound {
  id: string;
  kind: 'matching';
  itemId: string;
  wordEu: string;
  definitionEs: string;
  topic?: string;
}

export interface SynonymsRound {
  id: string;
  kind: 'synonyms';
  itemId: string;
  promptEu: string;
  correctSynonym: string;
  options: string[];
  correctOptionIndex: number;
  topic?: string;
}

export interface StructuresRound {
  id: string;
  kind: 'structures';
  itemId: string;
  structureEu: string;
  explanationEs: string;
  exampleEu?: string;
  topic?: string;
}

export type GameRound = MatchingRound | SynonymsRound | StructuresRound;

export interface GameSession {
  id: string;
  level: GameLevel;
  topic?: string;
  gameType: GameType;
  turnMode: TurnMode;
  players: Player[];
  currentPlayerIndex: number;
  roundIndex: number;
  rounds: GameRound[];
  startedAt: string;
  status: 'active' | 'completed';
  matchingMatchedRoundIds?: string[];
  attemptsCount: number;
}

export interface GameBuildError {
  gameType: GameType;
  level: GameLevel;
  topic?: string;
  title: string;
  message: string;
  missing: string[];
}

export interface GameBuildInput {
  teacherId: string;
  level: GameLevel;
  topic?: string;
  gameType: GameType;
  players: PlayerRosterEntry[];
  turnMode: TurnMode;
}

export interface GameDefinition {
  type: GameType;
  label: string;
  description: string;
}

export const GAMES_BY_LEVEL: Record<GameLevel, GameDefinition[]> = {
  A2: [
    {
      type: 'matching',
      label: 'Parekatu',
      description: 'Parekatu hitzak eta gaztelaniazko definizioak.',
    },
    {
      type: 'synonyms',
      label: 'Sinonimoak',
      description: 'Aukeratu sinonimo zuzena 4 aukeren artean.',
    },
  ],
  B1: [
    {
      type: 'matching',
      label: 'Parekatu',
      description: 'Parekatu hitzak eta gaztelaniazko definizioak.',
    },
    {
      type: 'synonyms',
      label: 'Sinonimoak',
      description: 'Aukeratu sinonimo zuzena 4 aukeren artean.',
    },
  ],
  B2: [
    {
      type: 'synonyms',
      label: 'Sinonimoak',
      description: 'Aukeratu sinonimo zuzena 4 aukeren artean.',
    },
    {
      type: 'structures',
      label: 'Egiturak',
      description: 'Sortu esaldi bat eta irakasleak baloratuko du zuzena den.',
    },
  ],
  C1: [
    {
      type: 'synonyms',
      label: 'Sinonimoak',
      description: 'Aukeratu sinonimo zuzena 4 aukeren artean.',
    },
    {
      type: 'structures',
      label: 'Egiturak',
      description: 'Sortu esaldi bat eta irakasleak baloratuko du zuzena den.',
    },
  ],
};

export function getGamesForLevel(level: GameLevel): GameDefinition[] {
  return GAMES_BY_LEVEL[level];
}

export function getGameLabel(gameType: GameType): string {
  const definitions = Object.values(GAMES_BY_LEVEL).flat();
  return definitions.find((game) => game.type === gameType)?.label ?? gameType;
}

export function sortPlayersForRanking(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correct !== a.correct) return b.correct - a.correct;
    return a.name.localeCompare(b.name, 'eu');
  });
}
