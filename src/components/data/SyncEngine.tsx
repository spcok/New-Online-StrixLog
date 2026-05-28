// ============================================================================
// File: src/components/data/SyncEngine.tsx
// ============================================================================
import { useEffect, useState } from 'react';
import { syncAll, queryClient } from '../../lib/db';
import { useAuthStore } from '../../store/authStore';
import { useOutboxStore } from '../../store/outboxStore';
import { supabase } from '../../lib/supabase';

export function SyncEngine() {
  const [status, setStatus] = useState<'IDLE' | 'BOOTING' | 'SYNCING' | 'COMPLETE' | 'ERROR'>('IDLE');
  const session = useAuthStore((s) => s.session);

  async function processOfflineOutboxReplay() {
    const store = useOutboxStore.getState();
    const mutations = [...store.mutations];

    if (mutations.length === 0) return;

    setStatus('SYNCING');

    for (const mutation of mutations) {
      try {
        if (mutation.action === 'upsert') {
          const { error } = await supabase
            .from(mutation.table)
            .upsert(mutation.payload);

          if (error) throw error;
        }
        store.removeMutation(mutation.id);
      } catch (err) {
        console.error(`[SyncEngine] Replay failed for task [${mutation.id}]. Halting queue to preserve chronological order.`, err);
        setStatus('ERROR');
        return; 
      }
    }
    
    await queryClient.invalidateQueries();
    setStatus('COMPLETE');
  }

  useEffect(() => {
    if (!session) return;

    async function executeCleanRoomBoot() {
      setStatus('BOOTING');
      try {
        setStatus('SYNCING');
        
        if (navigator.onLine) {
          await processOfflineOutboxReplay();
        }

        await syncAll();
        setStatus('COMPLETE');
      } catch (pipelineError) {
        console.error('[SyncEngine] Critical initialization error:', pipelineError);
        setStatus('ERROR');
      }
    }

    executeCleanRoomBoot();

    const handleOnlineTransition = () => {
      processOfflineOutboxReplay().then(() => syncAll());
    };

    window.addEventListener('online', handleOnlineTransition);
    return () => {
      window.removeEventListener('online', handleOnlineTransition);
    };
  }, [session]);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <div className={`px-4 py-2 rounded-xl border font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-3 bg-[#0F1117] ${
        status === 'COMPLETE' ? 'border-emerald-500/20 text-emerald-500' : 
        status === 'SYNCING' || status === 'BOOTING' ? 'border-amber-500/20 text-amber-500' : 
        'border-rose-500/20 text-rose-500'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          status === 'SYNCING' || status === 'BOOTING' ? 'animate-ping bg-amber-500' : 
          status === 'COMPLETE' ? 'bg-emerald-500' : 'bg-rose-500'
        }`} />
        PIPELINE: {status}
      </div>
    </div>
  );
}