import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Trophy, Medal, Home } from 'lucide-react';
import Layout from '../components/Layout';
import { useGames } from '../contexts/GamesContext';
import { useTeacher } from '../contexts/TeacherContext';
import { getGameLabel, sortPlayersForRanking } from '../games/types';

export default function GamesResults() {
  const navigate = useNavigate();
  const { currentTeacher } = useTeacher();
  const { resultSession, replayLastGame, clearBuildError } = useGames();
  const [replaying, setReplaying] = useState(false);

  const ranking = useMemo(
    () => (resultSession ? sortPlayersForRanking(resultSession.players) : []),
    [resultSession],
  );

  if (!resultSession) {
    return (
      <Layout title="Sailkapena" showBackButton hideBottomNav>
        <div className="max-w-3xl mx-auto py-16 text-center">
          <p className="text-zinc-500 font-bold">Ez dago erakusteko emaitzarik.</p>
          <button onClick={() => navigate('/games')} className="mt-4 text-blue-500 font-black underline">
            Itzuli Jokoetara
          </button>
        </div>
      </Layout>
    );
  }

  const handleReplay = async () => {
    if (!currentTeacher) return;
    setReplaying(true);
    try {
      const result = await replayLastGame(currentTeacher.id);
      navigate(`/games/play/${resultSession.gameType}`);
      if (!result.ok) {
        // The play screen will render the empty-state with the human message.
      }
    } finally {
      setReplaying(false);
    }
  };

  return (
    <Layout title="Sailkapena" hideBottomNav>
      <div className="max-w-4xl mx-auto space-y-8 py-4">
        <section className="bg-white border-2 border-zinc-100 rounded-[2.5rem] p-6 md:p-10 shadow-sm">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 text-amber-500 border border-amber-100">
              <Trophy size={30} />
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900">Amaierako sailkapena</h2>
            <p className="text-zinc-500 font-medium">
              {resultSession.level} · {getGameLabel(resultSession.gameType)} · {resultSession.topic || 'Guztiak'}
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {ranking.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center justify-between gap-4 p-4 rounded-2xl border-2 ${
                  index === 0 ? 'bg-amber-50 border-amber-200' : 'bg-zinc-50 border-zinc-100'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black ${
                    index === 0 ? 'bg-white text-amber-600 border border-amber-200' : 'bg-white text-zinc-500 border border-zinc-100'
                  }`}>
                    {index === 0 ? <Medal size={20} /> : index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-black text-zinc-900 truncate">{player.name}</p>
                    <p className="text-sm text-zinc-500 font-medium">Asmatutakoak: {player.correct}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Puntuak</p>
                  <p className="text-3xl font-black text-blue-600">{player.score}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleReplay}
            disabled={replaying}
            className="py-5 rounded-[1.5rem] bg-blue-500 text-white font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              <RotateCcw size={20} />
              {replaying ? 'Prestatzen...' : 'Berriro jokatu'}
            </span>
          </button>
          <button
            onClick={() => {
              clearBuildError();
              navigate('/games');
            }}
            className="py-5 rounded-[1.5rem] bg-white border-2 border-zinc-100 text-zinc-700 font-black text-lg hover:border-blue-200 transition-all active:scale-95"
          >
            <span className="inline-flex items-center gap-2">
              <Home size={20} />
              Itzuli Jokoetara
            </span>
          </button>
        </section>
      </div>
    </Layout>
  );
}
