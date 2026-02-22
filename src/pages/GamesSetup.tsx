import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Users, Play } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Layout from '../components/Layout';
import { useGames } from '../contexts/GamesContext';
import { useTeacher } from '../contexts/TeacherContext';
import { getGameLabel } from '../games/types';

interface DraftPlayer {
  id: string;
  name: string;
}

function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function buildDefaultPlayerName(existing: Array<{ name: string }>) {
  const used = new Set(existing.map((player) => normalizeName(player.name)).filter(Boolean));
  let index = 1;
  while (used.has(normalizeName(`jokalari ${index}`))) {
    index += 1;
  }
  return `jokalari ${index}`;
}

export default function GamesSetup() {
  const navigate = useNavigate();
  const { currentTeacher } = useTeacher();
  const {
    config,
    roster,
    setRoster,
    setTurnMode,
    startGameWithRoster,
  } = useGames();

  const [players, setPlayers] = useState<DraftPlayer[]>(
    roster.length > 0 ? roster : [{ id: uuidv4(), name: 'jokalari 1' }],
  );
  const [starting, setStarting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const validation = useMemo(() => {
    const issues: string[] = [];
    const trimmedPlayers = players.map((player) => ({ ...player, name: player.name.trim() }));
    const emptyCount = trimmedPlayers.filter((player) => !player.name).length;
    if (emptyCount > 0) issues.push('Bete izen guztiak hasi aurretik.');

    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const player of trimmedPlayers) {
      if (!player.name) continue;
      const key = normalizeName(player.name);
      if (seen.has(key)) duplicates.add(player.name);
      seen.add(key);
    }
    if (duplicates.size > 0) issues.push('Ezin dira izen bikoiztuak erabili.');

    if (trimmedPlayers.length < 1) issues.push('Gehitu gutxienez jokalari 1.');
    if (trimmedPlayers.length > 6) issues.push('Gehienez 6 jokalari.');

    return {
      isValid: issues.length === 0,
      issues,
      sanitized: trimmedPlayers.filter((player) => player.name),
    };
  }, [players]);

  const updatePlayerName = (id: string, name: string) => {
    setPlayers((prev) => prev.map((player) => (player.id === id ? { ...player, name } : player)));
  };

  const addPlayer = () => {
    setPlayers((prev) => (
      prev.length >= 6
        ? prev
        : [...prev, { id: uuidv4(), name: buildDefaultPlayerName(prev) }]
    ));
  };

  const removePlayer = (id: string) => {
    setPlayers((prev) => {
      const next = prev.filter((player) => player.id !== id);
      return next.length > 0 ? next : [{ id: uuidv4(), name: 'jokalari 1' }];
    });
  };

  const savePlayers = () => {
    setShowErrors(true);
    if (!validation.isValid) return false;
    setRoster(validation.sanitized);
    return true;
  };

  const handleStart = async () => {
    if (!currentTeacher) return;
    if (!savePlayers()) return;

    setStarting(true);
    try {
      const result = await startGameWithRoster(currentTeacher.id, validation.sanitized);
      if (result.reason === 'invalid_roster' || result.reason === 'missing_players') {
        return;
      }
      navigate(`/games/play/${config.gameType}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Layout title="Jokalariak konfiguratu" showBackButton>
      <div className="max-w-3xl mx-auto space-y-8 py-4">
        <section className="bg-white border-2 border-zinc-100 rounded-[2.5rem] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Users className="text-blue-500" size={24} />
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">Jokalariak (1-6)</h2>
          </div>

          <div className="space-y-3">
            {players.map((player, index) => {
              const normalized = normalizeName(player.name);
              const duplicate =
                normalized &&
                players.filter((p) => normalizeName(p.name) === normalized && normalizeName(p.name) !== '').length > 1;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 ${
                    duplicate && showErrors ? 'border-red-200 bg-red-50' : 'border-zinc-100 bg-zinc-50'
                  }`}
                >
                  <span className="w-10 h-10 rounded-xl bg-white border-2 border-zinc-100 flex items-center justify-center font-black text-zinc-500">
                    {index + 1}
                  </span>
                  <input
                    value={player.name}
                    onChange={(e) => updatePlayerName(player.id, e.target.value)}
                    placeholder={`Jokalaria ${index + 1}`}
                    className="flex-1 p-4 bg-white border-2 border-zinc-100 rounded-xl font-bold outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="p-3 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-white transition-colors"
                    title="Ezabatu jokalaria"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={addPlayer}
            disabled={players.length >= 6}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-zinc-200 text-zinc-600 font-black hover:border-blue-200 hover:text-blue-500 transition-all disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={18} />
              Gehitu jokalaria
            </span>
          </button>

          <div className="space-y-3">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Txanda modua</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={() => setTurnMode('auto')}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  config.turnMode === 'auto' ? 'border-blue-500 bg-blue-50' : 'border-zinc-100 bg-white'
                }`}
              >
                <p className="font-black text-zinc-900">Txanda automatikoak</p>
                <p className="text-sm text-zinc-500 font-medium">1 → 2 → 3… (gomendatua)</p>
              </button>
              <button
                onClick={() => setTurnMode('manual')}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  config.turnMode === 'manual' ? 'border-blue-500 bg-blue-50' : 'border-zinc-100 bg-white'
                }`}
              >
                <p className="font-black text-zinc-900">Txandarik gabe (eskuz)</p>
                <p className="text-sm text-zinc-500 font-medium">Irakasleak aukeratzen du nork puntuatzen duen</p>
              </button>
            </div>
          </div>

          <div className="bg-zinc-50 border-2 border-zinc-100 rounded-2xl p-4 text-sm font-medium text-zinc-600">
            <p><span className="font-black text-zinc-800">Maila:</span> {config.level}</p>
            <p><span className="font-black text-zinc-800">Jokoa:</span> {getGameLabel(config.gameType)}</p>
            <p><span className="font-black text-zinc-800">Gaia:</span> {config.topic || 'Guztiak'}</p>
          </div>

          {showErrors && validation.issues.length > 0 && (
            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-4">
              {validation.issues.map((issue) => (
                <p key={issue} className="text-red-700 font-bold text-sm">
                  {issue}
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={savePlayers}
              className="py-5 rounded-[1.5rem] bg-white border-2 border-zinc-100 font-black text-zinc-700 hover:border-blue-200 transition-all active:scale-95"
            >
              Gorde jokalariak
            </button>
            <button
              onClick={handleStart}
              disabled={starting}
              className="py-5 rounded-[1.5rem] bg-blue-500 text-white font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <Play size={18} fill="currentColor" />
                {starting ? 'Prestatzen...' : 'Hasi'}
              </span>
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
