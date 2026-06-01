// ============================================================================
// File: src/features/animals/AnimalFormModal.tsx
// ============================================================================
import React, { useState } from 'react';
import { UploadCloud, Image as ImageIcon, Map, X } from 'lucide-react';
import { Animal } from '../../types/schema';
import { useAuthStore } from '../../store/authStore';
import { getDynamicImageUrl, supabase } from '../../lib/supabase';
import { baseService } from '../../services/baseService';

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="bg-[#0A0B0E] border border-slate-800/80 rounded-2xl p-5 shadow-inner space-y-4">
    <h3 className="font-black text-emerald-500 uppercase tracking-widest text-[10px] border-b border-slate-800/80 pb-2">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
  </div>
);

interface FieldProps {
  label: string;
  field: keyof Animal;
  type?: 'text' | 'number' | 'checkbox' | 'select' | 'date';
  options?: string[];
  formData: Partial<Animal>;
  update: (field: keyof Animal, value: any) => void;
  required?: boolean;
}

const Field = ({ label, field, type = 'text', options, formData, update, required }: FieldProps) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
      {label} {required && <span className="text-rose-500 text-xs">*</span>}
    </label>
    {type === 'select' ? (
      <select required={required} value={(formData[field] as string) || ''} onChange={(e) => update(field, e.target.value)} className="w-full bg-[#0F1117] border border-slate-800/80 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50">
        <option value="">Select...</option>
        {options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : type === 'checkbox' ? (
      <div className="flex items-center h-10">
        <input type="checkbox" checked={!!formData[field]} onChange={(e) => update(field, e.target.checked)} className="w-5 h-5 rounded bg-[#0F1117] border-slate-800/80 text-emerald-500 focus:ring-emerald-500" />
      </div>
    ) : (
      <input required={required} type={type} value={(formData[field] as string | number) || ''} onChange={(e) => update(field, type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)} className="w-full bg-[#0F1117] border border-slate-800/80 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500/50" />
    )}
  </div>
);

interface AnimalFormModalProps {
  initialData?: Animal;
  onClose: () => void;
}

export function AnimalFormModal({ initialData, onClose }: AnimalFormModalProps) {
  const user = useAuthStore(s => s.user);

  const [formData, setFormData] = useState<Partial<Animal>>(() => initialData || { 
    weight_unit: 'g', 
    entity_type: 'individual',
    census_count: 1,
    red_list_status: 'NE',
    is_deleted: false // Ensure offline default is set
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'map') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === 'image') setImageFile(file);
    if (type === 'map') setMapFile(file);
  };

  const update = (field: keyof Animal, value: any) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsUploading(true);
    try {
      let finalData = { ...formData, created_by: formData.created_by || user.id };

      // 1. Process Online Image Uploads (Fails gracefully if offline)
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `profiles/${crypto.randomUUID()}.${fileExt}`;
        const { error } = await supabase.storage.from('media').upload(filePath, imageFile);
        if (!error) finalData.image_url = filePath;
      }

      if (mapFile) {
        const fileExt = mapFile.name.split('.').pop();
        const filePath = `maps/${crypto.randomUUID()}.${fileExt}`;
        const { error } = await supabase.storage.from('media').upload(filePath, mapFile);
        if (!error) finalData.distribution_map_url = filePath;
      }

      // 2. Fire the Unified Write Pipeline
      await baseService.upsert({
        table: 'animals',
        payload: finalData,
        queryKey: ['animals'] // Instantly invalidates/updates the local dashboard cache
      });

      onClose();
    } catch (err) {
      console.error("[AnimalForm] Form submission failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const imagePreview = imageFile ? URL.createObjectURL(imageFile) : getDynamicImageUrl(formData.image_url);
  const mapPreview = mapFile ? URL.createObjectURL(mapFile) : getDynamicImageUrl(formData.distribution_map_url);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-[#0F1117] border border-slate-800/80 rounded-3xl w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl relative overflow-hidden">
        <div className="bg-[#0F1117]/90 backdrop-blur border-b border-slate-800/80 p-5 flex justify-between items-center z-20 shrink-0">
          <h2 className="text-lg font-black text-white uppercase tracking-widest">{initialData ? 'Edit Full Record' : 'Register New Animal'}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white font-bold text-xs uppercase tracking-widest">Cancel</button>
        </div>

        <form id="animal-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><ImageIcon size={14} /> Profile Photo</label>
              {imagePreview ? (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-800/80 group">
                  <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setImageFile(null); update('image_url', null); }} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-rose-500 text-white rounded-lg"><X size={16} /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 bg-[#0A0B0E] border-2 border-dashed border-slate-800/80 rounded-2xl cursor-pointer hover:border-emerald-500/50">
                  <UploadCloud size={24} className="text-slate-600 mb-2" />
                  <span className="text-xs font-bold text-slate-500">Upload Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                </label>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Map size={14} /> Distribution Map</label>
              {mapPreview ? (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-800/80 group">
                  <img src={mapPreview} alt="Map" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setMapFile(null); update('distribution_map_url', null); }} className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-rose-500 text-white rounded-lg"><X size={16} /></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 bg-[#0A0B0E] border-2 border-dashed border-slate-800/80 rounded-2xl cursor-pointer hover:border-blue-500/50">
                  <UploadCloud size={24} className="text-slate-600 mb-2" />
                  <span className="text-xs font-bold text-slate-500">Upload Map</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'map')} />
                </label>
              )}
            </div>
          </div>

          <Section title="Basic Info">
            <Field label="Entity Type" field="entity_type" type="select" options={['individual', 'group']} formData={formData} update={update} required />
            <Field label="Parent Mob ID" field="parent_mob_id" formData={formData} update={update} />
            <Field label="Census Count" field="census_count" type="number" formData={formData} update={update} required />
            <Field label="Name" field="name" formData={formData} update={update} required />
            <Field label="Category" field="category" type="select" options={['OWLS', 'RAPTORS', 'MAMMALS', 'EXOTICS']} formData={formData} update={update} required />
            <Field label="Location" field="location" formData={formData} update={update} />
            <Field label="Boarding" field="is_boarding" type="checkbox" formData={formData} update={update} />
            <Field label="Quarantine" field="is_quarantine" type="checkbox" formData={formData} update={update} />
          </Section>

          <Section title="Taxonomy & Demographics">
            <Field label="Species" field="species" formData={formData} update={update} required />
            <Field label="Latin Name" field="latin_name" formData={formData} update={update} />
            <Field label="Gender" field="gender" type="select" options={['MALE', 'FEMALE', 'UNKNOWN']} formData={formData} update={update} />
            <Field label="Date of Birth" field="date_of_birth" type="date" formData={formData} update={update} />
            <Field label="DOB Unknown" field="is_dob_unknown" type="checkbox" formData={formData} update={update} />
            <Field label="Red List Status" field="red_list_status" type="select" options={['NE', 'DD', 'LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX']} formData={formData} update={update} required />
          </Section>

          <Section title="Identifiers">
            <Field label="Ring Number" field="ring_number" formData={formData} update={update} />
            <Field label="Microchip ID" field="microchip_id" formData={formData} update={update} />
            <Field label="No ID Placed" field="has_no_id" type="checkbox" formData={formData} update={update} />
          </Section>

          <Section title="Origin & Lineage">
            <Field label="Origin" field="origin" formData={formData} update={update} />
            <Field label="Origin Location" field="origin_location" formData={formData} update={update} />
            <Field label="Acquisition Date" field="acquisition_date" type="date" formData={formData} update={update} />
            <Field label="Acquisition Type" field="acquisition_type" type="select" options={['BRED', 'PURCHASED', 'DONATED', 'RESCUED']} formData={formData} update={update} />
            <Field label="Lineage Unknown" field="lineage_unknown" type="checkbox" formData={formData} update={update} />
            <Field label="Sire ID" field="sire_id" formData={formData} update={update} />
            <Field label="Dam ID" field="dam_id" formData={formData} update={update} />
          </Section>

          <Section title="Weight Management">
            <Field label="Weight Unit" field="weight_unit" type="select" options={['g', 'kg', 'oz', 'lbs']} formData={formData} update={update} required />
            <Field label="Flying Weight" field="flying_weight_g" type="number" formData={formData} update={update} />
            <Field label="Winter Weight" field="winter_weight_g" type="number" formData={formData} update={update} />
            <Field label="Average Target" field="average_target_weight" type="number" formData={formData} update={update} />
          </Section>

          <Section title="Environment Targets">
            <Field label="Day Temp (°C)" field="target_day_temp_c" type="number" formData={formData} update={update} />
            <Field label="Night Temp (°C)" field="target_night_temp_c" type="number" formData={formData} update={update} />
            <Field label="Ambient Only" field="ambient_temp_only" type="checkbox" formData={formData} update={update} />
            <Field label="Min Humidity (%)" field="target_humidity_min_percent" type="number" formData={formData} update={update} />
            <Field label="Max Humidity (%)" field="target_humidity_max_percent" type="number" formData={formData} update={update} />
            <Field label="Water Tipping Temp (°C)" field="water_tipping_temp" type="number" formData={formData} update={update} />
            <Field label="Misting Frequency" field="misting_frequency" formData={formData} update={update} />
          </Section>

          <Section title="Safety & Archive">
            <Field label="Hazard Rating" field="hazard_rating" type="select" options={['LOW', 'MEDIUM', 'HIGH']} formData={formData} update={update} />
            <Field label="Venomous" field="is_venomous" type="checkbox" formData={formData} update={update} />
            <Field label="Archived" field="archived" type="checkbox" formData={formData} update={update} />
            <Field label="Archive Reason" field="archive_reason" formData={formData} update={update} />
            <Field label="Archive Type" field="archive_type" formData={formData} update={update} />
          </Section>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Critical Husbandry Notes</label>
              <textarea value={formData.critical_husbandry_notes || ''} onChange={e => update('critical_husbandry_notes', e.target.value)} rows={3} className="w-full bg-[#0A0B0E] border border-slate-800/80 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 resize-none shadow-inner" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Special Requirements</label>
              <textarea value={formData.special_requirements || ''} onChange={e => update('special_requirements', e.target.value)} rows={2} className="w-full bg-[#0A0B0E] border border-slate-800/80 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 resize-none shadow-inner" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
              <textarea value={formData.description || ''} onChange={e => update('description', e.target.value)} rows={4} className="w-full bg-[#0A0B0E] border border-slate-800/80 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 resize-none shadow-inner" />
            </div>
          </div>

        </form>
        <div className="p-5 border-t border-slate-800/80 bg-[#0F1117]/90 backdrop-blur shrink-0 flex justify-end z-20">
          <button type="submit" form="animal-form" disabled={isUploading} className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            {isUploading ? 'Syncing...' : (formData.id ? 'Save Changes' : 'Register Animal')}
          </button>
        </div>
      </div>
    </div>
  );
}