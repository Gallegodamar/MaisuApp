import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacher } from '../contexts/TeacherContext';
import Layout from '../components/Layout';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Presentation, Calendar, Clock, Filter, Play, Shuffle, Star } from 'lucide-react';
import { startOfDay, subDays } from 'date-fns';
import { Level, ItemType } from '../types';
import { matchesCreatedAtDateRange } from '../dateRange';

export default function ReviewConfig() {
  const { currentTeacher } = useTeacher();
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState<'today' | 'last' | 'week' | 'all' | 'range'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [level, setLevel] = useState<Level | 'Guztiak'>('Guztiak');
  const [type, setType] = useState<ItemType | 'Guztiak'>('Guztiak');
  const [shuffle, setShuffle] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const itemsCount = useLiveQuery(async () => {
    if (!currentTeacher) return 0;
    let collection = db.items.where('teacherId').equals(currentTeacher.id);

    const allItems = await collection.toArray();
    
    return allItems.filter(item => {
      const matchesLevel = level === 'Guztiak' || item.level === level;
      const matchesType = type === 'Guztiak' || item.type === type;
      const matchesFavorite = !favoritesOnly || item.favorite;
      
      let matchesDate = true;
      const itemDate = new Date(item.createdAt);
      const today = startOfDay(new Date());

      if (dateRange === 'today') {
        matchesDate = itemDate >= today;
      } else if (dateRange === 'week') {
        matchesDate = itemDate >= subDays(today, 7);
      } else if (dateRange === 'last') {
        const sorted = [...allItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (sorted.length > 0) {
          const lastDate = startOfDay(new Date(sorted[0].createdAt));
          matchesDate = startOfDay(itemDate).getTime() === lastDate.getTime();
        }
      } else if (dateRange === 'range') {
        matchesDate = matchesCreatedAtDateRange(item.createdAt, dateFrom, dateTo);
      }

      return matchesLevel && matchesType && matchesDate && matchesFavorite;
    }).length;
  }, [currentTeacher, dateRange, dateFrom, dateTo, level, type, favoritesOnly]);

  const startReview = () => {
    const params = new URLSearchParams({
      mode: dateRange,
      level,
      type,
      shuffle: shuffle.toString(),
      favorites: favoritesOnly.toString()
    });
    if (dateRange === 'range') {
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
    }
    navigate(`/review/session?${params.toString()}`);
  };

  return (
    <Layout title="Errepasatu" showBackButton>
      <div className="max-w-2xl mx-auto space-y-10 py-4">
        <section className="space-y-6">
          <h3 className="text-xl font-black text-zinc-800 flex items-center gap-3 tracking-tight">
            <Calendar size={24} className="text-blue-500" />
            Noizkoak errepasatu nahi dituzu?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { id: 'today', label: 'Gaurkoak', icon: Clock },
              { id: 'last', label: 'Azken saioa', icon: Presentation },
              { id: 'week', label: 'Azken 7 egunak', icon: Calendar },
              { id: 'all', label: 'Guztiak', icon: Filter },
              { id: 'range', label: 'Data tartea', icon: Calendar },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDateRange(opt.id as any)}
                className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${dateRange === opt.id ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-xl shadow-blue-500/5' : 'border-zinc-100 bg-zinc-50 text-zinc-400 hover:border-zinc-200'}`}
              >
                <opt.icon size={28} />
                <span className="font-black text-lg tracking-tight">{opt.label}</span>
              </button>
            ))}
          </div>
          {dateRange === 'range' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Noiztik</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Noiz arte</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <h3 className="text-xl font-black text-zinc-800 tracking-tight">Iragazkiak</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Maila</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none"
              >
                {['Guztiak', 'A2', 'B1', 'B2', 'C1', 'Mailarik gabe'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Mota</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none"
              >
                <option value="Guztiak">Guztiak</option>
                <option value="hitza">Hitzak</option>
                <option value="egitura">Egiturak</option>
              </select>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-[2rem] border-2 border-zinc-100">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer ${shuffle ? 'bg-blue-500' : 'bg-zinc-300'}`} onClick={() => setShuffle(!shuffle)}>
                <div className={`w-6 h-6 bg-white rounded-full transition-transform ${shuffle ? 'translate-x-6' : 'translate-x-0'} shadow-md`} />
              </div>
              <span className="font-black text-zinc-600 flex items-center gap-2 tracking-tight">
                <Shuffle size={20} />
                Nahasi
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-[2rem] border-2 border-zinc-100">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer ${favoritesOnly ? 'bg-orange-400' : 'bg-zinc-300'}`} onClick={() => setFavoritesOnly(!favoritesOnly)}>
                <div className={`w-6 h-6 bg-white rounded-full transition-transform ${favoritesOnly ? 'translate-x-6' : 'translate-x-0'} shadow-md`} />
              </div>
              <span className="font-black text-zinc-600 flex items-center gap-2 tracking-tight">
                <Star size={20} className={favoritesOnly ? 'text-orange-400' : ''} fill={favoritesOnly ? 'currentColor' : 'none'} />
                Gogokoak bakarrik
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Aukeratuak</p>
              <p className="text-3xl font-black text-blue-500 tracking-tighter">{itemsCount || 0}</p>
            </div>
          </div>
        </div>

        <button
          onClick={startReview}
          disabled={!itemsCount}
          className="w-full py-8 bg-blue-500 text-white rounded-[2.5rem] font-black text-3xl shadow-2xl shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:scale-100"
        >
          <Play size={40} fill="currentColor" />
          HASI ERREPASOA
        </button>
      </div>
    </Layout>
  );
}
