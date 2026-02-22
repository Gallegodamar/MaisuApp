import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, Trophy, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { useGames } from '../contexts/GamesContext';
import { useTeacher } from '../contexts/TeacherContext';
import {
  GameType,
  MatchingRound,
  StructuresRound,
  SynonymsRound,
  getGameLabel,
} from '../games/types';

function shuffleIds(ids: string[]) {
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ProgressBar({ value, total, label }: { value: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-zinc-400">
        <span>{label}</span>
        <span>{value} / {total}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function GamesPlay() {
  const navigate = useNavigate();
  const { mode } = useParams();
  const { currentTeacher } = useTeacher();
  const {
    activeSession,
    buildError,
    answerCurrentRound,
    submitMatchingAttempt,
    setManualCurrentPlayer,
    clearBuildError,
    clearActiveSession,
  } = useGames();

  const gameMode = mode as GameType | undefined;
  const [matchWordId, setMatchWordId] = useState<string | null>(null);
  const [matchDefId, setMatchDefId] = useState<string | null>(null);
  const [matchFeedback, setMatchFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [lockedSynonymAnswer, setLockedSynonymAnswer] = useState<{ roundId: string; selectedIndex: number; correct: boolean } | null>(null);
  const [showExample, setShowExample] = useState(false);
  const [structureText, setStructureText] = useState('');
  const matchFeedbackTimeoutRef = useRef<number | null>(null);
  const definitionOrder = useMemo(() => {
    if (!activeSession || activeSession.gameType !== 'matching') return [];
    return shuffleIds((activeSession.rounds as MatchingRound[]).map((round) => round.id));
  }, [activeSession?.id, activeSession?.gameType]);

  useEffect(() => {
    if (activeSession?.status === 'completed') {
      navigate('/games/results');
    }
  }, [activeSession?.status, navigate]);

  useEffect(() => {
    if (!activeSession || activeSession.status === 'completed') return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [activeSession?.id, activeSession?.status]);

  useEffect(() => {
    return () => {
      if (matchFeedbackTimeoutRef.current) {
        window.clearTimeout(matchFeedbackTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setLockedSynonymAnswer(null);
    setShowExample(false);
    setStructureText('');
  }, [activeSession?.roundIndex, activeSession?.id]);

  if (!gameMode || !['matching', 'synonyms', 'structures'].includes(gameMode)) {
    return (
      <Layout title="Jokoak" showBackButton hideBottomNav>
        <div className="max-w-3xl mx-auto py-16 text-center">
          <p className="text-zinc-500 font-bold">Joko baliogabea.</p>
          <button onClick={() => navigate('/games')} className="mt-4 text-blue-500 font-black underline">
            Itzuli Jokoetara
          </button>
        </div>
      </Layout>
    );
  }

  const handleSoftExit = () => {
    const confirmed = window.confirm('Partida honetako aurrerapena galduko da. Irten?');
    if (!confirmed) return;
    clearActiveSession();
    clearBuildError();
    navigate('/games');
  };

  if (buildError && (!activeSession || activeSession.gameType === gameMode)) {
    return (
      <Layout
        title="Jokoak"
        hideBottomNav
        rightElement={
          <button
            onClick={() => {
              clearBuildError();
              navigate('/games');
            }}
            className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-black"
          >
            Itxi
          </button>
        }
      >
        <div className="max-w-3xl mx-auto py-8 space-y-6">
          <div className="bg-white border-2 border-zinc-100 rounded-[2.5rem] p-8">
            <h2 className="text-3xl font-black tracking-tight text-zinc-900">{buildError.title}</h2>
            <p className="mt-3 text-zinc-600 font-medium text-lg">{buildError.message}</p>
            <div className="mt-6 space-y-2">
              {buildError.missing.map((line) => (
                <p key={line} className="text-zinc-700 font-medium">
                  • {line}
                </p>
              ))}
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  clearBuildError();
                  navigate('/add');
                }}
                className="py-4 rounded-2xl bg-blue-500 text-white font-black text-lg shadow-xl shadow-blue-500/20"
              >
                Joan Gehitzera
              </button>
              <button
                onClick={() => {
                  clearBuildError();
                  navigate('/games');
                }}
                className="py-4 rounded-2xl border-2 border-zinc-100 bg-white font-black text-zinc-700"
              >
                Itzuli Jokoetara
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!activeSession || activeSession.gameType !== gameMode) {
    return (
      <Layout title="Jokoak" hideBottomNav>
        <div className="max-w-3xl mx-auto py-16 text-center">
          <p className="text-zinc-500 font-bold">Ez dago partida aktiborik.</p>
          <button onClick={() => navigate('/games')} className="mt-4 text-blue-500 font-black underline">
            Itzuli Jokoetara
          </button>
        </div>
      </Layout>
    );
  }

  const currentPlayer = activeSession.players[activeSession.currentPlayerIndex];
  const isManualTurns = activeSession.turnMode === 'manual';
  const matchingRounds = activeSession.rounds as MatchingRound[];
  const matchedRoundIds = new Set(activeSession.matchingMatchedRoundIds || []);

  const currentRound =
    activeSession.gameType === 'matching'
      ? null
      : activeSession.rounds[activeSession.roundIndex] || null;

  const progressValue = activeSession.gameType === 'matching'
    ? activeSession.matchingMatchedRoundIds?.length || 0
    : Math.min(activeSession.roundIndex + 1, activeSession.rounds.length);

  const progressLabel = activeSession.gameType === 'matching' ? 'Bikoteak' : 'Galdera';

  const onSelectWord = (roundId: string) => {
    if (activeSession.gameType !== 'matching') return;
    if (matchedRoundIds.has(roundId) || matchFeedback) return;
    const nextWord = matchWordId === roundId ? null : roundId;
    setMatchWordId(nextWord);

    if (nextWord && matchDefId) {
      resolveMatchingAttempt(nextWord, matchDefId);
    }
  };

  const onSelectDefinition = (roundId: string) => {
    if (activeSession.gameType !== 'matching') return;
    if (matchedRoundIds.has(roundId) || matchFeedback) return;
    const nextDef = matchDefId === roundId ? null : roundId;
    setMatchDefId(nextDef);

    if (matchWordId && nextDef) {
      resolveMatchingAttempt(matchWordId, nextDef);
    }
  };

  const resolveMatchingAttempt = (wordRoundId: string, definitionRoundId: string) => {
    const result = submitMatchingAttempt(wordRoundId, definitionRoundId);
    if (!result.accepted) return;

    setMatchFeedback({
      correct: result.correct,
      text: result.correct ? 'Zuzena' : 'Okerra',
    });
    setMatchWordId(null);
    setMatchDefId(null);

    if (matchFeedbackTimeoutRef.current) {
      window.clearTimeout(matchFeedbackTimeoutRef.current);
    }
    matchFeedbackTimeoutRef.current = window.setTimeout(() => {
      setMatchFeedback(null);
    }, 900);
  };

  const submitSynonymAnswer = (selectedIndex: number) => {
    if (!currentRound || currentRound.kind !== 'synonyms') return;
    if (lockedSynonymAnswer) return;

    const correct = selectedIndex === currentRound.correctOptionIndex;
    setLockedSynonymAnswer({ roundId: currentRound.id, selectedIndex, correct });
  };

  const confirmSynonymAndNext = () => {
    if (!lockedSynonymAnswer) return;
    answerCurrentRound(lockedSynonymAnswer.correct);
    setLockedSynonymAnswer(null);
  };

  const markStructure = (correct: boolean) => {
    answerCurrentRound(correct);
  };

  return (
    <Layout
      title={`Jokoak · ${getGameLabel(activeSession.gameType)}`}
      hideBottomNav
      rightElement={
        <button
          onClick={handleSoftExit}
          className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 font-black hover:bg-zinc-200 transition-colors"
        >
          Irten
        </button>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6 py-2">
        <section className="bg-white border-2 border-zinc-100 rounded-[2rem] p-4 md:p-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-zinc-50 border-2 border-zinc-100 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Maila</p>
              <p className="text-2xl font-black text-zinc-900">{activeSession.level}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 border-2 border-zinc-100 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Jokoa</p>
              <p className="text-xl font-black text-zinc-900">{getGameLabel(activeSession.gameType)}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 border-2 border-zinc-100 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Gaia</p>
              <p className="text-lg font-black text-zinc-900">{activeSession.topic || 'Guztiak'}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 border-2 border-zinc-100 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Uneko jokalaria</p>
              <p className="text-xl md:text-2xl font-black text-blue-600">
                {currentPlayer?.name || 'Jokalaririk ez'}
              </p>
            </div>
          </div>

          <ProgressBar value={progressValue} total={activeSession.rounds.length} label={progressLabel} />

          {isManualTurns && (
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Txanda/puntua honi eman</p>
              <div className="flex flex-wrap gap-2">
                {activeSession.players.map((player, index) => (
                  <button
                    key={player.id}
                    onClick={() => setManualCurrentPlayer(index)}
                    className={`px-4 py-2 rounded-2xl border-2 font-black transition-all ${
                      index === activeSession.currentPlayerIndex
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-zinc-600 border-zinc-100'
                    }`}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {activeSession.gameType === 'matching' && (
          <section className="space-y-4">
            {matchFeedback && (
              <div
                className={`p-4 rounded-2xl font-black text-center text-lg ${
                  matchFeedback.correct ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-100' : 'bg-red-50 text-red-700 border-2 border-red-100'
                }`}
              >
                {matchFeedback.text}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white border-2 border-zinc-100 rounded-[2rem] p-4 md:p-6">
                <h3 className="text-xl font-black tracking-tight text-zinc-900 mb-4">Hitzak (Euskara)</h3>
                <div className="grid gap-3">
                  {matchingRounds.map((round) => {
                    const isMatched = matchedRoundIds.has(round.id);
                    const isSelected = matchWordId === round.id;
                    return (
                      <button
                        key={round.id}
                        onClick={() => onSelectWord(round.id)}
                        disabled={isMatched}
                        className={`text-left p-5 rounded-2xl border-2 font-black text-xl transition-all ${
                          isMatched
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-zinc-50 border-zinc-100 text-zinc-800 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{round.wordEu}</span>
                          {isMatched && <CheckCircle2 size={20} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border-2 border-zinc-100 rounded-[2rem] p-4 md:p-6">
                <h3 className="text-xl font-black tracking-tight text-zinc-900 mb-4">Definizioak (gaztelaniaz)</h3>
                <div className="grid gap-3">
                  {definitionOrder.map((roundId) => {
                    const round = matchingRounds.find((item) => item.id === roundId);
                    if (!round) return null;
                    const isMatched = matchedRoundIds.has(round.id);
                    const isSelected = matchDefId === round.id;
                    return (
                      <button
                        key={round.id}
                        onClick={() => onSelectDefinition(round.id)}
                        disabled={isMatched}
                        className={`text-left p-5 rounded-2xl border-2 font-bold text-lg transition-all ${
                          isMatched
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-zinc-50 border-zinc-100 text-zinc-700 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{round.definitionEs}</span>
                          {isMatched && <CheckCircle2 size={20} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSession.gameType === 'synonyms' && currentRound && currentRound.kind === 'synonyms' && (
          <section className="bg-white border-2 border-zinc-100 rounded-[2.5rem] p-6 md:p-10 space-y-8 shadow-sm">
            <div className="text-center space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Aukeratu sinonimo zuzena</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-900">
                {currentRound.promptEu}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentRound.options.map((option, index) => {
                const isLocked = lockedSynonymAnswer?.roundId === currentRound.id;
                const isSelected = lockedSynonymAnswer?.selectedIndex === index;
                const isCorrect = index === currentRound.correctOptionIndex;
                const classes = isLocked
                  ? isCorrect
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : isSelected
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : 'border-zinc-100 bg-zinc-50 text-zinc-400'
                  : 'border-zinc-100 bg-zinc-50 text-zinc-800 hover:border-blue-200';

                return (
                  <button
                    key={`${currentRound.id}-${option}-${index}`}
                    onClick={() => submitSynonymAnswer(index)}
                    disabled={isLocked}
                    className={`p-5 md:p-6 rounded-[1.5rem] border-2 font-black text-xl md:text-2xl text-left transition-all active:scale-[0.99] ${classes}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {lockedSynonymAnswer?.roundId === currentRound.id && (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-2xl border-2 font-black text-lg ${
                    lockedSynonymAnswer.correct
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : 'bg-red-50 border-red-100 text-red-700'
                  }`}
                >
                  {lockedSynonymAnswer.correct ? 'Zuzena' : `Okerra. Zuzena hau zen: ${currentRound.correctSynonym}`}
                </div>
                <button
                  onClick={confirmSynonymAndNext}
                  className="w-full py-5 rounded-2xl bg-blue-500 text-white font-black text-xl shadow-xl shadow-blue-500/20"
                >
                  <span className="inline-flex items-center gap-2">
                    {activeSession.roundIndex >= activeSession.rounds.length - 1 ? <Trophy size={20} /> : <ArrowRight size={20} />}
                    {activeSession.roundIndex >= activeSession.rounds.length - 1 ? 'Ikusi sailkapena' : 'Hurrengoa'}
                  </span>
                </button>
              </div>
            )}
          </section>
        )}

        {activeSession.gameType === 'structures' && currentRound && currentRound.kind === 'structures' && (
          <section className="bg-white border-2 border-zinc-100 rounded-[2.5rem] p-6 md:p-10 space-y-8 shadow-sm">
            <div className="space-y-4 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Egiturak · Sortu esaldi bat</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-zinc-900">
                {currentRound.structureEu}
              </h2>
              {currentRound.explanationEs && !['B2', 'C1'].includes(activeSession.level) && (
                <p className="text-lg md:text-2xl font-bold text-blue-600">{currentRound.explanationEs}</p>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">
                Ikaslearen erantzuna (aukerakoa)
              </label>
              <textarea
                value={structureText}
                onChange={(e) => setStructureText(e.target.value)}
                placeholder="Hemen idatz dezakezu esaldia (aukerakoa erantzuna ahoz bada)"
                className="w-full h-32 p-4 rounded-2xl bg-zinc-50 border-2 border-zinc-100 font-medium outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {currentRound.exampleEu && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowExample((prev) => !prev)}
                  className="px-4 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-black hover:bg-zinc-200 transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Eye size={16} />
                    {showExample ? 'Ezkutatu adibidea' : 'Erakutsi adibidea'}
                  </span>
                </button>
                {showExample && (
                  <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-100 text-blue-800 font-medium italic">
                    "{currentRound.exampleEu}"
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => markStructure(true)}
                className="py-6 rounded-[1.5rem] bg-emerald-500 text-white font-black text-2xl shadow-xl shadow-emerald-500/20"
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={24} />
                  Zuzena
                </span>
              </button>
              <button
                onClick={() => markStructure(false)}
                className="py-6 rounded-[1.5rem] bg-red-500 text-white font-black text-2xl shadow-xl shadow-red-500/20"
              >
                <span className="inline-flex items-center gap-2">
                  <XCircle size={24} />
                  Okerra
                </span>
              </button>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
