import React, { createContext, useContext, useMemo, useState } from 'react';
import { buildGameSession } from '../games/engine';
import {
  GameBuildError,
  GameLevel,
  GameSession,
  GameType,
  Player,
  PlayerRosterEntry,
  TurnMode,
  getGamesForLevel,
} from '../games/types';

interface GamesConfig {
  level: GameLevel;
  topic?: string;
  gameType: GameType;
  turnMode: TurnMode;
}

interface StartGameResult {
  ok: boolean;
  reason?: 'missing_players' | 'invalid_roster' | 'build_error';
}

interface MatchingAttemptResult {
  accepted: boolean;
  correct: boolean;
  completed: boolean;
}

interface GamesContextValue {
  config: GamesConfig;
  roster: PlayerRosterEntry[];
  activeSession: GameSession | null;
  resultSession: GameSession | null;
  buildError: GameBuildError | null;
  setConfig: (patch: Partial<GamesConfig>) => void;
  setRoster: (roster: PlayerRosterEntry[]) => void;
  setTurnMode: (turnMode: TurnMode) => void;
  clearBuildError: () => void;
  clearActiveSession: () => void;
  clearGameFlow: () => void;
  setManualCurrentPlayer: (index: number) => void;
  startGame: (teacherId: string) => Promise<StartGameResult>;
  startGameWithRoster: (teacherId: string, roster: PlayerRosterEntry[]) => Promise<StartGameResult>;
  replayLastGame: (teacherId: string) => Promise<StartGameResult>;
  answerCurrentRound: (correct: boolean) => void;
  submitMatchingAttempt: (wordRoundId: string, definitionRoundId: string) => MatchingAttemptResult;
}

const GamesContext = createContext<GamesContextValue | undefined>(undefined);

const DEFAULT_CONFIG: GamesConfig = {
  level: 'A2',
  topic: undefined,
  gameType: 'matching',
  turnMode: 'auto',
};

function sanitizeRoster(input: PlayerRosterEntry[]) {
  const namesSeen = new Set<string>();
  const cleaned: PlayerRosterEntry[] = [];

  for (const player of input) {
    const name = player.name.trim();
    if (!name) return { ok: false as const, value: [] as PlayerRosterEntry[] };
    const key = name.toLocaleLowerCase();
    if (namesSeen.has(key)) return { ok: false as const, value: [] as PlayerRosterEntry[] };
    namesSeen.add(key);
    cleaned.push({ ...player, name });
  }

  if (cleaned.length < 1 || cleaned.length > 6) {
    return { ok: false as const, value: [] as PlayerRosterEntry[] };
  }

  return { ok: true as const, value: cleaned };
}

function isMatchingSession(session: GameSession) {
  return session.gameType === 'matching';
}

function shouldCompleteSession(session: GameSession, nextRoundIndex: number, nextMatched: string[] | undefined) {
  if (isMatchingSession(session)) {
    return (nextMatched?.length ?? 0) >= session.rounds.length;
  }
  return nextRoundIndex >= session.rounds.length;
}

function rotatePlayer(session: GameSession, currentIndex: number) {
  if (session.turnMode !== 'auto') return currentIndex;
  if (session.players.length <= 1) return currentIndex;
  return (currentIndex + 1) % session.players.length;
}

function applyScore(players: Player[], currentPlayerIndex: number, correct: boolean): Player[] {
  if (!correct || players.length === 0) return players;
  return players.map((player, index) => {
    if (index !== currentPlayerIndex) return player;
    return {
      ...player,
      score: player.score + 1,
      correct: player.correct + 1,
    };
  });
}

function normalizeTopic(topic?: string) {
  const trimmed = topic?.trim();
  return trimmed ? trimmed : undefined;
}

