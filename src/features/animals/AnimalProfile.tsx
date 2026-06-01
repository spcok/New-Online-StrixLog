// ============================================================================
// File: src/features/animals/AnimalProfile.tsx
// ============================================================================
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText, Stethoscope, ClipboardList, AlertTriangle, ShieldAlert, Scale, Thermometer, GitMerge, Edit } from 'lucide-react';
import { AnimalFormModal } from './AnimalFormModal';
import { getDynamicImageUrl } from '../../lib/supabase';
import { fetchLocalTable } from '../../lib/queries';
import type { Animal, DailyLog } from '../../types/schema';

export function AnimalProfile({ animalId, onBack }: { animalId?: string, onBack?: () => void }) {
  const { id } = useParams({ strict: false });
  const effectiveId = animalId || id;
  const navigate = useNavigate();

  // 1. Local Vault Query for Animals
  const { data: rawAnimals = [] } = useQuery<Animal[]>({ 
    queryKey: ['animals'],
    queryFn: () => fetchLocalTable<Animal>('animals')
  });
  
  const animal = rawAnimals.find(a => a.id === effectiveId && !a.is_deleted);

  const [activeTab, setActiveTab] = useState<'profile' | 'medical' | 'husbandry'>('profile');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 2. Local Vault Query for Husbandry Logs
  const { data: allLogs = [], isLoading: loadingLogs } = useQuery<DailyLog[]>({
    queryKey: ['daily_logs'],
    queryFn: () => fetchLocalTable<DailyLog>('daily_logs')
  });

  const husbandryLogs = useMemo(() => {
    return allLogs
      .filter(log => log.animal_id === effectiveId && !log.is_deleted)
      .sort((a, b) => new Date(b.log_date || 0).getTime() - new Date(a.log_date || 0).getTime());
  }, [allLogs, effectiveId]);

  if (!animal) {
    return <div className="p-8 text-center text-slate-500 font-black uppercase tracking-widest">Animal not found in local vault.</div>;
  }

  const handleBack = () => {
    if (onBack) onBack();
    else navigate({ to: '/' });
  };

  return (
    <div className="space-y-4 p-2 md:p-4 font-sans max-w-[1600px] mx-auto">
      <button onClick={handleBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-300 font-bold text-xs uppercase tracking-widest mb-4 transition-colors">
        <ArrowLeft size={16} /> Back to Vault
      </button>

      <div className="bg-[#0F1117] border border-slate-800/80 rounded-3xl shadow-2xl p-5 flex flex-col md:flex-row gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="w-full md:w-1/3 flex flex-col gap-4 relative z-10">
          <div className="relative w-full h-[300px] bg-[#0A0B0E] border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            {animal.image_url ? (
              <img src={getDynamicImageUrl(animal.image_url)} alt={animal.name || 'Animal'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-700 font-black text-xs uppercase tracking-widest">No Media</span>
            )}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-between relative z-10">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl font-black text-white tracking-tight">{animal.name || 'Unnamed'}</h1>
              <div className="flex gap-2">
                {animal.is_boarding && <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black rounded-lg uppercase tracking-widest">Boarding</span>}
                {animal.is_quarantine && <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black rounded-lg uppercase tracking-widest">Quarantine</span>}
                {animal.red_list_status && <span className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black rounded-lg uppercase tracking-widest">{animal.red_list_status}</span>}
                <button onClick={() => setIsEditModalOpen(true)} className="p-2 bg-[#0A0B0E] border border-slate-800/80 text-emerald-500 hover:text-emerald-400 rounded-xl transition-colors shadow-inner ml-2">
                  <Edit size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-1 mb-6">
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">ID: {animal.id}</p>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Ring: <span className="text-slate-300">{animal.ring_number || 'Un-ringed'}</span> | Chip: <span className="text-slate-300">{animal.microchip_id || 'None'}</span></p>
            </div>
            
            <div className="mb-6">
              <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest block mb-1">Location</span>
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                {animal.location || 'Unknown'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
              <div>
                <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest block mb-1">Species</span>
                <span className="text-sm font-bold text-slate-200">{animal.species || '--'}</span>
                {animal.latin_name && <span className="block text-slate-500 italic text-[10px]">{animal.latin_name}</span>}
              </div>
              <div>
                <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest block mb-1">Sex</span>
                <span className="text-sm font-bold text-slate-200">{animal.gender || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest block mb-1">Origin</span>
                <span className="text-sm font-bold text-slate-200">{animal.origin || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest block mb-1">Date of Birth</span>
                <span className="text-sm font-bold text-slate-200">{animal.is_dob_unknown ? 'Unknown' : (animal.date_of_birth || 'Unknown')}</span>
              </div>
              <div>
                <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest block mb-1">Acquisition</span>
                <span className="text-sm font-bold text-slate-200">{animal.acquisition_date || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-800/80">
        <nav className="flex gap-6 px-2">
          {[{ id: 'profile', label: 'Profile', icon: FileText }, { id: 'medical', label: 'Medical', icon: Stethoscope }, { id: 'husbandry', label: 'Husbandry', icon: ClipboardList }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-4 px-1 border-b-2 transition-all font-black text-xs uppercase tracking-widest ${
                activeTab === tab.id 
                  ? 'border-emerald-500 text-emerald-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-[#0F1117] border border-slate-800/80 rounded-3xl shadow-2xl p-5 min-h-[400px]">
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-5 lg:col-span-1 xl:col-span-2 shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-rose-500" size={18} />
                <h3 className="font-black text-white uppercase tracking-widest text-xs">Critical Husbandry Notes</h3>
              </div>
              <p className="text-sm font-bold text-rose-400/80 leading-relaxed whitespace-pre-wrap">
                {animal.critical_husbandry_notes || 'No critical notes recorded.'}
              </p>
            </div>

            <div className="bg-[#0A0B0E] border border-slate-800/80 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <ShieldAlert className="text-amber-500" size={18} />
                <h3 className="font-black text-white uppercase tracking-widest text-xs">Safety</h3>
              </div>
              <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between"><span className="text-slate-500">Hazard Rating:</span> <span className={`uppercase tracking-widest ${animal.hazard_rating === 'HIGH' ? 'text-rose-500' : 'text-slate-200'}`}>{animal.hazard_rating || 'None'}</span></div>
                {animal.is_venomous && <div className="text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest inline-block mt-2">VENOMOUS</div>}
              </div>
            </div>

            <div className="bg-[#0A0B0E] border border-slate-800/80 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <Scale className="text-emerald-500" size={18} />
                <h3 className="font-black text-white uppercase tracking-widest text-xs">Weight Management</h3>
              </div>
              <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between"><span className="text-slate-500">Unit:</span> <span className="text-slate-200 uppercase">{animal.weight_unit || 'g'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Flying Weight:</span> <span className="text-slate-200">{animal.flying_weight_g ? `${animal.flying_weight_g}${animal.weight_unit || 'g'}` : '--'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Winter Weight:</span> <span className="text-slate-200">{animal.winter_weight_g ? `${animal.winter_weight_g}${animal.weight_unit || 'g'}` : '--'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Target Avg:</span> <span className="text-slate-200">{animal.average_target_weight ? `${animal.average_target_weight}${animal.weight_unit || 'g'}` : '--'}</span></div>
              </div>
            </div>

            <div className="bg-[#0A0B0E] border border-slate-800/80 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <Thermometer className="text-blue-500" size={18} />
                <h3 className="font-black text-white uppercase tracking-widest text-xs">Environment</h3>
              </div>
              <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between"><span className="text-slate-500">Ambient Only:</span> <span className="text-slate-200">{animal.ambient_temp_only ? 'Yes' : 'No'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Day Target:</span> <span className="text-slate-200">{animal.target_day_temp_c ? `${animal.target_day_temp_c}°C` : '--'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Night Target:</span> <span className="text-slate-200">{animal.target_night_temp_c ? `${animal.target_night_temp_c}°C` : '--'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Humidity:</span> <span className="text-slate-200">{animal.target_humidity_min_percent || '--'}% - {animal.target_humidity_max_percent || '--'}%</span></div>
              </div>
            </div>

            <div className="bg-[#0A0B0E] border border-slate-800/80 rounded-2xl p-5 shadow-inner">
              <div className="flex items-center gap-3 mb-4">
                <GitMerge className="text-purple-500" size={18} />
                <h3 className="font-black text-white uppercase tracking-widest text-xs">Genetics & Lineage</h3>
              </div>
              <div className="space-y-3 text-sm font-bold">
                <div className="flex justify-between"><span className="text-slate-500">Lineage:</span> <span className="text-slate-200">{animal.lineage_unknown ? 'Unknown' : 'Known'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Sire ID:</span> <span className="text-slate-200 text-[10px] font-mono">{animal.sire_id || '--'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Dam ID:</span> <span className="text-slate-200 text-[10px] font-mono">{animal.dam_id || '--'}</span></div>
              </div>
            </div>

            {animal.distribution_map_url && (
              <div className="bg-[#0A0B0E] border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner flex flex-col">
                <div className="p-4 border-b border-slate-800/80"><h3 className="font-black text-white uppercase tracking-widest text-xs">Distribution</h3></div>
                <img src={getDynamicImageUrl(animal.distribution_map_url) || ''} alt="Distribution Map" className="w-full h-48 object-cover opacity-80" />
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'medical' && <div className="flex items-center justify-center h-48 text-slate-500 font-black text-xs uppercase tracking-widest">Medical Module Pending Downlink</div>}
        
        {activeTab === 'husbandry' && (
          <div className="bg-[#0A0B0E] border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner">
            <div className="p-5 border-b border-slate-800/80 bg-[#0F1117] flex justify-between items-center">
              <h3 className="font-black text-white uppercase tracking-widest text-xs">Husbandry & Observation History</h3>
            </div>
            
            {loadingLogs ? (
              <div className="flex items-center justify-center h-48 text-slate-500 font-black text-xs uppercase tracking-widest animate-pulse">Retrieving Logs...</div>
            ) : husbandryLogs.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-500 font-black text-xs uppercase tracking-widest">No historical logs found for this animal.</div>
            ) : (
              <div className="divide-y divide-slate-800/80 max-h-[600px] overflow-y-auto custom-scrollbar">
                {husbandryLogs.map((log: any) => (
                  <div key={log.id} className="p-5 hover:bg-slate-800/20 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                        {log.log_type}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {log.log_date ? new Date(log.log_date).toLocaleString('en-GB', { dateStyle: 'medium' }) : 'Unknown Date'}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mb-2">
                      {log.weight_grams && (
                        <div className="text-xs font-bold text-slate-300 bg-[#0F1117] px-3 py-1.5 rounded-lg border border-slate-800/80 shadow-inner">
                          <span className="text-slate-500 mr-2">WT:</span>{log.weight_grams}{(log as any).weight_unit || 'g'}
                        </div>
                      )}
                      {log.temperature_c && (
                        <div className="text-xs font-bold text-slate-300 bg-[#0F1117] px-3 py-1.5 rounded-lg border border-slate-800/80 shadow-inner">
                          <span className="text-slate-500 mr-2">TEMP:</span>{log.temperature_c}°C
                        </div>
                      )}
                      {(log.basking_temp_c || log.cool_temp_c) && (
                        <div className="text-xs font-bold text-slate-300 bg-[#0F1117] px-3 py-1.5 rounded-lg border border-slate-800/80 shadow-inner">
                          <span className="text-slate-500 mr-2">GRADIENT:</span>{log.basking_temp_c || '--'}°C / {log.cool_temp_c || '--'}°C
                        </div>
                      )}
                    </div>
                    
                    {log.notes && (
                      <div className="mt-3 text-sm font-bold text-slate-400 bg-[#0F1117]/50 p-4 rounded-xl border border-slate-800/50 leading-relaxed whitespace-pre-wrap">
                        {log.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isEditModalOpen && <AnimalFormModal initialData={animal} onClose={() => setIsEditModalOpen(false)} />}
    </div>
  );
}