import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Gamepad2, Play, Users, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import { db } from '../db';
import { useTeacher } from '../contexts/TeacherContext';
import { useGames } from '../contexts/GamesContext';
import { GameLevel, getGameLabel, getGamesForLevel } from '../games/types';

const LEVELS: GameLevel[] = ['A2', 'B1', 'B2', 'C1'];

export default function GamesHub() {
  const navigate = useNavigate();
  const { currentTeacher } = useTeacher();
  const { config, roster, setConfig, clearBuildError, startGame } = useGames();
  const [starting, setStarting] = useState(false);

  const topics = useLiveQuery(async () => {
    if (!currentTeacher) return [];
    const items = await db.items.where('teacherId').equals(currentTeacher.id).toArray();
    return Array.from(
      new Set(
        items
          .filter((item) => item.level === config.level)
          .map((item) => item.topic?.trim())
          .filter((topic): topic is string => Boolean(topic)),
      ),
    ).sort((a, b) => a.localeCompare(b, 'eu'));
  }, [currentTeacher, config.level]);

  const availableGames = getGamesForLevel(config.level);

  useEffect(() => {
    if (config.topic && topics && !topics.includes(config.topic)) {
      setConfig({ topic: undefined });
    }
  }, [config.topic, topics, setConfig]);

  const handleStart = async () => {
    if (!currentTeacher) return;
    clearBuildError();
    if (roster.length === 0) {
      navigate('/games/setup');
      return;
    }

    setStarting(true);
    try {
      const result = await startGame(currentTeacher.id);
      if (result.reason === 'missing_players' || result.reason === 'invalid_roster') {
        navigate('/games/setup');
        return;
      }
      navigate(`/games/play/${config.gameType}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Layout title="Jokoak" showBackButton>
      <div className="max-w-4xl mx-auto space-y-8 py-4">
        <section className="bg-white border-2 border-zinc-100 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-500">
              <Gamepad2 size={28} />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900">Gelako jokoak</h2>
              <p className="text-zinc-500 font-medium">
                Aukeratu maila, jokoa eta jokalariak. Dena zure liburutegitik ateratzen da.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => setConfig({ level })}
                className={`py-4 rounded-2xl font-black text-lg transition-all active:scale-95 ${
                  config.level === level
                    ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/20'
                    : 'bg-zinc-50 border-2 border-zinc-100 text-zinc-500 hover:border-blue-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Gaia (opcional)</label>
              <select
                value={config.topic || ''}
                onChange={(e) => setConfig({ topic: e.target.value || undefined })}
                className="w-full p-5 bg-zinc-50 border-2 border-zinc-100 rounded-[1.5rem] font-bold outline-none focus:border-blue-500"
              >
                <option value="">Guztiak</option>
                {(topics || []).map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Jokoa</label>
              <div className="grid grid-cols-1 gap-3">
                {availableGames.map((game) => (
                  <button
                    key={game.type}
                    onClick={() => setConfig({ gameType: game.type })}
                    className={`text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                      config.gameType === game.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-zinc-100 bg-white hover:border-blue-200'
                    }`}
                  >
                    <p className="font-black text-zinc-900 flex items-center gap-2">
                      <Sparkles size={16} className={config.gameType === game.type ? 'text-blue-500' : 'text-zinc-300'} />
                      {game.label}
                    </p>
                    <p className="text-sm text-zinc-500 font-medium mt-1">{game.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-zinc-400" />
            <p className="font-black text-zinc-700">Konfiguratutako jokalariak</p>
          </div>

          {roster.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {roster.map((player) => (
                <span
                  key={player.id}
                  className="px-4 py-2 rounded-2xl bg-white border-2 border-zinc-100 font-bold text-zinc-700"
                >
                  {player.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 font-medium">Oraindik ez dago jokalaririk. Gehitu 1etik 6ra hasi aurretik.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <button
              onClick={() => navigate('/games/setup')}
              className="py-5 rounded-[1.5rem] bg-white border-2 border-zinc-100 font-black text-zinc-700 hover:border-blue-200 transition-all active:scale-95"
            >
              Jokalariak konfiguratu
            </button>
            <button
              onClick={handleStart}
              disabled={starting}
              className="py-5 rounded-[1.5rem] bg-blue-500 text-white font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <Play size={20} fill="currentColor" />
                {starting ? 'Prestatzen...' : `Hasi ${getGameLabel(config.gameType)}`}
              </span>
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
