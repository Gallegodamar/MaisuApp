import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacher } from '../contexts/TeacherContext';
import Layout from '../components/Layout';
import { Plus, Library, Printer, Play, Gamepad2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { startOfDay } from 'date-fns';
import { motion } from 'framer-motion';

export default function Home() {
  const { currentTeacher } = useTeacher();
  const navigate = useNavigate();

  const lastClassItems = useLiveQuery(async () => {
    if (!currentTeacher) return 0;
    const allItems = await db.items
      .where('teacherId')
      .equals(currentTeacher.id)
      .reverse()
      .sortBy('createdAt');
    
    if (allItems.length === 0) return 0;
    
    const lastDate = startOfDay(new Date(allItems[0].createdAt));
    return allItems.filter(item => startOfDay(new Date(item.createdAt)).getTime() === lastDate.getTime()).length;
  }, [currentTeacher]);

  const menuItems = [
    { label: 'Gehitu', icon: Plus, path: '/add', color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { label: 'Liburutegia', icon: Library, path: '/list', color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
    { label: 'Inprimatu', icon: Printer, path: '/print', color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { label: 'Jokoak', icon: Gamepad2, path: '/games', color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
  ];

  return (
    <Layout>
      <div className="space-y-10 py-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-500/20"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
        >
          <div className="relative z-10 space-y-6">
            <button 
              onClick={() => navigate('/review')}
              className="w-full bg-white text-indigo-600 py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-black/10"
            >
              <Play size={24} fill="currentColor" />
              Ikasi
            </button>
          </div>
          
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
        </motion.div>

        <div className="grid grid-cols-2 gap-6">
          {menuItems.map((item, idx) => (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center p-8 bg-white border border-zinc-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group"
            >
              <div className={`${item.bgColor} ${item.color} p-5 rounded-2xl mb-4 group-hover:scale-110 transition-transform`}>
                <item.icon size={32} />
              </div>
              <span className="text-lg font-bold text-zinc-700">{item.label}</span>
            </motion.button>
          ))}
        </div>

        {lastClassItems !== undefined && lastClassItems > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
              Azken saioan {lastClassItems} elementu gehitu dira
            </p>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
