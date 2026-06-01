// ============================================================================
// File: src/features/dashboard/Dashboard.tsx
// ============================================================================
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Heart, AlertCircle, Scale, ClipboardCheck, CheckCircle, Plus, Calendar, ArrowDownAZ, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimalFormModal } from '../animals/AnimalFormModal';
import { fetchLocalTable } from '../../lib/queries'; 
import { SyncEngine } from '../../components/data/SyncEngine'; // INJECTED ENGINE
import type { Animal, DailyLog, FeedingSchedule, Task } from '../../types/schema';

interface EnhancedAnimal extends Animal {
  todays_weight: string | null;
  todays_feed: string | null;
  last_feed: string | null;
  next_feed: string | null;
}

type SortMode = 'NAME_ASC' | 'NAME_DESC' | 'CUSTOM';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sortMode, setSortMode] = useState<SortMode>('NAME_ASC');

  // --- 1. Offline-First Read Pipeline ---
  const { data: allAnimals = [] } = useQuery<Animal[]>({ 
    queryKey: ['animals'],
    queryFn: () => fetchLocalTable<Animal>('animals')
  });
  
  const { data: allTasks = [] } = useQuery<Task[]>({ 
    queryKey: ['tasks'],
    queryFn: () => fetchLocalTable<Task>('tasks')
  });

  const { data: allLogs = [] } = useQuery<DailyLog[]>({
    queryKey: ['daily_logs'],
    queryFn: () => fetchLocalTable<DailyLog>('daily_logs')
  });

  const { data: allSchedules = [] } = useQuery<FeedingSchedule[]>({
    queryKey: ['feeding_schedules'],
    queryFn: () => fetchLocalTable<FeedingSchedule>('feeding_schedules')
  });

  // --- 2. Data Enhancement & Filtering ---
  const rawAnimals = useMemo(() => allAnimals.filter(a => !a.is_deleted), [allAnimals]);
  const rawTasks = useMemo(() => allTasks.filter(t => t.status !== 'COMPLETED' && !t.is_deleted), [allTasks]);

  const { todaysLogs, lastFeeds } = useMemo(() => {
    const activeLogs = allLogs.filter(l => !l.is_deleted);
    const todays = activeLogs.filter(l => (l.log_date || '').startsWith(selectedDate));
    
    const feeds = activeLogs.filter(l => l.log_type === 'FEED');
    feeds.sort((a, b) => new Date(b.log_date || 0).getTime() - new Date(a.log_date || 0).getTime());
    
    const latestFeeds: DailyLog[] = [];
    const seen = new Set<string>();
    for (const feed of feeds) {
      const aId = feed.animal_id as string;
      if (!seen.has(aId)) {
        latestFeeds.push(feed);
        seen.add(aId);
      }
    }
    return { todaysLogs: todays, lastFeeds: latestFeeds };
  }, [allLogs, selectedDate]);

  const rawSchedules = useMemo(() => {
    return allSchedules
      .filter(s => !s.is_deleted && s.scheduled_date && s.scheduled_date >= selectedDate)
      .sort((a, b) => new Date(a.scheduled_date!).getTime() - new Date(b.scheduled_date!).getTime());
  }, [allSchedules, selectedDate]);

  // --- 3. UI Helper Functions ---
  const adjustDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const formatWeight = (g: number, unitStr: string) => {
    const u = (unitStr || 'g').toLowerCase();
    if (u === 'lbs' || u === 'lb') {
      const totalOz = g / 28.349523125;
      let eighths = Math.round((totalOz - Math.floor(totalOz)) * 8);
      let oz = Math.floor(totalOz);
      if (eighths === 8) { eighths = 0; oz++; }
      let lbs = Math.floor(oz / 16);
      oz = oz % 16;
      const eStr = eighths > 0 ? ` ${eighths}/8` : '';
      return `${lbs}lb ${oz}oz${eStr}`;
    } else if (u === 'oz') {
      const totalOz = g / 28.349523125;
      let eighths = Math.round((totalOz - Math.floor(totalOz)) * 8);
      let oz = Math.floor(totalOz);
      if (eighths === 8) { eighths = 0; oz++; }
      const eStr = eighths > 0 ? ` ${eighths}/8` : '';
      return `${oz}oz${eStr}`;
    } else if (u === 'kg') {
      return `${(g / 1000).toFixed(2)}kg`;
    }
    return `${g}g`;
  };

  const sortedAnimals = [...rawAnimals].sort((a, b) => {
    if (sortMode === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
    if (sortMode === 'NAME_DESC') return (b.name || '').localeCompare(a.name || '');
    if (sortMode === 'CUSTOM') return (a.display_order ?? 999) - (b.display_order ?? 999);
    return 0;
  });

  const enhancedAnimals: EnhancedAnimal[] = sortedAnimals.map((animal) => {
    const animalId = animal.id as string;
    const animalTodaysLogs = todaysLogs.filter((l) => l.animal_id === animalId);
    
    const weightLog = animalTodaysLogs.find((l) => l.log_type === 'WEIGHT');
    const todays_weight = weightLog && weightLog.weight_grams ? formatWeight(weightLog.weight_grams, animal.weight_unit) : null;

    const feedLog = animalTodaysLogs.find((l) => l.log_type === 'FEED');
    const todays_feed = feedLog ? (feedLog.notes || 'Recorded') : null;

    const lastFeedLog = lastFeeds.find((l) => l.animal_id === animalId);
    const last_feed = lastFeedLog ? (lastFeedLog.notes || 'Recorded') : null;

    const schedules = rawSchedules.filter((s) => s.animal_id === animalId);
    const next_feed = schedules.length > 0 ? schedules[0].scheduled_date : null;

    return { ...animal, todays_weight, todays_feed, last_feed, next_feed };
  });

  const filteredAnimals = activeTab === 'ALL' 
    ? enhancedAnimals 
    : enhancedAnimals.filter((a) => (a.category || '').toUpperCase() === activeTab);

  // --- 4. Render Layout ---
  const renderHeaders = () => {
    if (activeTab === 'OWLS' || activeTab === 'RAPTORS') {
      return (
        <>
          <th className="px-6 py-5">Name</th>
          <th className="px-6 py-5">Species</th>
          <th className="px-6 py-5">Ring Number</th>
          <th className="px-6 py-5">Today's Wgt</th>
          <th className="px-6 py-5">Last Feed</th>
          <th className="px-6 py-5">Today's Feed</th>
          <th className="px-6 py-5">Location</th>
        </>
      );
    }
    if (activeTab === 'MAMMALS') {
      return (
        <>
          <th className="px-6 py-5">Name</th>
          <th className="px-6 py-5">Species</th>
          <th className="px-6 py-5">Microchip</th>
          <th className="px-6 py-5">Today's Feed</th>
          <th className="px-6 py-5">Location</th>
        </>
      );
    }
    if (activeTab === 'EXOTICS') {
      return (
        <>
          <th className="px-6 py-5">Name</th>
          <th className="px-6 py-5">Species</th>
          <th className="px-6 py-5">Today's Feed</th>
          <th className="px-6 py-5">Next Sched. Feed</th>
          <th className="px-6 py-5">Location</th>
        </>
      );
    }
    return (
      <>
        <th className="px-6 py-5">Name</th>
        <th className="px-6 py-5">Category</th>
        <th className="px-6 py-5">Species</th>
        <th className="px-6 py-5">Location</th>
      </>
    );
  };

  const renderRowCells = (animal: EnhancedAnimal) => {
    const emptyNode = <span className="text-slate-700">--</span>;
    const nameCell = (
      <td className="px-6 py-4 text-xs font-bold">
        <Link 
          to="/animals/$id" 
          params={{ id: animal.id as string }}
          className="text-emerald-400 hover:text-emerald-300 transition-colors underline decoration-emerald-500/30 underline-offset-4"
        >
          {animal.name || 'Unnamed'}
        </Link>
      </td>
    );

    if (activeTab === 'OWLS' || activeTab === 'RAPTORS') {
      return (
        <>
          {nameCell}
          <td className="px-6 py-4 text-xs font-bold text-slate-500">{animal.species || 'Unknown'}</td>
          <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{animal.ring_number || emptyNode}</td>
          <td className="px-6 py-4 text-xs font-bold text-amber-500 truncate max-w-[120px]">{animal.todays_weight || emptyNode}</td>
          <td className="px-6 py-4 text-xs font-bold text-slate-500 truncate max-w-[150px]">{animal.last_feed || emptyNode}</td>
          <td className="px-6 py-4 text-xs font-bold text-slate-500 truncate max-w-[150px]">{animal.todays_feed || emptyNode}</td>
          <td className="px-6 py-4"><span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">{animal.location || 'Unknown'}</span></td>
        </>
      );
    }
    if (activeTab === 'MAMMALS') {
      return (
        <>
          {nameCell}
          <td className="px-6 py-4 text-xs font-bold text-slate-500">{animal.species || 'Unknown'}</td>
          <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{animal.microchip_id || emptyNode}</td>
          <td className="px-6 py-4 text-xs font-bold text-slate-500 truncate max-w-[180px]">{animal.todays_feed || emptyNode}</td>
          <td className="px-6 py-4"><span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">{animal.location || 'Unknown'}</span></td>
        </>
      );
    }
    if (activeTab === 'EXOTICS') {
      return (
        <>
          {nameCell}
          <td className="px-6 py-4 text-xs font-bold text-slate-500">{animal.species || 'Unknown'}</td>
          <td className="px-6 py-4 text-xs font-bold text-slate-500 truncate max-w-[180px]">{animal.todays_feed || emptyNode}</td>
          <td className="px-6 py-4 text-[10px] font-black text-amber-500/80 uppercase tracking-widest">{animal.next_feed || emptyNode}</td>
          <td className="px-6 py-4"><span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">{animal.location || 'Unknown'}</span></td>
        </>
      );
    }
    return (
      <>
        {nameCell}
        <td className="px-6 py-4 text-[10px] font-black text-blue-400 uppercase tracking-widest">{animal.category || emptyNode}</td>
        <td className="px-6 py-4 text-xs font-bold text-slate-500">{animal.species || 'Unknown'}</td>
        <td className="px-6 py-4"><span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">{animal.location || 'Unknown'}</span></td>
      </>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans p-6">
      
      {/* INJECTED ENGINE */}
      <SyncEngine />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase flex items-center gap-3">Dashboard</h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
            Live Local Sync <span className="text-slate-700">|</span> 🌤️ Active
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-[#0F1117] rounded-2xl border border-slate-800/80 shadow-2xl p-5 flex flex-col transition-all duration-300 h-64 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[64px] rounded-full pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0A0B0E] border border-slate-800/80 text-blue-500 rounded-xl shadow-inner"><ClipboardCheck size={18} /></div>
                      <h2 className="text-sm font-black text-white uppercase tracking-widest">Pending Duties</h2>
                  </div>
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black px-2.5 py-1 rounded-lg">{rawTasks.length}</span>
              </div>
              <div className="mt-4 flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-hide relative z-10">
                  {rawTasks.length > 0 ? rawTasks.map((t) => (
                      <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#0A0B0E] border border-slate-800/80 shadow-inner">
                          <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0"/>
                          <div>
                              <p className="text-xs font-bold text-slate-200">{t.title}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Due: {t.due_date || 'N/A'}</p>
                          </div>
                      </div>
                  )) : (
                      <div className="flex flex-col items-center justify-center h-full text-slate-500">
                          <CheckCircle size={24} className="text-emerald-500/50 mb-3"/>
                          <p className="text-xs font-bold uppercase tracking-widest">All duties satisfied</p>
                      </div>
                  )}
              </div>
          </div>

          <div className="bg-[#0F1117] rounded-2xl border border-slate-800/80 shadow-2xl p-5 flex flex-col transition-all duration-300 h-64 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-[64px] rounded-full pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0A0B0E] border border-slate-800/80 text-rose-500 rounded-xl shadow-inner"><Heart size={18} /></div>
                      <h2 className="text-sm font-black text-white uppercase tracking-widest">Health Rota</h2>
                  </div>
              </div>
              <div className="flex flex-col items-center justify-center h-full text-slate-500 relative z-10">
                  <Heart size={24} className="text-rose-500/30 mb-3"/>
                  <p className="text-xs font-bold uppercase tracking-widest">Collection Stable</p>
              </div>
          </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0F1117] border border-slate-800/80 p-3 rounded-2xl shadow-inner">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <button onClick={() => adjustDate(-1)} className="p-2 bg-[#0A0B0E] border border-slate-800/80 rounded-xl text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors shadow-inner" title="Previous Day">
              <ChevronLeft size={16} />
            </button>
            <button onClick={setToday} className="px-3 py-2 bg-[#0A0B0E] border border-slate-800/80 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors shadow-inner">
              Today
            </button>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-36 bg-[#0A0B0E] border border-slate-800/80 rounded-xl pl-9 pr-2 py-2 text-xs font-bold text-white focus:outline-none"
              />
            </div>
            <button onClick={() => adjustDate(1)} className="p-2 bg-[#0A0B0E] border border-slate-800/80 rounded-xl text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors shadow-inner" title="Next Day">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-800/80" />

          <div className="relative flex-1 sm:flex-none">
            <ArrowDownAZ className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <select 
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-full bg-[#0A0B0E] border border-slate-800/80 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-white focus:outline-none appearance-none"
            >
              <option value="NAME_ASC">Name (A-Z)</option>
              <option value="NAME_DESC">Name (Z-A)</option>
              <option value="CUSTOM">Custom Order</option>
            </select>
          </div>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        >
          <Plus size={16} /> Add Animal
        </button>
      </div>

      <div className="flex overflow-x-auto scrollbar-hide bg-[#0F1117] border border-slate-800/80 p-1.5 rounded-2xl gap-1 shadow-inner">
        {['ALL', 'OWLS', 'RAPTORS', 'MAMMALS', 'EXOTICS', 'ARCHIVED'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`flex-1 min-w-[100px] py-2.5 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
              activeTab === cat 
              ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20 shadow-sm' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-[#0A0B0E]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-[#0F1117] rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden relative">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0A0B0E] border-b border-slate-800/80 text-slate-500 font-black text-[10px] uppercase tracking-widest">
              <tr>
                {renderHeaders()}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredAnimals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0A0B0E] border border-slate-800/80 mb-4 shadow-inner">
                      <Scale size={24} className="text-slate-600" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">No Records Found</h3>
                    <p className="text-xs font-bold text-slate-500 mt-2">No animals match this category filter.</p>
                  </td>
                </tr>
              ) : (
                filteredAnimals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-[#0A0B0E] transition-colors group">
                    {renderRowCells(animal)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <AnimalFormModal onClose={() => setIsAddModalOpen(false)} />
      )}
    </div>
  );
}