import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTeacher } from '../contexts/TeacherContext';
import Layout from '../components/Layout';
import { db } from '../db';
import { Item, Level, ItemType, normalizeEuKey } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle, AlertCircle, Edit2, Plus, Trash2, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { startOfDay } from 'date-fns';

const LEVELS: Level[] = ['A2', 'B1', 'B2', 'C1', 'Mailarik gabe'];

export default function AddItem() {
  const { currentTeacher } = useTeacher();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [type, setType] = useState<ItemType>('hitza');
  const [eu, setEu] = useState('');
  const [es, setEs] = useState('');
  const [exampleEu, setExampleEu] = useState('');
  const [synonymsText, setSynonymsText] = useState('');
  const [level, setLevel] = useState<Level>('Mailarik gabe');
  const [topic, setTopic] = useState('');
  const [tagsText, setTagsText] = useState('');
  
  const [saved, setSaved] = useState(false);
  const [duplicate, setDuplicate] = useState<Item | null>(null);
  const [globalMatch, setGlobalMatch] = useState<Item | null>(null);
  const [suggestions, setSuggestions] = useState<Item[]>([]);

  const dailyItems = useLiveQuery(async () => {
    if (!currentTeacher) return [];
    const today = startOfDay(new Date());
    const items = await db.items
      .where('teacherId')
      .equals(currentTeacher.id)
      .reverse()
      .sortBy('createdAt');
    
    return items.filter(item => startOfDay(new Date(item.createdAt)).getTime() === today.getTime());
  }, [currentTeacher]);

  useEffect(() => {
    if (editId) {
      db.items.get(editId).then(item => {
        if (item) {
          setType(item.type);
          setEu(item.eu);
          setEs(item.es);
          setExampleEu(item.exampleEu || '');
          setSynonymsText(item.synonymsEu?.join(', ') || '');
          setLevel(item.level);
          setTopic(item.topic || '');
          setTagsText(item.tags?.join(', ') || '');
        }
      });
    }
  }, [editId]);

  const checkDuplicate = async (val: string) => {
    if (!val || editId) {
      setDuplicate(null);
      setGlobalMatch(null);
      setSuggestions([]);
      return;
    }
    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const euKey = normalizeEuKey(trimmed);
    
    // Search for suggestions
    const matches = await db.items
      .where('eu')
      .startsWithIgnoreCase(trimmed)
      .filter(m => m.type === type)
      .limit(5)
      .toArray();
    
    setSuggestions(matches.filter(m => m.eu.toLowerCase() !== trimmed.toLowerCase()));

    // Check exact match in personal list
    const existing = await db.items
      .where('[teacherId+type+euKey]')
      .equals([currentTeacher?.id || '', type, euKey])
      .first();
    setDuplicate(existing || null);

    // If not in personal list, check global list for exact match
    if (!existing) {
      const global = await db.items
        .where('[type+euKey]')
        .equals([type, euKey])
        .first();
      setGlobalMatch(global || null);
    } else {
      setGlobalMatch(null);
    }
  };

  const loadFromExisting = (item: Item) => {
    setType(item.type);
    setEu(item.eu);
    setEs(item.es);
    setExampleEu(item.exampleEu || '');
    setSynonymsText(item.synonymsEu?.join(', ') || '');
    setLevel(item.level);
    setTopic(item.topic || '');
    setTagsText(item.tags?.join(', ') || '');
    setGlobalMatch(null);
    setDuplicate(null);
    setSuggestions([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eu || !es || !currentTeacher) return;

    const itemData: any = {
      teacherId: currentTeacher.id,
      type,
      eu: eu.trim(),
      euKey: normalizeEuKey(eu.trim()),
      es: es.trim(),
      level,
      exampleEu: exampleEu.trim() || undefined,
      synonymsEu: synonymsText.split(',').map(s => s.trim()).filter(Boolean),
      topic: topic.trim() || undefined,
      tags: tagsText.split(',').map(t => t.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };

    const conflictingItem = await db.items
      .where('[teacherId+type+euKey]')
      .equals([currentTeacher.id, itemData.type, itemData.euKey])
      .first();

    if (conflictingItem && (!editId || conflictingItem.id !== editId)) {
      setDuplicate(conflictingItem);
      alert('Elementu hau dagoeneko zure zerrendan dago.');
      return;
    }

    try {
      if (editId) {
        await db.items.update(editId, itemData);
      } else {
        itemData.id = uuidv4();
        itemData.createdAt = new Date().toISOString();
        itemData.favorite = false;
        await db.items.add(itemData as Item);
      }
    } catch (error: any) {
      if (error?.name === 'ConstraintError') {
        const duplicateItem = await db.items
          .where('[teacherId+type+euKey]')
          .equals([currentTeacher.id, itemData.type, itemData.euKey])
          .first();
        if (duplicateItem) {
          setDuplicate(duplicateItem);
        }
        alert('Ezin izan da gorde: elementu bikoiztua detektatu da.');
        return;
      }

      console.error('Error saving item:', error);
      alert('Errorea elementua gordetzean.');
      return;
    }

    setSaved(true);
    setTimeout(() => {
      if (!editId) {
        resetForm();
      }
      setSaved(false);
    }, 2000);
  };

  const resetForm = () => {
    setEu('');
    setEs('');
    setExampleEu('');
    setSynonymsText('');
    setTopic('');
    setTagsText('');
    setDuplicate(null);
    setSuggestions([]);
  };

  const deleteItem = async (id: string) => {
    if (confirm('Ziur zaude ezabatu nahi duzula?')) {
      await db.items.delete(id);
    }
  };

  return (
    <Layout title={editId ? "Editatu" : "Gehitu berria"} showBackButton>
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex bg-zinc-100 p-1.5 rounded-[2rem]">
          <button
            onClick={() => setType('hitza')}
            className={`flex-1 py-4 rounded-[1.5rem] font-black transition-all ${type === 'hitza' ? 'bg-white shadow-xl text-blue-500' : 'text-zinc-400'}`}
          >
            Hitza
          </button>
          <button
            onClick={() => setType('egitura')}
            className={`flex-1 py-4 rounded-[1.5rem] font-black transition-all ${type === 'egitura' ? 'bg-white shadow-xl text-blue-500' : 'text-zinc-400'}`}
          >
            Egitura
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Euskara *</label>
              <input
                required
                value={eu}
                onChange={(e) => {
                  setEu(e.target.value);
                  checkDuplicate(e.target.value);
                }}
                placeholder={type === 'hitza' ? "Adib: Etxea" : "Adib: ...t(z)ea gustatzen zait"}
                className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] text-2xl font-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
              <AnimatePresence>
                {suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white border border-zinc-100 rounded-2xl shadow-xl overflow-hidden mt-2"
                  >
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => loadFromExisting(s)}
                        className="w-full text-left p-4 hover:bg-blue-50 transition-colors border-b border-zinc-50 last:border-0 flex items-center justify-between group"
                      >
                        <div>
                          <span className="font-black text-zinc-800 group-hover:text-blue-600">{s.eu}</span>
                          <span className="text-xs text-zinc-400 ml-2">({s.es})</span>
                        </div>
                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Kargatu</span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {duplicate && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center justify-between mt-2"
                  >
                    <div className="flex items-center gap-2 text-orange-700 text-sm font-bold">
                      <AlertCircle size={18} />
                      <span>Dagoeneko badago elementu hau zure zerrendan.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/add?edit=${duplicate.id}`)}
                      className="text-orange-700 font-black text-sm underline"
                    >
                      Editatu
                    </button>
                  </motion.div>
                )}

                {globalMatch && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between mt-2"
                  >
                    <div className="flex items-center gap-2 text-blue-700 text-sm font-bold">
                      <AlertCircle size={18} />
                      <span>Liburutegi komunean aurkitu da.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadFromExisting(globalMatch)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-xl font-black text-xs shadow-lg shadow-blue-500/10"
                    >
                      DATUAK KARGATU
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Gaztelania *</label>
              <input
                required
                value={es}
                onChange={(e) => setEs(e.target.value)}
                placeholder="Esanahia edo azalpena"
                className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] text-xl font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Maila</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none"
                >
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Gaia</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Adib: Familia..."
                  className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Sinonimoak (komaz bereizita)</label>
              <input
                value={synonymsText}
                onChange={(e) => setSynonymsText(e.target.value)}
                placeholder="Adib: bizileku, egoitza"
                className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-2">Adibidea</label>
              <textarea
                value={exampleEu}
                onChange={(e) => setExampleEu(e.target.value)}
                placeholder="Testuingurua ulertzeko esaldi bat"
                className="w-full p-6 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] h-32 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-6 rounded-[2rem] font-black text-xl border-2 border-zinc-100 text-zinc-400 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
            >
              <Eraser size={24} />
              Garbitu
            </button>
            <button
              type="submit"
              disabled={saved}
              className={`flex-[2] py-6 rounded-[2rem] font-black text-2xl shadow-2xl transition-all flex items-center justify-center gap-3 ${saved ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95 shadow-blue-500/20'}`}
            >
              {saved ? (
                <>
                  <CheckCircle size={28} />
                  Gordeta!
                </>
              ) : (
                <>
                  {editId ? <Edit2 size={28} /> : <Plus size={28} />}
                  {editId ? 'Eguneratu' : 'Gorde'}
                </>
              )}
            </button>
          </div>
        </form>

        {saved && !editId && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={resetForm}
            className="w-full py-4 text-blue-500 font-black hover:underline"
          >
            Beste bat gehitu
          </motion.button>
        )}

        {dailyItems && dailyItems.length > 0 && (
          <div className="space-y-6 pt-10 border-t border-zinc-100">
            <h3 className="text-xl font-black text-zinc-800 tracking-tight">Gaurko elementuak</h3>
            <div className="grid gap-4">
              {dailyItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-50 p-6 rounded-[2rem] border border-zinc-100 flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-zinc-900">{item.eu}</span>
                      <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-zinc-100">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">{item.es}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate(`/add?edit=${item.id}`)}
                      className="p-3 bg-white text-blue-500 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-all active:scale-90"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-3 bg-white text-red-500 rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-all active:scale-90"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
