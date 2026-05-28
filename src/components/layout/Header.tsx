// ============================================================================
// File: src/components/layout/Header.tsx
// ============================================================================
import React, { useState, useMemo } from 'react';
import { Play, Square, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { useOutboxStore } from '../../store/outboxStore';
import { baseService } from '../../services/baseService';
import { supabase } from '../../lib/supabase';
import type { Timesheet } from '../../types/schema';

export function Header() {
  const session = useAuthStore((s) => s.session);
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingMutations = useOutboxStore((s) => s.mutations.length);

  // Directly leverage TanStack Query linked to Supabase network with standard cache times
  const { data: allTimesheets = [], isLoading: checkingShift } = useQuery<Timesheet[]>({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const { data, error } = await supabase.from('timesheets').select('*');
      if (error) throw error;
      return data as Timesheet[];
    },
    enabled: !!session?.user?.id,
  });

  const activeShift = useMemo(() => {
    if (!session?.user?.id || !allTimesheets.length) return null;
    return allTimesheets.find(
      (t) => t.user_id === session.user.id && !t.clock_out_time && !t.is_deleted
    ) || null;
  }, [allTimesheets, session?.user?.id]);

  const handleClockAction = async () => {
    if (!session?.user?.id) return;
    setIsProcessing(true);
    
    try {
      if (activeShift) {
        // Safe Update via Outbox Pipeline Boundary
        await baseService.upsert({
          table: 'timesheets',
          queryKey: ['timesheets'],
          payload: {
            ...activeShift,
            clock_out_time: new Date().toISOString(),
            status: 'COMPLETED'
          }
        });
      } else {
        // Safe Insert via Outbox Pipeline Boundary
        await baseService.upsert({
          table: 'timesheets',
          queryKey: ['timesheets'],
          payload: {
            id: crypto.randomUUID(),
            user_id: session.user.id,
            shift_date: new Date().toISOString().split('T')[0],
            clock_in_time: new Date().toISOString(),
            status: 'ACTIVE',
          }
        });
      }
    } catch (error) {
      console.error("[Header] Failed to process timesheet shift operation", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <header className="h-16 bg-[#0F1117] border-b border-slate-800/80 flex items-center justify-between px-6 shrink-0 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        {session?.user?.id && (
          <button 
            onClick={handleClockAction}
            disabled={isProcessing || checkingShift}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeShift ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
            }`}
          >
            {isProcessing ? <Loader2 className="animate-spin" size={14} /> : activeShift ? <Square size={14} /> : <Play size={14} />}
            {activeShift ? 'Clock Out' : 'Clock In'}
          </button>
        )}
      </div>
      
      {/* Fallback space for right-side tools if required later */}
      <div className="flex items-center gap-4">
        {pendingMutations > 0 && (
           <div className="text-[10px] uppercase font-black tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
             Offline Tasks: {pendingMutations}
           </div>
        )}
      </div>
    </header>
  );
}