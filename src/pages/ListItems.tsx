import React, { useState, useMemo } from 'react';
import { useTeacher } from '../contexts/TeacherContext';
import Layout from '../components/Layout';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Filter, Star, Edit2, Trash2, Download, Upload, User, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Item, Level, ItemType, TEACHERS, normalizeEuKey } from '../types';
import { startOfDay, subDays } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { matchesCreatedAtDateRange } from '../dateRange';

export default function ListItems() {
  const { currentTeacher } = useTeacher();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<Level | 'Guztiak'>('Guztiak');
  const [filterType, setFilterType] = useState<ItemType | 'Guztiak'>('Guztiak');
  const [filterTeacher, setFilterTeacher] = useState<string>('nirea'); // 'nirea' or teacherId or 'denak'
  const [filterDate, setFilterDate] = useState<string>('denak'); // 'denak', 'gaur', 'astea', 'hilabetea', 'tartea'
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const items = useLiveQuery(async () => {
    let collection = db.items.toCollection();
    
    if (filterTeacher === 'nirea') {
      collection = db.items.where('teacherId').equals(currentTeacher?.id || '');
    } else if (filterTeacher !== 'denak') {
      collection = db.items.where('teacherId').equals(filterTeacher);
    }

    const allItems = await collection.reverse().sortBy('createdAt');
    
    return allItems.filter(item => {
      const matchesSearch = 
        item.eu.toLowerCase().includes(search.toLowerCase()) || 
        item.es.toLowerCase().includes(search.toLowerCase()) ||
        item.topic?.toLowerCase().includes(search.toLowerCase());
      
      const matchesLevel = filterLevel === 'Guztiak' || item.level === filterLevel;
      const matchesType = filterType === 'Guztiak' || item.type === filterType;
      
      let matchesDate = true;
      if (filterDate !== 'denak') {
        if (filterDate === 'tartea') {
          matchesDate = matchesCreatedAtDateRange(item.createdAt, filterDateFrom, filterDateTo);
        } else {
          const itemDate = new Date(item.createdAt);
          const today = startOfDay(new Date());
          if (filterDate === 'gaur') matchesDate = itemDate >= today;
          else if (filterDate === 'astea') matchesDate = itemDate >= subDays(today, 7);
          else if (filterDate === 'hilabetea') matchesDate = itemDate >= subDays(today, 30);
        }
      }

      return matchesSearch && matchesLevel && matchesType && matchesDate;
    });
  }, [currentTeacher, search, filterLevel, filterType, filterTeacher, filterDate, filterDateFrom, filterDateTo]);

  const toggleFavorite = async (item: Item) => {
    if (item.teacherId !== currentTeacher?.id) return; // Only own items
    await db.items.update(item.id, { favorite: !item.favorite });
  };

  const deleteItem = async (id: string) => {
    if (confirm('Ziur zaude ezabatu nahi duzula?')) {
      await db.items.delete(id);
    }
  };

  const exportData = async () => {
    if (!currentTeacher) return;
    // Backup should always include the current teacher's full dataset, not only the visible filtered list.
    const teacherItems = await db.items
      .where('teacherId')
      .equals(currentTeacher.id)
      .sortBy('createdAt');

    const dataStr = JSON.stringify(teacherItems, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `euskara_backup_${currentTeacher?.id}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTeacher) return;
    const input = e.target;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedItems = JSON.parse(event.target?.result as string);
        if (!Array.isArray(importedItems)) {
          throw new Error('Invalid backup format');
        }

        const validLevels: Level[] = ['A2', 'B1', 'B2', 'C1', 'Mailarik gabe'];
        let importedCount = 0;
        let skippedCount = 0;

        for (const raw of importedItems) {
          if (!raw || typeof raw !== 'object') {
            skippedCount++;
            continue;
          }

          const eu = typeof raw.eu === 'string' ? raw.eu.trim() : '';
          const es = typeof raw.es === 'string' ? raw.es.trim() : '';
          const type = raw.type === 'hitza' || raw.type === 'egitura' ? raw.type : null;
          const euKey = eu ? normalizeEuKey(eu) : '';

          if (!eu || !euKey || !es || !type) {
            skippedCount++;
            continue;
          }

          const semanticDuplicate = await db.items
            .where('[teacherId+type+euKey]')
            .equals([currentTeacher.id, type, euKey])
            .first();
          if (semanticDuplicate) {
            skippedCount++;
            continue;
          }

          const now = new Date().toISOString();
          const normalizedLevel =
            raw.level === 'A1'
              ? 'A2'
              : validLevels.includes(raw.level as Level)
                ? (raw.level as Level)
                : 'Mailarik gabe';

          const sanitizeStringArray = (value: unknown) => {
            if (!Array.isArray(value)) return undefined;
            const cleaned = value
              .filter((v): v is string => typeof v === 'string')
              .map(v => v.trim())
              .filter(Boolean);
            return cleaned.length > 0 ? cleaned : undefined;
          };

          let importedId = typeof raw.id === 'string' && raw.id ? raw.id : uuidv4();
          const existingById = await db.items.get(importedId);
          if (existingById) {
            if (existingById.teacherId === currentTeacher.id) {
              skippedCount++;
              continue;
            }
            importedId = uuidv4();
          }

          try {
            await db.items.add({
              id: importedId,
              teacherId: currentTeacher.id,
              type,
              eu,
              euKey,
              es,
              level: normalizedLevel,
              synonymsEu: sanitizeStringArray(raw.synonymsEu),
              exampleEu: typeof raw.exampleEu === 'string' ? raw.exampleEu.trim() || undefined : undefined,
              topic: typeof raw.topic === 'string' ? raw.topic.trim() || undefined : undefined,
              tags: sanitizeStringArray(raw.tags),
              favorite: Boolean(raw.favorite),
              createdAt:
                typeof raw.createdAt === 'string' && !Number.isNaN(Date.parse(raw.createdAt))
                  ? raw.createdAt
                  : now,
              updatedAt:
                typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))
                  ? raw.updatedAt
                  : now,
            } as Item);
            importedCount++;
          } catch (error: any) {
            if (error?.name === 'ConstraintError') {
              skippedCount++;
              continue;
            }
            throw error;
          }
        }

        alert(`Inportazioa ondo burutu da: ${importedCount} berriak, ${skippedCount} baztertuta.`);
      } catch (err) {
        alert('Errorea inportatzean. Ziurtatu JSON fitxategi balioduna dela.');
      } finally {
        input.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <Layout title="Liburutegia" showBackButton>
      <div className="space-y-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-300" size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bilatu euskara edo gaztelaniaz..."
              className="w-full pl-14 pr-6 py-5 bg-zinc-50 border-2 border-zinc-100 rounded-[2rem] font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-5 rounded-3xl transition-all active:scale-90 ${showFilters ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-100 text-zinc-500'}`}
          >
            <Filter size={24} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-zinc-50 p-6 rounded-[2rem] border-2 border-zinc-100 space-y-6 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <User size={14} /> Irakaslea
                  </p>
                  <select
                    value={filterTeacher}
                    onChange={(e) => setFilterTeacher(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-zinc-100 rounded-2xl font-bold focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="nirea">Nireak bakarrik</option>
                    <option value="denak">Liburutegi komuna (Denak)</option>
                    {TEACHERS.filter(t => t.id !== currentTeacher?.id).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Calendar size={14} /> Data
                  </p>
                  <select
                    value={filterDate}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setFilterDate(nextValue);
                      if (nextValue !== 'tartea') {
                        setFilterDateFrom('');
                        setFilterDateTo('');
                      }
                    }}
                    className="w-full p-4 bg-white border-2 border-zinc-100 rounded-2xl font-bold focus:border-blue-500 outline-none appearance-none"
                  >
                    <option value="denak">Denak</option>
                    <option value="gaur">Gaur</option>
                    <option value="astea">Azken 7 egunak</option>
                    <option value="hilabetea">Azken hilabetea</option>
                    <option value="tartea">Data tartea</option>
                  </select>
                </div>
              </div>

              {filterDate === 'tartea' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Noiztik</p>
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-zinc-100 rounded-2xl font-bold focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Noiz arte</p>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                      className="w-full p-4 bg-white border-2 border-zinc-100 rounded-2xl font-bold focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Maila</p>
                <div className="flex flex-wrap gap-2">
                  {['Guztiak', 'A2', 'B1', 'B2', 'C1', 'Mailarik gabe'].map(l => (
                    <button
                      key={l}
                      onClick={() => setFilterLevel(l as any)}
                      className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all ${filterLevel === l ? 'bg-blue-500 text-white shadow-md shadow-blue-500/10' : 'bg-white border-2 border-zinc-100 text-zinc-500 hover:border-blue-200'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Mota</p>
                <div className="flex gap-2">
                  {['Guztiak', 'hitza', 'egitura'].map(t => (
                    <button
                      key={t}
                      onClick={() => setFilterType(t as any)}
                      className={`px-5 py-2 rounded-2xl text-sm font-bold capitalize transition-all ${filterType === t ? 'bg-blue-500 text-white shadow-md shadow-blue-500/10' : 'bg-white border-2 border-zinc-100 text-zinc-500 hover:border-blue-200'}`}
                    >
                      {t === 'Guztiak' ? 'Guztiak' : (t === 'hitza' ? 'Hitzak' : 'Egiturak')}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center px-2">
          <span className="text-xs font-black text-zinc-300 uppercase tracking-widest">{items?.length || 0} elementu</span>
          <div className="flex gap-2">
            <button onClick={exportData} className="p-3 text-zinc-400 hover:text-blue-500 transition-colors" title="Esportatu JSON">
              <Download size={24} />
            </button>
            <label className="p-3 text-zinc-400 hover:text-blue-500 cursor-pointer transition-colors" title="Inportatu JSON">
              <Upload size={24} />
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          {items === undefined ? (
            <div className="text-center py-20">
              <p className="text-zinc-300 font-black text-xl animate-pulse">Kargatzen...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 bg-zinc-50 rounded-[2.5rem] border-4 border-dashed border-zinc-100">
              <p className="text-zinc-300 font-black text-xl">Ez da elementurik aurkitu</p>
            </div>
          ) : (
            items.map((item) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-6 rounded-[2rem] border-2 border-zinc-50 flex items-center justify-between group hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
              >
                <div className="flex-1 min-w-0 mr-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${item.type === 'hitza' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                      {item.type === 'hitza' ? 'Hitz' : 'Egit'}
                    </span>
                    <span className="text-[10px] font-black bg-zinc-50 text-zinc-400 px-2 py-1 rounded-lg tracking-widest">
                      {item.level}
                    </span>
                    {filterTeacher === 'denak' && (
                      <span className="text-[10px] font-black bg-blue-50 text-blue-400 px-2 py-1 rounded-lg tracking-widest flex items-center gap-1">
                        <User size={10} /> {TEACHERS.find(t => t.id === item.teacherId)?.name || 'Ezezaguna'}
                      </span>
                    )}
                    {item.topic && (
                      <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                        • {item.topic}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-zinc-800 truncate tracking-tight">{item.eu}</h3>
                  <p className="text-zinc-400 font-medium truncate">{item.es}</p>
                </div>

                <div className="flex items-center gap-2">
                  {item.teacherId === currentTeacher?.id ? (
                    <>
                      <button
                        onClick={() => toggleFavorite(item)}
                        className={`p-3 rounded-2xl transition-all active:scale-75 ${item.favorite ? 'text-orange-400 bg-orange-50' : 'text-zinc-200 hover:text-zinc-300'}`}
                      >
                        <Star size={24} fill={item.favorite ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={() => navigate(`/add?edit=${item.id}`)}
                        className="p-3 text-zinc-200 hover:text-blue-500 hover:bg-blue-50 rounded-2xl transition-all active:scale-75"
                      >
                        <Edit2 size={24} />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-3 text-zinc-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-75"
                      >
                        <Trash2 size={24} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        if (!currentTeacher) return;
                        const euKey = normalizeEuKey(item.eu);
                        const existing = await db.items
                          .where('[teacherId+type+euKey]')
                          .equals([currentTeacher.id, item.type, euKey])
                          .first();
                        if (existing) {
                          alert('Elementu hau dagoeneko zure zerrendan dago.');
                          return;
                        }

                        const { id, ...rest } = item;
                        try {
                          await db.items.add({
                            ...rest,
                            id: uuidv4(),
                            teacherId: currentTeacher.id,
                            euKey,
                            favorite: false,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          });
                          alert('Zure zerrendara gehitu da!');
                        } catch (error: any) {
                          if (error?.name === 'ConstraintError') {
                            alert('Ezin izan da gehitu: elementu bikoiztua detektatu da.');
                            return;
                          }
                          console.error('Error copying shared item:', error);
                          alert('Errorea elementua gehitzean.');
                        }
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded-xl font-black text-xs shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
                    >
                      GEHITU
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
