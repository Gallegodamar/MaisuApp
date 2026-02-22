import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTeacher } from '../contexts/TeacherContext';
import Layout from '../components/Layout';
import { db } from '../db';
import { Item } from '../types';
import { startOfDay, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Eye, Play } from 'lucide-react';
import { matchesCreatedAtDateRange } from '../dateRange';

export default function ReviewSession() {
  const { currentTeacher } = useTeacher();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealStep, setRevealStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'flashcard'>('overview');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const getMaxRevealStep = (item?: Item) => {
    if (!item) return 0;
    let maxStep = 1; // meaning
    if (item.synonymsEu && item.synonymsEu.length > 0) maxStep = 2; // synonyms
    if (item.exampleEu?.trim()) maxStep = 3; // example
    return maxStep;
  };

  useEffect(() => {
    const loadItems = async () => {
      if (!currentTeacher) return;
      
      const mode = searchParams.get('mode');
      const level = searchParams.get('level');
      const type = searchParams.get('type');
      const shuffle = searchParams.get('shuffle') === 'true';
      const favoritesOnly = searchParams.get('favorites') === 'true';
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');

      let collection = db.items.where('teacherId').equals(currentTeacher.id);
      let allItems = await collection.toArray();

      const filtered = allItems.filter(item => {
        const matchesLevel = level === 'Guztiak' || item.level === level;
        const matchesType = type === 'Guztiak' || item.type === type;
        const matchesFavorite = !favoritesOnly || item.favorite;
        
        let matchesDate = true;
        const itemDate = new Date(item.createdAt);
        const today = startOfDay(new Date());

        if (mode === 'today') {
          matchesDate = itemDate >= today;
        } else if (mode === 'week') {
          matchesDate = itemDate >= subDays(today, 7);
        } else if (mode === 'last') {
          const sorted = [...allItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (sorted.length > 0) {
            const lastDate = startOfDay(new Date(sorted[0].createdAt));
            matchesDate = startOfDay(itemDate).getTime() === lastDate.getTime();
          }
        } else if (mode === 'range') {
          matchesDate = matchesCreatedAtDateRange(item.createdAt, dateFrom, dateTo);
        }

        return matchesLevel && matchesType && matchesDate && matchesFavorite;
      });

      if (shuffle) {
        filtered.sort(() => Math.random() - 0.5);
      } else {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      setItems(filtered);
      setLoading(false);
    };

    loadItems();
  }, [currentTeacher, searchParams]);

  useEffect(() => {
    if (viewMode === 'overview') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setRevealStep(prev => {
          const maxStep = getMaxRevealStep(items[currentIndex]);
          return Math.min(prev + 1, maxStep);
        });
      } else if (e.code === 'ArrowRight') {
        next();
      } else if (e.code === 'ArrowLeft') {
        prev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items, viewMode]);

  const toggleReveal = (id: string) => {
    const newSet = new Set(revealedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setRevealedIds(newSet);
  };

  const startFlashcards = (index: number = 0) => {
    setCurrentIndex(index);
    setViewMode('flashcard');
    setRevealStep(0);
  };

  const next = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setRevealStep(0);
    } else {
      setViewMode('overview');
    }
  };

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setRevealStep(0);
    } else {
      setViewMode('overview');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><p className="text-zinc-400 font-black animate-pulse">Kargatzen...</p></div>;
  if (items.length === 0) return (
    <Layout title="Errepasoa" showBackButton>
      <div className="text-center py-20">
        <p className="text-zinc-400 font-black text-xl">Ez dago elementurik aukera hauekin.</p>
        <button onClick={() => navigate('/review')} className="mt-6 text-blue-500 font-black underline">Itzuli</button>
      </div>
    </Layout>
  );

  if (viewMode === 'overview') {
    return (
      <Layout 
        title="Errepasatu beharrekoak" 
        showBackButton 
        backIcon="x"
        rightElement={
          <button
            onClick={() => startFlashcards(0)}
            className="bg-blue-500 text-white px-4 py-2 rounded-xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-2"
          >
            <Play size={16} fill="currentColor" />
            Guztiak errepasatu
          </button>
        }
      >
        <div className="space-y-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => toggleReveal(item.id)}
                className="bg-white p-8 rounded-[2rem] border-2 border-zinc-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                      {item.level}
                    </span>
                    <ChevronRight size={16} className="text-zinc-200 group-hover:text-blue-300 transition-colors" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-zinc-800 tracking-tight">
                    {item.eu}
                  </h3>

                  <AnimatePresence mode="wait">
                    {revealedIds.has(item.id) ? (
                      <motion.div
                        key="meaning"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-2 border-t border-zinc-50"
                      >
                        <p className="text-lg font-black text-blue-500">{item.es}</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="hint"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-zinc-300 font-black uppercase tracking-widest text-[10px]"
                      >
                        <Eye size={14} />
                        Egin klik ikusteko
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startFlashcards(idx);
                  }}
                  className="absolute top-0 right-0 bottom-0 w-12 bg-zinc-50/0 hover:bg-zinc-50 flex items-center justify-center text-transparent hover:text-zinc-300 transition-all"
                  title="Hemendik hasi"
                >
                  <Play size={16} fill="currentColor" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const currentItem = items[currentIndex];
  const maxRevealStep = getMaxRevealStep(currentItem);

  return (
    <Layout title={`Errepasoa (${currentIndex + 1} / ${items.length})`} showBackButton>
      <div className="max-w-4xl mx-auto h-[calc(100vh-200px)] flex flex-col justify-center gap-10">
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
            className="h-full bg-blue-500"
          />
        </div>

        <div className="relative perspective-1000">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, rotateY: -20, scale: 0.9 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            className="bg-white rounded-[3rem] border-4 border-zinc-100 shadow-2xl shadow-blue-500/10 p-12 md:p-20 text-center min-h-[400px] flex flex-col items-center justify-center cursor-pointer transition-all hover:border-blue-200"
            onClick={() => {
              setRevealStep(prev => (prev >= maxRevealStep ? 0 : prev + 1));
            }}
          >
            <div className="absolute top-8 left-8 flex gap-2">
              <span className={`text-xs font-black px-3 py-1 rounded-xl uppercase tracking-widest ${currentItem.type === 'hitza' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                {currentItem.type === 'hitza' ? 'Hitza' : 'Egitura'}
              </span>
              <span className="text-xs font-black bg-zinc-50 text-zinc-400 px-3 py-1 rounded-xl tracking-widest">
                {currentItem.level}
              </span>
            </div>

            <h2 className="text-5xl md:text-7xl font-black text-zinc-800 tracking-tighter leading-tight mb-8">
              {currentItem.eu}
            </h2>

            <AnimatePresence mode="wait">
              {revealStep > 0 ? (
                <motion.div
                  key="meaning"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 max-w-3xl"
                >
                  <div className="h-px w-20 bg-zinc-100 mx-auto mb-6" />
                  <p className="text-3xl md:text-4xl font-black text-blue-500 tracking-tight">
                    {currentItem.es}
                  </p>
                  {revealStep > 1 && currentItem.synonymsEu && currentItem.synonymsEu.length > 0 && (
                    <p className="text-lg md:text-xl font-bold text-zinc-500">
                      Sinonimoak: {currentItem.synonymsEu.join(', ')}
                    </p>
                  )}
                  {revealStep > 2 && currentItem.exampleEu && (
                    <p className="text-lg md:text-xl text-zinc-600 font-medium italic leading-relaxed">
                      "{currentItem.exampleEu}"
                    </p>
                  )}
                  {currentItem.topic && (
                    <p className="text-sm font-black text-zinc-300 uppercase tracking-widest">
                      {currentItem.topic}
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-zinc-300 font-black uppercase tracking-widest text-sm"
                >
                  <Eye size={18} />
                  Sakatu hurrengo pista ikusteko
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full gap-6">
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              className="flex-1 py-6 bg-zinc-100 text-zinc-400 rounded-[2rem] font-black text-xl transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
            >
              <ChevronLeft size={24} />
              AURREKOA
            </button>
            <button
              onClick={next}
              className="flex-[2] py-6 bg-blue-500 text-white rounded-[2rem] font-black text-xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {currentIndex === items.length - 1 ? 'AMITU' : 'HURRENGOA'}
              <ChevronRight size={24} />
            </button>
          </div>
          
          <div className="flex gap-6 text-[10px] font-black text-zinc-300 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <span className="bg-zinc-100 px-2 py-1 rounded border border-zinc-200 text-zinc-400">SPACE</span>
              Hurrengo pista
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-zinc-100 px-2 py-1 rounded border border-zinc-200 text-zinc-400">LEFT / RIGHT</span>
              Nabigatu
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
