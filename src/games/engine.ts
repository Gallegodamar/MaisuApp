import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { Item, normalizeEuKey } from '../types';
import {
  GameBuildError,
  GameBuildInput,
  GameRound,
  GameSession,
  MatchingRound,
  Player,
  StructuresRound,
  SynonymsRound,
} from './types';

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleN<T>(items: T[], count: number): T[] {
  return shuffleArray(items).slice(0, count);
}

function buildInsufficientDataError(input: GameBuildInput, missing: string[], message: string): GameBuildError {
  return {
    gameType: input.gameType,
    level: input.level,
    topic: input.topic,
    title: 'Ez dago nahikoa elementu',
    message,
    missing,
  };
}

function trimTopic(topic?: string) {
  const value = topic?.trim();
  return value ? value : undefined;
}

function isNonEmptyString(value?: string) {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildPlayersForSession(roster: GameBuildInput['players']): Player[] {
  return roster.map((player) => ({
    id: player.id,
    name: player.name,
    score: 0,
    correct: 0,
  }));
}

function normalizeOption(value: string) {
  return normalizeEuKey(value);
}

function uniqueCleanStrings(values: string[] | undefined): string[] {
  if (!values) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const key = normalizeOption(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function buildMatchingRounds(items: Item[]): MatchingRound[] {
  return items.map((item) => ({
    id: uuidv4(),
    kind: 'matching',
    itemId: item.id,
    wordEu: item.eu,
    definitionEs: item.es,
    topic: item.topic,
  }));
}

function buildSynonymsRounds(selectedItems: Item[], allWordPool: Item[]): SynonymsRound[] {
  const rounds: SynonymsRound[] = [];

  for (const item of selectedItems) {
    const synonyms = uniqueCleanStrings(item.synonymsEu);
    const correctSynonym = sampleN(synonyms, 1)[0];
    if (!correctSynonym) {
      throw new Error('synonym_source_missing');
    }

    const banned = new Set<string>([
      normalizeOption(correctSynonym),
      normalizeOption(item.eu),
      ...synonyms.map(normalizeOption),
    ]);

    const distractorCandidates = shuffleArray(
      allWordPool.flatMap((candidate) => {
        if (candidate.id === item.id) return [];

        const values = [
          candidate.eu,
          ...uniqueCleanStrings(candidate.synonymsEu),
        ];

        return values
          .map((value) => value.trim())
          .filter(Boolean)
          .filter((value) => !banned.has(normalizeOption(value)));
      }),
    );

    const uniqueDistractors: string[] = [];
    const seenDistractors = new Set<string>();
    for (const distractor of distractorCandidates) {
      const key = normalizeOption(distractor);
      if (seenDistractors.has(key)) continue;
      seenDistractors.add(key);
      uniqueDistractors.push(distractor);
      if (uniqueDistractors.length === 3) break;
    }

    if (uniqueDistractors.length < 3) {
      throw new Error('synonym_distractors_missing');
    }

    const options = shuffleArray([correctSynonym, ...uniqueDistractors]);
    rounds.push({
      id: uuidv4(),
      kind: 'synonyms',
      itemId: item.id,
      promptEu: item.eu,
      correctSynonym,
      options,
      correctOptionIndex: options.findIndex((value) => normalizeOption(value) === normalizeOption(correctSynonym)),
      topic: item.topic,
    });
  }

  return rounds;
}

function buildStructuresRounds(items: Item[]): StructuresRound[] {
  return items.map((item) => ({
    id: uuidv4(),
    kind: 'structures',
    itemId: item.id,
    structureEu: item.eu,
    explanationEs: item.es,
    exampleEu: item.exampleEu,
    topic: item.topic,
  }));
}

function createBaseSession(input: GameBuildInput, rounds: GameRound[]): GameSession {
  return {
    id: uuidv4(),
    level: input.level,
    topic: input.topic,
    gameType: input.gameType,
    turnMode: input.turnMode,
    players: buildPlayersForSession(input.players),
    currentPlayerIndex: 0,
    roundIndex: 0,
    rounds,
    startedAt: new Date().toISOString(),
    status: 'active',
    matchingMatchedRoundIds: input.gameType === 'matching' ? [] : undefined,
    attemptsCount: 0,
  };
}

export async function buildGameSession(input: GameBuildInput): Promise<GameSession> {
  const topicFilter = trimTopic(input.topic);
  const allTeacherItems = await db.items.where('teacherId').equals(input.teacherId).toArray();
  const levelItems = allTeacherItems.filter((item) => {
    if (item.level !== input.level) return false;
    if (!topicFilter) return true;
    return (item.topic || '').trim() === topicFilter;
  });

  if (input.gameType === 'matching') {
    const candidates = levelItems.filter(
      (item) => item.type === 'hitza' && isNonEmptyString(item.es),
    );
    if (candidates.length < 5) {
      throw buildInsufficientDataError(
        input,
        [
          'Gutxienez 5 hitz behar dituzu definizioarekin (gaztelaniazko eremua) maila horretan.',
          topicFilter ? `Hautatutako gaia: ${topicFilter}` : 'Gaia iragazi gabe probatu dezakezu.',
        ],
        '"Parekatu" jokorako 5 hitz behar dira definizioarekin.',
      );
    }

    const rounds = buildMatchingRounds(sampleN(candidates, 5));
    return createBaseSession(input, rounds);
  }

  if (input.gameType === 'synonyms') {
    const wordPool = levelItems.filter((item) => item.type === 'hitza');
    const synonymCandidates = wordPool.filter((item) => uniqueCleanStrings(item.synonymsEu).length > 0);

    if (synonymCandidates.length < 5) {
      throw buildInsufficientDataError(
        input,
        [
          'Gutxienez 5 hitz behar dituzu `synonymsEu` eremuarekin.',
          'Gehitu sinonimoak "Gehitu" formularioan (komaz bereizita).',
        ],
        '"Sinonimoak" jokorako 5 hitz behar dira sinonimoekin.',
      );
    }

    const selected = sampleN(synonymCandidates, 5);
    try {
      const rounds = buildSynonymsRounds(selected, wordPool);
      return createBaseSession(input, rounds);
    } catch {
      throw buildInsufficientDataError(
        input,
        [
          'Ez dago nahikoa aukera desberdin 4 erantzuneko galderak sortzeko.',
          'Gehitu hitz gehiago edo sinonimo gehiago maila/gaia horretan.',
        ],
        'Ezin dira sortu 5 sinonimo-galdera baliodun uneko datuekin.',
      );
    }
  }

  const structures = levelItems.filter((item) => item.type === 'egitura');
  if (structures.length < 5) {
    throw buildInsufficientDataError(
      input,
      [
        'Gutxienez 5 egitura behar dituzu hautatutako mailan.',
        topicFilter ? `Hautatutako gaia: ${topicFilter}` : 'Gai guztiak erabilita probatu dezakezu.',
      ],
      '"Egiturak" jokorako 5 egitura behar dira.',
    );
  }

  const rounds = buildStructuresRounds(sampleN(structures, 5));
  return createBaseSession(input, rounds);
}

