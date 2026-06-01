// ============================================================================
// File: src/routes/animals.$id.tsx
// ============================================================================
import React, { useState, useMemo } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  ArrowLeft, Scale, Utensils, Award, Activity, AlertCircle, Calendar, Plus, Save, Trash, ShieldAlert, Heart
} from 'lucide-react';
import { fetchLocalTable } from '../lib/queries';
import { db, queryClient } from '../lib/db';
import { baseService } from '../services/baseService';
import type { Animal, DailyLog, FeedingSchedule } from '../types/schema';

export const Route = createFileRoute('/animals/$id')({
  component: AnimalDetail,
});

function AnimalDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  // State for adding new entries directly on the details page
  const [logType, setLogType] = useState<'WEIGHT' | 'FEED' | 'NOTE'>('WEIGHT');
  const [weightValue, setWeightValue] = useState('');
  const [feedNotes, setFeedNotes] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Live Query Hooks using Offline-First Pipeline
  const { data: allAnimals = [] } = useQuery<Animal[]>({
    queryKey: ['animals'],
    queryFn: () => fetchLocalTable<Animal>('animals')
  });

  const { data: allLogs = [] } = useQuery<DailyLog[]>({
    queryKey: ['daily_logs'],
    queryFn: () => fetchLocalTable<DailyLog>('daily_logs')
  });

  const { data: allSchedules = [] } = useQuery<FeedingSchedule[]>({
    queryKey: ['feeding_schedules'],
    queryFn: () => fetchLocalTable<FeedingSchedule>('feeding_schedules')
  });

  // 2. Select this specific animal
  const animal = useMemo(() => {
    return allAnimals.find((a) => a.id === id && !a.is_deleted);
  }, [allAnimals, id]);

  // 3. Select logs and schedules specific to this animal
  const animalLogs = useMemo(() => {
    const logs = allLogs.filter((l) => l.animal_id === id && !l.is_deleted);
    // Sort descending by date
    return [...logs].sort((a, b) => new Date(b.log_date || 0).getTime() - new Date(a.log_date || 0).getTime());
  }, [allLogs, id]);

  const animalSchedules = useMemo(() => {
    return allSchedules.filter((s) => s.animal_id === id && !s.is_deleted);
  }, [allSchedules, id]);

  // 4. Computed stats
  const currentWeight = useMemo(() => {
    const weightLog = animalLogs.find((l) => l.log_type === 'WEIGHT' && l.weight_grams);
    return weightLog ? weightLog.weight_grams : null;
  }, [animalLogs]);

  const formatWeight = (g: number | null | undefined) => {
    if (g === undefined || g === null) return '--';
    const unitStr = (animal?.weight_unit || 'g').toLowerCase();
    if (unitStr === 'lbs' || unitStr === 'lb') {
      const totalOz = g / 28.349523125;
      let eighths = Math.round((totalOz - Math.floor(totalOz)) * 8);
      let oz = Math.floor(totalOz);
      if (eighths === 8) { eighths = 0; oz++; }
      let lbs = Math.floor(oz / 16);
      oz = oz % 16;
      const eStr = eighths > 0 ? ` ${eighths}/8` : '';
      return `${lbs}lb ${oz}oz${eStr}`;
    } else if (unitStr === 'oz') {
      const totalOz = g / 28.349523125;
      let eighths = Math.round((totalOz - Math.floor(totalOz)) * 8);
      let oz = Math.floor(totalOz);
      if (eighths === 8) { eighths = 0; oz++; }
      const eStr = eighths > 0 ? ` ${eighths}/8` : '';
      return `${oz}oz${eStr}`;
    } else if (unitStr === 'kg') {
      return `${(g / 1000).toFixed(2)}kg`;
    }
    return `${g}g`;
  };

  // Handle Log submission
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animal) return;

    setIsSaving(true);
    setActionError(null);

    const payload: Partial<DailyLog> = {
      id: crypto.randomUUID(),
      animal_id: id,
      log_type: logType,
      log_date: `${logDate}T12:00:00Z`, // Default to midday UTC
      notes: logType === 'FEED' ? feedNotes : logType === 'NOTE' ? generalNotes : `Weight Recorded`,
      weight_grams: logType === 'WEIGHT' ? Number(weightValue) : null,
      weight_unit: logType === 'WEIGHT' ? animal.weight_unit : null,
      is_deleted: false,
    };

    try {
      await baseService.upsert({
        table: 'daily_logs',
        payload,
        queryKey: ['daily_logs'],
      });

      // Reset fields
      setWeightValue('');
      setFeedNotes('');
      setGeneralNotes('');
      queryClient.invalidateQueries({ queryKey: ['daily_logs'] });
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to record entry.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Animal Soft-Delete
  const handleDeleteAnimal = async () => {
    if (!animal || !confirm(`Are you sure you want to soft-delete/archive ${animal.name || 'this animal'}?`)) {
      return;
    }

    try {
      await baseService.softDelete({
        table: 'animals',
        payload: animal,
        queryKey: ['animals'],
      });

      queryClient.invalidateQueries({ queryKey: ['animals'] });
      navigate({ to: '/' as any });
    } catch (err: any) {
      console.error(err);
      alert('Failed to archive: ' + err.message);
    }
  };

  if (!animal) {
    return (
      <div className="p-8 text-center bg-[#0F1117] border border-slate-800 rounded-3xl max-w-xl mx-auto my-12">
        <AlertCircle size={40} className="text-amber-500 mx-auto mb-4" />
        <h2 className="text-lg font-black text-white uppercase tracking-wider">Record Not Found</h2>
        <p className="text-xs font-bold text-slate-500 mt-2">
          The animal ID does not match any current collection members, or it may have been deleted.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4 md:p-6 font-sans">
      {/* Back button and action block */}
      <div className="flex items-center justify-between">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
        >
          <ArrowLeft size={16} /> Portfolio Dashboard
        </Link>

        <button
          onClick={handleDeleteAnimal}
          className="flex items-center gap-2 px-4 py-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 active:bg-rose-500/30 text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
        >
          <Trash size={14} /> Archive Animal
        </button>
      </div>

      {/* Main Profile Header Card */}
      <div className="relative bg-[#0F1117] rounded-3xl border border-slate-800/80 shadow-2xl p-6 md:p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                {animal.category || 'EXOTICS'}
              </span>
              {animal.is_venomous && (
                <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert size={10} /> Venomous
                </span>
              )}
              {animal.is_quarantine && (
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                  Quarantine
                </span>
              )}
              {animal.is_boarding && (
                <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                  Boarding Guest
                </span>
              )}
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight uppercase">
              {animal.name}
            </h1>
            <p className="text-sm font-bold text-slate-400">
              {animal.species} <span className="text-slate-600 font-normal">({animal.latin_name || 'N/A'})</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 bg-[#0A0B0E] border border-slate-800/80 p-5 rounded-2xl md:min-w-[400px]">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Ident Tag</p>
              <p className="text-xs font-black text-white mt-1 uppercase tracking-wider">
                {animal.ring_number || animal.microchip_id || '--'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Placement</p>
              <p className="text-xs font-black text-emerald-400 mt-1 uppercase tracking-wider">
                {animal.location || 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Redlist Status</p>
              <p className="text-xs font-black text-slate-300 mt-1 uppercase tracking-wider">
                {animal.red_list_status || 'LC'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Details, Metrics, adding values */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: Physical Metrics & Husbandry Instructions */}
        <div className="space-y-6 lg:col-span-1">
          {/* Target Weight Card */}
          <div className="bg-[#0F1117] rounded-3xl border border-slate-800/80 p-6 space-y-4">
            <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Scale size={14} className="text-emerald-500" /> Target Weights ({animal.weight_unit})
            </h2>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0A0B0E] p-3 rounded-xl border border-slate-800/80 text-center">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Current</p>
                <p className="text-xs font-black text-amber-500 mt-1">{formatWeight(currentWeight)}</p>
              </div>
              <div className="bg-[#0A0B0E] p-3 rounded-xl border border-slate-800/80 text-center">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Flying</p>
                <p className="text-xs font-black text-white mt-1">
                  {animal.flying_weight_g ? `${animal.flying_weight_g}g` : '--'}
                </p>
              </div>
              <div className="bg-[#0A0B0E] p-3 rounded-xl border border-slate-800/80 text-center">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Average</p>
                <p className="text-xs font-black text-white mt-1">
                  {animal.average_target_weight ? `${animal.average_target_weight}g` : '--'}
                </p>
              </div>
            </div>
          </div>

          {/* Critical Instructions */}
          <div className="bg-[#0F1117] rounded-3xl border border-slate-800/80 p-6 space-y-4">
            <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <ShieldAlert size={14} className="text-red-500" /> Critical Care
            </h2>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Husbandry Notes</p>
                <p className="text-xs text-slate-300 font-bold mt-1 leading-relaxed bg-[#0A0B0E] border border-slate-800/80 p-3 rounded-xl">
                  {animal.critical_husbandry_notes || 'None recorded.'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Special Requirements</p>
                <p className="text-xs text-slate-300 font-bold mt-1 leading-relaxed bg-[#0A0B0E] border border-slate-800/80 p-3 rounded-xl">
                  {animal.special_requirements || 'None recorded.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Logging and Recording Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Form to submit daily activity logs */}
          <div className="bg-[#0F1117] rounded-3xl border border-slate-800/80 p-6 space-y-4">
            <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Plus size={14} className="text-emerald-500" /> Record Daily Intervention
            </h2>

            <form onSubmit={handleAddLog} className="space-y-4">
              {actionError && (
                <div className="p-3 text-xs font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  {actionError}
                </div>
              )}

              <div className="flex overflow-x-auto bg-[#0A0B0E] border border-slate-800/80 p-1 rounded-xl">
                {(['WEIGHT', 'FEED', 'NOTE'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLogType(type)}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${
                      logType === type
                        ? 'bg-emerald-600/15 text-emerald-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {logType === 'WEIGHT' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                    Weight in Grams (g) <span className="text-emerald-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={weightValue}
                    onChange={(e) => setWeightValue(e.target.value)}
                    placeholder="e.g. 334"
                    className="w-full bg-[#0A0B0E] border border-slate-800/80 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              {logType === 'FEED' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                    Feed Details / Items Fed <span className="text-emerald-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={feedNotes}
                    onChange={(e) => setFeedNotes(e.target.value)}
                    placeholder="e.g. 2x Mice fed, fully devoured..."
                    className="w-full bg-[#0A0B0E] border border-slate-800/80 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>
              )}

              {logType === 'NOTE' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                    General Husbandry / Behavioral Note <span className="text-emerald-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="e.g. Performed well during demonstrations, calm temperament..."
                    className="w-full bg-[#0A0B0E] border border-slate-800/80 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                    Log Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                      type="date"
                      required
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="w-full bg-[#0A0B0E] border border-slate-800/80 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full h-[41px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors shadow-md"
                  >
                    <Save size={14} />
                    {isSaving ? 'Submitting...' : 'Commit Record'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Detailed Activity log list */}
          <div className="bg-[#0F1117] rounded-3xl border border-slate-800/80 p-6 space-y-4">
            <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Activity size={14} className="text-emerald-500" /> Chronological Logs
            </h2>

            <div className="divide-y divide-slate-800/80 space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {animalLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-600 font-bold uppercase tracking-widest text-xs">
                  No records committed on file.
                </div>
              ) : (
                animalLogs.map((log) => (
                  <div key={log.id} className="pt-4 first:pt-0 flex items-start gap-4 justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          log.log_type === 'WEIGHT' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : log.log_type === 'FEED' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {log.log_type}
                        </span>
                        
                        <p className="text-[10px] font-bold text-slate-400">
                          {log.log_date ? new Date(log.log_date).toISOString().split('T')[0] : 'N/A'}
                        </p>
                      </div>

                      <p className="text-xs font-bold text-slate-200 leading-relaxed mt-1.5">
                        {log.notes || 'Recorded log entry.'}
                      </p>
                    </div>

                    {log.log_type === 'WEIGHT' && log.weight_grams && (
                      <span className="text-xs font-black text-amber-500 shrink-0">
                        {formatWeight(log.weight_grams)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