export function GamesProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<GamesConfig>(DEFAULT_CONFIG);
  const [roster, setRosterState] = useState<PlayerRosterEntry[]>([]);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [resultSession, setResultSession] = useState<GameSession | null>(null);
  const [buildError, setBuildError] = useState<GameBuildError | null>(null);

  const setConfig = (patch: Partial<GamesConfig>) => {
    setConfigState((prev) => {
      const nextLevel = patch.level ?? prev.level;
      const allowedGames = getGamesForLevel(nextLevel);
      const requestedGameType = patch.gameType ?? prev.gameType;
      const nextGameType = allowedGames.some((game) => game.type === requestedGameType)
        ? requestedGameType
        : allowedGames[0].type;

      const hasTopicPatch = Object.prototype.hasOwnProperty.call(patch, 'topic');
      return {
        ...prev,
        ...patch,
        level: nextLevel,
        gameType: nextGameType,
        topic: hasTopicPatch ? normalizeTopic(patch.topic) : prev.topic,
      };
    });
  };

  const setTurnMode = (turnMode: TurnMode) => {
    setConfigState((prev) => ({ ...prev, turnMode }));
  };

  const setRoster = (nextRoster: PlayerRosterEntry[]) => {
    setRosterState(nextRoster);
  };

  const clearBuildError = () => setBuildError(null);
  const clearActiveSession = () => setActiveSession(null);
  const clearGameFlow = () => {
    setActiveSession(null);
    setResultSession(null);
    setBuildError(null);
  };

  const buildAndStart = async (
    teacherId: string,
    source: { config: GamesConfig; roster: PlayerRosterEntry[] },
  ): Promise<StartGameResult> => {
    const sanitized = sanitizeRoster(source.roster);
    if (!sanitized.ok) {
      setBuildError(null);
      return { ok: false, reason: 'invalid_roster' };
    }

    if (sanitized.value.length === 0) {
      setBuildError(null);
      return { ok: false, reason: 'missing_players' };
    }

    try {
      const session = await buildGameSession({
        teacherId,
        level: source.config.level,
        topic: normalizeTopic(source.config.topic),
        gameType: source.config.gameType,
        players: sanitized.value,
        turnMode: source.config.turnMode,
      });
      setBuildError(null);
      setActiveSession(session);
      setResultSession(null);
      return { ok: true };
    } catch (error: any) {
      if (error && typeof error === 'object' && 'title' in error && 'message' in error) {
        setBuildError(error as GameBuildError);
        setActiveSession(null);
        return { ok: false, reason: 'build_error' };
      }
      console.error('Error building game session:', error);
      setBuildError({
        gameType: source.config.gameType,
        level: source.config.level,
        topic: source.config.topic,
        title: 'Ezin izan da jokoa hasi',
        message: 'Arazo bat gertatu da galderak prestatzean.',
        missing: ['Saiatu berriro segundo batzuk barru.'],
      });
      setActiveSession(null);
      return { ok: false, reason: 'build_error' };
    }
  };

  const startGame = async (teacherId: string) => {
    return buildAndStart(teacherId, { config, roster });
  };

  const startGameWithRoster = async (teacherId: string, nextRoster: PlayerRosterEntry[]) => {
    return buildAndStart(teacherId, { config, roster: nextRoster });
  };

  const replayLastGame = async (teacherId: string) => {
    if (!resultSession) {
      return { ok: false, reason: 'build_error' as const };
    }

    const replayRoster: PlayerRosterEntry[] = resultSession.players.map((player) => ({
      id: player.id,
      name: player.name,
    }));
    setRosterState(replayRoster);

    return buildAndStart(teacherId, {
      config: {
        level: resultSession.level,
        topic: resultSession.topic,
        gameType: resultSession.gameType,
        turnMode: resultSession.turnMode,
      },
      roster: replayRoster,
    });
  };

  const setManualCurrentPlayer = (index: number) => {
    setActiveSession((prev) => {
      if (!prev || prev.turnMode !== 'manual') return prev;
      if (index < 0 || index >= prev.players.length) return prev;
      return { ...prev, currentPlayerIndex: index };
    });
  };

  const answerCurrentRound = (correct: boolean) => {
    setActiveSession((prev) => {
      if (!prev || prev.status !== 'active' || prev.gameType === 'matching') return prev;
      if (prev.roundIndex >= prev.rounds.length) return prev;

      const nextRoundIndex = prev.roundIndex + 1;
      const nextPlayers = applyScore(prev.players, prev.currentPlayerIndex, correct);
      const nextCurrentPlayerIndex = rotatePlayer(prev, prev.currentPlayerIndex);
      const completed = shouldCompleteSession(prev, nextRoundIndex, prev.matchingMatchedRoundIds);

      const nextSession: GameSession = {
        ...prev,
        players: nextPlayers,
        roundIndex: nextRoundIndex,
        currentPlayerIndex: nextCurrentPlayerIndex,
        attemptsCount: prev.attemptsCount + 1,
        status: completed ? 'completed' : 'active',
      };

      if (completed) {
        setResultSession(nextSession);
      }
      return nextSession;
    });
  };

  const submitMatchingAttempt = (wordRoundId: string, definitionRoundId: string): MatchingAttemptResult => {
    let outcome: MatchingAttemptResult = { accepted: false, correct: false, completed: false };

    setActiveSession((prev) => {
      if (!prev || prev.status !== 'active' || prev.gameType !== 'matching') return prev;

      const matchedIds = new Set(prev.matchingMatchedRoundIds ?? []);
      if (matchedIds.has(wordRoundId) || matchedIds.has(definitionRoundId)) {
        return prev;
      }

      const wordRound = prev.rounds.find((round) => round.id === wordRoundId);
      const defRound = prev.rounds.find((round) => round.id === definitionRoundId);
      if (!wordRound || !defRound || wordRound.kind !== 'matching' || defRound.kind !== 'matching') {
        return prev;
      }

      const correct = wordRound.id === defRound.id;
      if (correct) {
        matchedIds.add(wordRound.id);
      }

      const nextMatched = [...matchedIds];
      const nextPlayers = applyScore(prev.players, prev.currentPlayerIndex, correct);
      const nextCurrentPlayerIndex = rotatePlayer(prev, prev.currentPlayerIndex);
      const nextRoundIndex = nextMatched.length;
      const completed = shouldCompleteSession(prev, nextRoundIndex, nextMatched);

      const nextSession: GameSession = {
        ...prev,
        players: nextPlayers,
        matchingMatchedRoundIds: nextMatched,
        roundIndex: nextRoundIndex,
        currentPlayerIndex: nextCurrentPlayerIndex,
        attemptsCount: prev.attemptsCount + 1,
        status: completed ? 'completed' : 'active',
      };

      if (completed) {
        setResultSession(nextSession);
      }

      outcome = { accepted: true, correct, completed };
      return nextSession;
    });

    return outcome;
  };

  const value = useMemo<GamesContextValue>(
    () => ({
      config,
      roster,
      activeSession,
      resultSession,
      buildError,
      setConfig,
      setRoster,
      setTurnMode,
      clearBuildError,
      clearActiveSession,
      clearGameFlow,
      setManualCurrentPlayer,
      startGame,
      startGameWithRoster,
      replayLastGame,
      answerCurrentRound,
      submitMatchingAttempt,
    }),
    [config, roster, activeSession, resultSession, buildError],
  );

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
}

export function useGames() {
  const context = useContext(GamesContext);
  if (!context) {
    throw new Error('useGames must be used within a GamesProvider');
  }
  return context;
}

