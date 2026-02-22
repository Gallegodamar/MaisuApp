import React, { useEffect, useMemo, useState } from 'react';
import { useTeacher } from '../contexts/TeacherContext';
import Layout from '../components/Layout';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Printer, CheckSquare, FileText, Grid, Calendar } from 'lucide-react';
import { Item } from '../types';
import { matchesCreatedAtDateRange } from '../dateRange';
import { startOfDay, startOfWeek } from 'date-fns';

type Template = 'list' | 'cards';
type PrintScope =
  | 'manual'
  | 'weekWords'
  | 'weekStructures'
  | 'weekAll'
  | 'dateRangeWords';

function isValidDate(value: string) {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function matchesCurrentWeek(createdAt: string) {
  const itemDate = new Date(createdAt);
  if (Number.isNaN(itemDate.getTime())) return false;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  return itemDate >= startOfDay(weekStart);
}

function getScopeLabel(scope: PrintScope, from: string, to: string) {
  if (scope === 'weekWords') return 'Aste honetako hitzak';
  if (scope === 'weekStructures') return 'Aste honetako egiturak';
  if (scope === 'weekAll') return 'Aste honetako elementuak';
  if (scope === 'dateRangeWords') {
    if (from || to) return `Data tarteko hitzak (${from || '...'} - ${to || '...'})`;
    return 'Data tarteko hitzak';
  }
  return 'Eskuz hautatutako elementuak';
}

export default function PrintItems() {
  const { currentTeacher } = useTeacher();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState<Template>('list');
  const [printScope, setPrintScope] = useState<PrintScope>('manual');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const items = useLiveQuery(
    () => db.items.where('teacherId').equals(currentTeacher?.id || '').reverse().sortBy('createdAt'),
    [currentTeacher]
  );

  const visibleItems = useMemo(() => {
    if (!items) return [];

    if (printScope === 'weekWords') {
      return items.filter((item) => item.type === 'hitza' && matchesCurrentWeek(item.createdAt));
    }

    if (printScope === 'weekStructures') {
      return items.filter((item) => item.type === 'egitura' && matchesCurrentWeek(item.createdAt));
    }

    if (printScope === 'weekAll') {
      return items.filter((item) => matchesCurrentWeek(item.createdAt));
    }

    if (printScope === 'dateRangeWords') {
      if (!dateFrom && !dateTo) return [];
      return items.filter(
        (item) =>
          item.type === 'hitza' &&
          matchesCreatedAtDateRange(item.createdAt, dateFrom || undefined, dateTo || undefined)
      );
    }

    return items;
  }, [items, printScope, dateFrom, dateTo]);

  useEffect(() => {
    if (printScope === 'manual') return;
    setSelectedIds(new Set(visibleItems.map((item) => item.id)));
  }, [printScope, visibleItems]);

  const selectedItems = useMemo(() => {
    return items?.filter((item) => selectedIds.has(item.id)) || [];
  }, [items, selectedIds]);

  const allVisibleSelected =
    visibleItems.length > 0 && visibleItems.every((item) => selectedIds.has(item.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (allVisibleSelected) {
        visibleItems.forEach((item) => newSet.delete(item.id));
      } else {
        visibleItems.forEach((item) => newSet.add(item.id));
      }
      return newSet;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const emptyFilterMessage =
    printScope === 'weekWords'
      ? 'Ez dago aste honetako hitzik inprimatzeko.'
      : printScope === 'weekStructures'
        ? 'Ez dago aste honetako egiturarik inprimatzeko.'
        : printScope === 'weekAll'
          ? 'Ez dago aste honetako elementurik inprimatzeko.'
      : printScope === 'dateRangeWords'
        ? 'Ez dago aukeratutako data tarteko hitzik.'
        : 'Ez dago elementurik.';

  return (
    <Layout title="Inprimatu" showBackButton>
      <div className="space-y-8 no-print max-w-4xl mx-auto">
        <div className="bg-zinc-50 p-8 rounded-[2.5rem] border-2 border-zinc-100 space-y-10">
          <div className="space-y-4">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">1. Aukeratu diseinua</p>
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => setTemplate('list')}
                className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                  template === 'list'
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-xl shadow-blue-500/5'
                    : 'border-zinc-100 bg-white text-zinc-400 hover:border-zinc-200'
                }`}
              >
                <FileText size={32} />
                <span className="font-black text-lg tracking-tight">Zerrenda</span>
              </button>
              <button
                onClick={() => setTemplate('cards')}
                className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all active:scale-95 ${
                  template === 'cards'
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-xl shadow-blue-500/5'
                    : 'border-zinc-100 bg-white text-zinc-400 hover:border-zinc-200'
                }`}
              >
                <Grid size={32} />
                <span className="font-black text-lg tracking-tight">Fitxak</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar size={14} />
              2. Aukeratu zer inprimatu
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <button
                onClick={() => setPrintScope('manual')}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                  printScope === 'manual'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-zinc-100 bg-white hover:border-zinc-200'
                }`}
              >
                <p className="font-black text-zinc-900">Eskuz</p>
                <p className="text-sm font-medium text-zinc-500">Irakaslearen zerrendatik eskuz hautatu</p>
              </button>

              <button
                onClick={() => setPrintScope('weekWords')}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                  printScope === 'weekWords'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-zinc-100 bg-white hover:border-zinc-200'
                }`}
              >
                <p className="font-black text-zinc-900">Aste honetako hitzak</p>
                <p className="text-sm font-medium text-zinc-500">Aste honetan gehitutako hitzak</p>
              </button>

              <button
                onClick={() => setPrintScope('weekStructures')}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                  printScope === 'weekStructures'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-zinc-100 bg-white hover:border-zinc-200'
                }`}
              >
                <p className="font-black text-zinc-900">Aste honetako egiturak</p>
                <p className="text-sm font-medium text-zinc-500">Aste honetan gehitutako egiturak</p>
              </button>

              <button
                onClick={() => setPrintScope('weekAll')}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                  printScope === 'weekAll'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-zinc-100 bg-white hover:border-zinc-200'
                }`}
              >
                <p className="font-black text-zinc-900">Aste honetako elementuak</p>
                <p className="text-sm font-medium text-zinc-500">Hitzak eta egiturak batera</p>
              </button>

              <button
                onClick={() => setPrintScope('dateRangeWords')}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${
                  printScope === 'dateRangeWords'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-zinc-100 bg-white hover:border-zinc-200'
                }`}
              >
                <p className="font-black text-zinc-900">Data tarteko hitzak</p>
                <p className="text-sm font-medium text-zinc-500">Noiztik/noiz arte aukeratuta</p>
              </button>
            </div>

            {printScope === 'dateRangeWords' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Noiztik</p>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-zinc-100 rounded-2xl font-bold focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-widest ml-1">Noiz arte</p>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-zinc-100 rounded-2xl font-bold focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {printScope !== 'manual' && (
              <p className="text-sm font-medium text-zinc-500">
                Iragazitako hitzak automatikoki hautatzen dira. Nahi izanez gero, batzuk kendu ditzakezu.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 gap-4">
              <div>
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                  3. Aukeratu elementuak ({selectedIds.size})
                </p>
                <p className="text-xs font-bold text-zinc-400 mt-1">
                  Ikusgai: {visibleItems.length} · {getScopeLabel(printScope, dateFrom, dateTo)}
                </p>
              </div>
              <button
                onClick={toggleAllVisible}
                className="text-xs font-black text-blue-500 hover:underline uppercase tracking-widest shrink-0"
              >
                {allVisibleSelected ? 'Ikusgaiak kendu' : 'Ikusgaiak hautatu'}
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto border-2 border-zinc-100 rounded-[2rem] bg-white divide-y divide-zinc-50">
              {visibleItems.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="font-black text-zinc-500">{emptyFilterMessage}</p>
                  {printScope === 'dateRangeWords' && !dateFrom && !dateTo && (
                    <p className="text-sm font-medium text-zinc-400">Aukeratu data tarte bat hitzak iragazteko.</p>
                  )}
                </div>
              ) : (
                visibleItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className="p-5 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                        selectedIds.has(item.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-zinc-200 text-transparent'
                      }`}
                    >
                      <CheckSquare size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-zinc-800 truncate tracking-tight text-lg">{item.eu}</p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 truncate font-medium">{item.es}</p>
                      <p className="text-[11px] text-zinc-300 font-bold mt-1">
                        {isValidDate(item.createdAt) ? new Date(item.createdAt).toLocaleDateString('eu-ES') : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={handlePrint}
            disabled={selectedIds.size === 0}
            className="w-full py-8 bg-blue-500 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-blue-500/20 hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:scale-100"
          >
            <Printer size={32} />
            INPRIMATU / PDF SORTU
          </button>
        </div>
      </div>

      <div className="print-only bg-white text-black p-0">
        <div className="max-w-[21cm] mx-auto">
          <header className="border-b-4 border-black pb-6 mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase">Euskara Materiala</h1>
              <p className="text-sm font-bold text-zinc-500 mt-1 uppercase tracking-widest">
                Irakaslea: {currentTeacher?.name}
              </p>
              <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-widest">
                {getScopeLabel(printScope, dateFrom, dateTo)}
              </p>
            </div>
            <p className="text-sm font-black">{new Date().toLocaleDateString('eu-ES')}</p>
          </header>

          {template === 'list' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-8 font-black text-xs uppercase tracking-widest border-b-2 border-zinc-100 pb-4 mb-4">
                <span>Euskara</span>
                <span>Gaztelania</span>
              </div>
              {selectedItems.map((item) => (
                <div key={item.id} className="grid grid-cols-2 gap-8 py-4 border-b border-zinc-50 items-center">
                  <span className="text-xl font-black text-zinc-800 leading-tight">{item.eu}</span>
                  <span className="text-lg font-bold text-zinc-400 leading-tight">{item.es}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              {selectedItems.map((item) => (
                <div key={item.id} className="border-2 border-zinc-200 p-8 rounded-[2rem] space-y-6 break-inside-avoid">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-zinc-300 tracking-widest">
                      {item.type} • {item.level}
                    </p>
                    <h2 className="text-3xl font-black text-zinc-800 tracking-tight">{item.eu}</h2>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xl text-zinc-500 font-bold leading-tight">{item.es}</p>
                    {item.synonymsEu && item.synonymsEu.length > 0 && (
                      <p className="text-sm font-bold text-zinc-400 italic">
                        Sinonimoak: {item.synonymsEu.join(', ')}
                      </p>
                    )}
                    {item.exampleEu && (
                      <div className="mt-6 pt-6 border-t-2 border-zinc-50">
                        <p className="text-base text-zinc-600 leading-relaxed font-medium italic">
                          "{item.exampleEu}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <footer className="mt-20 pt-8 border-t-2 border-zinc-100 text-center">
            <p className="text-zinc-300 font-black text-[10px] uppercase tracking-[0.3em]">
              MaisuApp • Irakasleentzako tresna
            </p>
          </footer>
        </div>
      </div>
    </Layout>
  );
}
