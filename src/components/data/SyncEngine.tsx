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

    let isMounted = true;
    let syncInterval: NodeJS.Timeout;

    async function executeSyncCycle(isBoot = false) {
      if (isBoot) setStatus('BOOTING');
      else setStatus('SYNCING');
      
      try {
        if (navigator.onLine) {
          await processOfflineOutboxReplay();
        }
        await syncAll();
        if (isMounted) setStatus('COMPLETE');
      } catch (pipelineError) {
        console.error('[SyncEngine] Critical pipeline error:', pipelineError);
        if (isMounted) setStatus('ERROR');
      }
    }

    // 1. Initial Boot Execution
    executeSyncCycle(true);

    // 2. Continuous 30-second heartbeat to ensure data is always fresh
    syncInterval = setInterval(() => executeSyncCycle(false), 30000);

    // 3. Online/Focus Listeners
    const handleOnlineTransition = () => executeSyncCycle(false);
    window.addEventListener('online', handleOnlineTransition);
    window.addEventListener('focus', handleOnlineTransition);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      window.removeEventListener('online', handleOnlineTransition);
      window.removeEventListener('focus', handleOnlineTransition);
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