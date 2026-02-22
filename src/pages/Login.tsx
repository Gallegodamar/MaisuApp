import React, { useState, useMemo } from 'react';
import { useTeacher } from '../contexts/TeacherContext';
import { TEACHERS } from '../types';
import { useNavigate } from 'react-router-dom';
import { User, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BRAND_LOGO_SRC = '/zornotzako-barnetegia-logo.png';

export default function Login() {
  const { setTeacher } = useTeacher();
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [brandLogoFailed, setBrandLogoFailed] = useState(false);

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    return TEACHERS.filter(t => 
      t.name.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [inputValue]);

  const handleSelect = (id: string) => {
    setTeacher(id);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-zinc-100"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12 }}
            className="bg-blue-50 w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-100 overflow-hidden"
          >
            {!brandLogoFailed ? (
              <img
                src={BRAND_LOGO_SRC}
                alt="Zornotzako Barnetegia"
                className="w-full h-full object-cover scale-110"
                onError={() => setBrandLogoFailed(true)}
              />
            ) : (
              <User className="text-blue-500" size={48} />
            )}
          </motion.div>
          <h1 className="text-4xl font-black text-zinc-900 mb-2 tracking-tight">Ongi etorri!</h1>
          <p className="text-zinc-500 font-medium">Hautatu zure izena saioa hasteko</p>
        </div>

        <div className="relative space-y-4">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Idatzi zure izena..."
              className="w-full p-5 bg-zinc-50 border-2 border-zinc-100 rounded-3xl text-lg font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-zinc-300"
            />
          </div>

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-10 w-full bg-white border border-zinc-100 rounded-3xl shadow-2xl overflow-hidden mt-2"
              >
                {suggestions.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => handleSelect(teacher.id)}
                    className="w-full flex items-center justify-between p-5 hover:bg-blue-50 transition-colors text-left group"
                  >
                    <span className="text-lg font-bold text-zinc-700 group-hover:text-blue-600">
                      {teacher.name}
                    </span>
                    <ChevronRight className="text-zinc-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs font-bold text-zinc-300 uppercase tracking-widest">MaisuApp</p>
        </div>
      </motion.div>
    </div>
  );
}
