import React, { useEffect, useState } from 'react';
import { QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useAppStore } from './lib/stateStore';
import { Parameter, ParameterSchema, SyncMessage } from './types';
import { 
  fetchRemoteParameters, 
  mutateRemoteParameter, 
  synchronizeOfflineMutations, 
  getLocalStorageStats,
  STORAGE_KEYS,
  CATEGORY_LABELS
} from './lib/db';
import { DataFlowDiagram } from './components/DataFlowDiagram';
import { ParameterForm } from './components/ParameterForm';
import { 
  Wifi, 
  WifiOff, 
  HardDrive, 
  RefreshCw, 
  BookOpen, 
  Trash2, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';

// Wrap the main rendering with QueryClientProvider
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FailoverControlPortal />
    </QueryClientProvider>
  );
}

function FailoverControlPortal() {
  const queryClientInstance = useQueryClient();
  const { isOnline, toggleOnline, logs, addLog, clearLogs } = useAppStore();
  const [activeNode, setActiveNode] = useState<'supabase' | 'cache' | 'storage' | null>(null);
  const [storageStats, setStorageStats] = useState({ sizeBytes: 0, percentage: 0.8, keysCount: 0 });
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // ZOD LAW & TYPE LAW: Strict schema & types. Constant check.
  const [selectedParamForValidation, setSelectedParamForValidation] = useState<Parameter | null>(null);

  // Hydrate Cache & DB statistics on Mount & update subscriptions
  useEffect(() => {
    // Subscribe to query cache changes to emulate Sync Storage Persister behavior!
    const unsubscribe = queryClientInstance.getQueryCache().subscribe((event) => {
      if (event.type === 'updated') {
        const stats = getLocalStorageStats();
        setStorageStats(stats);
      }
    });

    // Check offline items queue count initially
    const updateStatsAndQueue = () => {
      const stats = getLocalStorageStats();
      setStorageStats(stats);
      
      const queueRaw = localStorage.getItem(STORAGE_KEYS.OFFLINE_PENDING_MUTATIONS);
      const queue = queueRaw ? JSON.parse(queueRaw) as Parameter[] : [];
      setQueueCount(queue.length);
    };

    updateStatsAndQueue();
    // Periodically update statistics
    const interval = setInterval(updateStatsAndQueue, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [queryClientInstance]);

  // DATABASE LAW: All data access via queries. Online-first with fall-through logic.
  const { 
    data: parameters, 
    isLoading, 
    isError, 
    error,
    isStale,
    fetchStatus
  } = useQuery({
    queryKey: ['parameters'],
    queryFn: async () => {
      setActiveNode('supabase');
      addLog('supabase', 'info', `Executing DB read query (Online Status: ${isOnline ? 'ONLINE' : 'OFFLINE'})`);
      try {
        const res = await fetchRemoteParameters(isOnline);
        addLog('supabase', 'success', `DB data queried successfully. Retrieved ${res.length} keys.`);
        setTimeout(() => setActiveNode('cache'), 600);
        return res;
      } catch (err: any) {
        addLog('system', 'warning', `Supabase unreachable: ${err.message}. Initiating TanStack cache fallback.`);
        setTimeout(() => setActiveNode('storage'), 600);
        throw err;
      }
    },
    // Keep data fresh longer, serve local cache if connection drops
    staleTime: 1000 * 60 * 10,
    gcTime: 14 * 24 * 60 * 60 * 1000, // survive 14-day cutoff
    retry: false, // Avoid blocking the UI on failures
  });

  // MUTATION LAW: Create or mutate item
  const addMutation = useMutation({
    mutationFn: async (newData: Omit<Parameter, 'syncStatus' | 'updatedAt'>) => {
      const formattedItem: Parameter = {
        ...newData,
        syncStatus: isOnline ? 'synced' : 'offline_created',
        updatedAt: Date.now()
      };

      setActiveNode(isOnline ? 'supabase' : 'storage');
      
      if (!isOnline) {
        addLog('local_storage', 'warning', `System offline. Intercepting modification for key "${newData.key}". Queueing for 14-day failover.`);
      } else {
        addLog('supabase', 'info', `Sending mutation payload for key "${newData.key}" directly to Supabase...`);
      }

      return await mutateRemoteParameter(formattedItem, isOnline);
    },
    onSuccess: (data) => {
      if (isOnline) {
        addLog('supabase', 'success', `Mutation persistent storage commit complete for "${data.key}".`);
      } else {
        addLog('local_storage', 'success', `Mutation cached locally. Item will synchronize when networks restore.`);
      }
      
      // Update queue count and stats
      const queueRaw = localStorage.getItem(STORAGE_KEYS.OFFLINE_PENDING_MUTATIONS);
      const queue = queueRaw ? JSON.parse(queueRaw) as Parameter[] : [];
      setQueueCount(queue.length);
      setStorageStats(getLocalStorageStats());

      // Invalidate queries to trigger rehydration
      queryClientInstance.invalidateQueries({ queryKey: ['parameters'] });
    },
    onError: (err: any) => {
      addLog('system', 'error', `Mutation blocked! Reason: ${err.message}`);
    }
  });

  // Manual cache clearing/purging (For simulation testing)
  const handlePurgeCache = () => {
    queryClientInstance.clear();
    localStorage.removeItem(STORAGE_KEYS.SUPABASE_SIMULATED_DB);
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_PENDING_MUTATIONS);
    localStorage.removeItem('FAILOVER_OFFLINE_CACHE_V5');

    addLog('system', 'warning', 'Manual override: Local caches and remote simulation purged. Reloading base states.');
    queryClientInstance.invalidateQueries({ queryKey: ['parameters'] });
    
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  // Synchronize offline logs/mutations manual trigger
  const handleSynchronize = async () => {
    if (!isOnline) {
      addLog('system', 'error', 'Synchronization lock: Network is current offline. Cannot sync.');
      return;
    }

    setIsSyncing(true);
    setActiveNode('supabase');
    addLog('system', 'info', `Starting bulk synchronisation for queued offline inputs (${queueCount} items)...`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // aesthetic delay
      const result = await synchronizeOfflineMutations();
      
      setIsSyncing(false);
      setQueueCount(0);
      setStorageStats(getLocalStorageStats());
      
      if (result.errors.length > 0) {
        addLog('system', 'error', `Synchronisation partially completed with ${result.errors.length} schema errors.`);
      } else {
        addLog('supabase', 'success', `Sync finished. Successfully processed ${result.syncedCount} offline cache records.`);
      }

      queryClientInstance.invalidateQueries({ queryKey: ['parameters'] });
    } catch (e: any) {
      setIsSyncing(false);
      addLog('system', 'error', `Synchronisation failed: ${e.message}`);
    }
  };

  // Delete Parameter simulation
  const handleDeleteParameter = async (id: string, key: string) => {
    addLog('system', 'info', `Requesting removal of config identifier: "${key}"`);
    
    // Read current DB and splice
    const rawDb = localStorage.getItem(STORAGE_KEYS.SUPABASE_SIMULATED_DB);
    if (rawDb) {
      const db = JSON.parse(rawDb) as Parameter[];
      const filtered = db.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.SUPABASE_SIMULATED_DB, JSON.stringify(filtered));
    }

    // Also remove from offline queue if any
    const rawQueue = localStorage.getItem(STORAGE_KEYS.OFFLINE_PENDING_MUTATIONS);
    if (rawQueue) {
      const q = JSON.parse(rawQueue) as Parameter[];
      const filteredQ = q.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.OFFLINE_PENDING_MUTATIONS, JSON.stringify(filteredQ));
    }

    addLog('system', 'success', `Identifier "${key}" completely keyspace-depleted.`);
    setStorageStats(getLocalStorageStats());
    
    // Invalidate query
    queryClientInstance.invalidateQueries({ queryKey: ['parameters'] });
  };

  // Validate loaded item manually (ZOD LAW checker)
  const handleValidateSchema = (param: Parameter) => {
    setSelectedParamForValidation(param);
    const result = ParameterSchema.safeParse(param);
    if (result.success) {
      addLog('system', 'success', `Zod constraint test: Key "${param.key}" matches DB contract precisely.`);
    } else {
      addLog('system', 'error', `Zod constraint failure for key "${param.key}". Details: ${JSON.stringify(result.error.issues)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e4e4e7] p-4 lg:p-8 flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-400">
      <div className="max-w-[1240px] w-full mx-auto bg-[#09090b] border border-[#27272a] rounded shadow-2xl flex flex-col overflow-hidden min-h-[820px]">
        
        {/* HEADER */}
        <header className="h-16 border-b border-[#27272a] flex flex-wrap items-center justify-between px-6 lg:px-8 bg-[#0c0c0e] gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              isOnline 
                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' 
                : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
            }`}></div>
            <div className="flex flex-col">
              <h1 className="text-xs lg:text-sm font-mono tracking-widest uppercase font-semibold text-emerald-500">
                Phase 01 // Architecture Sync
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono tracking-tighter">
                ACTIVE EXPERIMENTATION COMPASS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-mono text-zinc-500 uppercase tracking-tighter">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-zinc-500 text-[10px]">Node Environment</span>
              <span className="text-emerald-500">v20.10.0 // Production</span>
            </div>
            
            <div className="w-[1px] h-8 bg-[#27272a] hidden sm:block"></div>
            
            <div className="flex flex-col items-end">
              <span className="text-zinc-500 text-[10px]">Persistence Layer</span>
              <span className="text-blue-400">14-Day Offline Failover</span>
            </div>

            <div className="w-[1px] h-8 bg-[#27272a]"></div>

            {/* Network simulation toggler */}
            <button 
              onClick={toggleOnline}
              className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wider flex items-center gap-2 border transition-colors ${
                isOnline 
                  ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/40' 
                  : 'bg-amber-950/30 text-amber-400 border-amber-500/30 hover:bg-amber-900/40 animate-pulse'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>NETWORK: ONLINE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>NETWORK: OFFLINE</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* CONTAINER WORKSPACE */}
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-px bg-[#27272a]">
          
          {/* LEFT SECTION: CONTROLS & COMPLIANCE REGISTRY (4 cols) */}
          <section className="lg:col-span-4 bg-[#09090b] p-6 flex flex-col gap-6">
            
            {/* Simulation Deck */}
            <div>
              <h2 className="text-xs font-bold text-zinc-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                <span className="w-1 h-3.5 bg-rose-500"></span>
                FAILOVER SIMULATION DECK
              </h2>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <button
                  onClick={toggleOnline}
                  className={`p-2.5 rounded border text-left transition-all ${
                    !isOnline 
                      ? 'bg-amber-950/10 border-amber-500/50 text-amber-400 font-bold' 
                      : 'bg-[#0c0c0e] border-[#27272a] text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-[8px] text-zinc-650 uppercase">Network Cut</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {!isOnline ? <WifiOff className="w-3.5 h-3.5 text-amber-500" /> : <Wifi className="w-3.5 h-3.5 text-zinc-500" />}
                    <span>{isOnline ? 'Force Outage' : 'System Outage'}</span>
                  </div>
                </button>

                <button
                  onClick={handleSynchronize}
                  disabled={!isOnline || queueCount === 0 || isSyncing}
                  className={`p-2.5 rounded border text-left transition-all ${
                    isSyncing
                      ? 'bg-blue-950/20 border-blue-500/40 text-blue-400'
                      : isOnline && queueCount > 0
                        ? 'bg-emerald-950/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/20 font-semibold'
                        : 'bg-[#0c0c0e] border-[#27272a] text-zinc-600 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="text-[8px] text-zinc-600 uppercase">Remote Sync</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
                    <span>Sync Queue ({queueCount})</span>
                  </div>
                </button>
              </div>

              {/* Force clean button */}
              <button
                onClick={handlePurgeCache}
                className="w-full mt-2 p-2 bg-zinc-950 hover:bg-zinc-900 border border-[#27272a]/70 hover:border-zinc-700 text-[10px] font-mono text-zinc-500 uppercase rounded text-center block transition-all transition-colors"
                title="Clears all local cached values to restart sync lifecycle"
              >
                Clear All Caches & Database Seeding
              </button>
            </div>

            {/* Schema input form */}
            <ParameterForm onSubmit={(val) => addMutation.mutate(val)} isOnline={isOnline} />

            {/* Dependency Registry list */}
            <div>
              <h2 className="text-xs font-bold text-zinc-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                <span className="w-1 h-3.5 bg-blue-500"></span>
                DEP REGISTRY ARCHITECTURE
              </h2>
              <div className="space-y-1 font-mono text-[11px] max-h-[170px] overflow-y-auto pr-1">
                <div className="flex justify-between items-center p-2 bg-[#121214] border-l-2 border-emerald-500 rounded-r">
                  <span className="text-zinc-350">react@19.0.0</span>
                  <span className="text-emerald-500 text-[9px] bg-emerald-950/30 px-1 border border-emerald-500/20 uppercase font-semibold">STABLE</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#0c0c0e] border-l-2 border-zinc-700/60 hover:bg-[#121214] rounded-r transition-colors">
                  <span className="text-zinc-400">@tanstack/react-query</span>
                  <span className="text-blue-400 text-[9px]">v5 (Active)</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#0c0c0e] border-l-2 border-zinc-700/60 hover:bg-[#121214] rounded-r transition-colors">
                  <span className="text-zinc-400">@tanstack/query-sync...</span>
                  <span className="text-blue-400 text-[9px]">v5 (Active)</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#0c0c0e] border-l-2 border-zinc-700/60 hover:bg-[#121214] rounded-r transition-colors">
                  <span className="text-zinc-500">zod</span>
                  <span className="text-zinc-600 text-[9px]">v4 (Native)</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#0c0c0e] border-l-2 border-zinc-700/60 hover:bg-[#121214] rounded-r transition-colors">
                  <span className="text-zinc-500">zustand</span>
                  <span className="text-zinc-600 text-[9px]">v5 (Shared)</span>
                </div>
              </div>
            </div>

            {/* Cache Capacity Bar Indicator */}
            <div className="mt-auto p-4 border border-[#27272a] rounded bg-[#0c0c0e]">
              <div className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 mb-2">
                Encryption Storage Size
              </div>
              <div className="h-2 w-full bg-[#18181b] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] transition-all duration-500"
                  style={{ width: `${storageStats.percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2.5 text-[9px] font-mono">
                <span className="text-blue-400 font-semibold uppercase tracking-tight">Offline Persistence Engine</span>
                <span className="text-zinc-500">
                  {storageStats.percentage}% Capacity ({storageStats.keysCount} keys)
                </span>
              </div>
            </div>
          </section>

          {/* RIGHT SECTION: ARCHITECTURE VISUALIZATION & DATA LOGS (8 cols) */}
          <section className="lg:col-span-8 bg-[#0c0c0e] p-6 lg:p-8 flex flex-col gap-6">
            
            {/* Top row: 3 Architectural Laws details & Visual Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              
              {/* Core protocol rules ledger (7 cols) */}
              <div className="md:col-span-7 flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-[#27272a]/60 pb-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                    System Protocol Directives
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* LAW 1 */}
                  <div className="flex items-start gap-3">
                    <div className="text-zinc-800 font-mono text-xl font-bold border border-zinc-900 px-1.5 py-0.5 rounded leading-none">01</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200 font-bold uppercase tracking-tight text-xs">Database Law</span>
                        <span className="text-[8px] bg-emerald-950/50 text-emerald-400 px-1 rounded font-mono border border-emerald-500/20 uppercase">STRICT</span>
                      </div>
                      <p className="text-zinc-500 text-[11px] leading-relaxed mt-1">
                        All client interactions must invoke query hooks. Remote commits prioritize online Supabase database write operations; cached local storage triggers automated 14-day persistent fallback on network drops.
                      </p>
                    </div>
                  </div>

                  {/* LAW 2 */}
                  <div className="flex items-start gap-3">
                    <div className="text-zinc-800 font-mono text-xl font-bold border border-zinc-900 px-1.5 py-0.5 rounded leading-none">02</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200 font-bold uppercase tracking-tight text-xs">Zod Law</span>
                        <span className="text-[8px] bg-amber-950/25 text-amber-500 px-1 rounded font-mono border border-amber-500/20 uppercase">STRICT</span>
                      </div>
                      <p className="text-zinc-500 text-[11px] leading-relaxed mt-1 font-sans">
                        Properties must align completely with remote databases. Optional key value arrays must leverage <code className="text-yellow-400 font-mono">.nullable().optional()</code>. Magic placeholders or unvalidated values are system blocked.
                      </p>
                    </div>
                  </div>

                  {/* LAW 3 */}
                  <div className="flex items-start gap-3">
                    <div className="text-zinc-800 font-mono text-xl font-bold border border-zinc-900 px-1.5 py-0.5 rounded leading-none">03</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200 font-bold uppercase tracking-tight text-xs">Type Law</span>
                        <span className="text-[8px] bg-blue-950/40 text-blue-400 px-1 rounded font-mono border border-blue-500/20 uppercase">STRICT</span>
                      </div>
                      <p className="text-zinc-500 text-[11px] leading-relaxed mt-1">
                        Strict typings using TypeScript contracts. Using <code className="text-rose-400 font-mono">as any</code> is strictly banned. System build compiles safely under explicit interfaces.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Local Sync Status Meter */}
                <div className="mt-auto border-t border-[#27272a]/60 pt-4">
                  <div className="text-[10px] uppercase text-zinc-500 tracking-widest font-mono mb-2">
                    Outage Resilience Threshold
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <div className="h-10 flex-1 bg-[#121214] border border-[#27272a] rounded flex flex-col items-center justify-center p-1">
                      <span className="text-[8px] text-zinc-600 block">MAX OUTAGE CAPACITY</span>
                      <span className="text-blue-500 text-xs font-bold leading-none">14 DAYS</span>
                    </div>
                    <div className="text-zinc-700 font-bold px-1 text-center">→</div>
                    <div className={`h-10 flex-1 border rounded flex flex-col items-center justify-center p-1 transition-all ${
                      queueCount > 0 
                        ? 'bg-amber-950/20 border-amber-500/40 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                        : 'bg-[#121214] border-[#27272a]/60 text-zinc-650 opacity-40'
                    }`}>
                      <span className="text-[8px] text-zinc-650 block">SIM SYNC LOGS</span>
                      <span className="text-xs font-bold leading-none uppercase">
                        {queueCount > 0 ? `${queueCount} SECURED` : 'IDLE / NOMINAL'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Flow Diagram visualization (5 cols) */}
              <div className="md:col-span-5 flex flex-col border-l border-[#27272a] pl-0 md:pl-6 pt-4 md:pt-0">
                <div className="text-xs font-bold text-zinc-405 uppercase mb-3 tracking-widest font-mono flex items-center justify-between">
                  <span>Data Flow Diagram</span>
                  <span className={`${isOnline ? 'text-emerald-500' : 'text-amber-500'} text-[9px] animate-pulse`}>
                    {isOnline ? 'Online DB Sync' : 'Failover Backup'}
                  </span>
                </div>
                <div className="flex-1">
                  <DataFlowDiagram isOnline={isOnline} isSyncing={isSyncing} activeNode={activeNode} />
                </div>
              </div>
            </div>

            {/* Middle part: Parameters Database Display List */}
            <div className="flex-1 border-t border-[#27272a] pt-5 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-xs font-mono font-bold text-zinc-350 uppercase tracking-widest">
                    Registry Key Ledger
                  </h2>
                  <span className="text-[9px] font-mono text-zinc-600 uppercase border border-zinc-800 px-1 text-zinc-550">
                    Online-First Active Queries
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[9px] font-mono">
                  <span className="text-zinc-600">QUERY STATE:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                    fetchStatus === 'fetching' 
                      ? 'bg-blue-950/40 text-blue-400 border border-blue-500/30 animate-pulse'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                  }`}>
                    {fetchStatus.toUpperCase()}
                  </span>
                  
                  {isStale && (
                    <span className="bg-zinc-950 font-bold text-zinc-500 px-1.5 py-0.5 border border-zinc-800 rounded">
                      STALE
                    </span>
                  )}
                  {isError && (
                    <span className="bg-rose-950 text-rose-400 font-bold px-1.5 py-0.5 border border-rose-500/20 rounded">
                      FALLBACK ACTIVE
                    </span>
                  )}
                </div>
              </div>

              {/* MAIN DATABASE RENDERING OVERLAYS */}
              <div className="bg-[#09090b] border border-[#27272a] rounded overflow-hidden flex-1 flex flex-col min-h-[160px]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                    <thead>
                      <tr className="border-b border-[#27272a] bg-[#0c0c0e] font-mono text-zinc-500 text-[10px] uppercase">
                        <th className="p-3">KEY CONFIG / CAT</th>
                        <th className="p-3">PARSED CONFIG VALUE</th>
                        <th className="p-3">HEALTH STATE</th>
                        <th className="p-3 text-right">OPERATIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272a]/40 font-mono">
                      {isLoading ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-zinc-500">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                            <span>Locating registers and validating caches...</span>
                          </td>
                        </tr>
                      ) : !parameters || parameters.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-zinc-600">
                            No active sync keys found. Create simulation items above.
                          </td>
                        </tr>
                      ) : (
                        parameters.map((item) => (
                          <tr key={item.id} className="hover:bg-[#0c0c0e]/50 transition-colors">
                            <td className="p-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-zinc-100 tracking-wide text-[11px] sm:text-xs">
                                  {item.key}
                                </span>
                                <span className="text-[9px] text-[#3b82f6] uppercase tracking-[0.05em]">
                                  // {CATEGORY_LABELS[item.category] || 'GENERIC'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-1 rounded bg-[#121214] border border-[#27272a]/60 text-emerald-400 font-mono text-[10px] Break-all">
                                {item.value === null ? (
                                  <span className="text-rose-500 italic">null (defined constraint)</span>
                                ) : (
                                  item.value
                                )}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                {item.syncStatus === 'synced' ? (
                                  <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-emerald-500 text-[10px]">SYNCED TO SUPABASE</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                    <span className="text-amber-400 text-[10px] font-bold">14D CACHE FALLBACK</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleValidateSchema(item)}
                                  className={`px-2 py-1 bg-zinc-900 border border-zinc-800 text-[9px] uppercase tracking-wide rounded hover:bg-zinc-850 hover:text-zinc-300 transition-colors ${
                                    selectedParamForValidation?.id === item.id 
                                      ? 'bg-blue-950/20 border-blue-500/40 text-blue-400' 
                                      : 'text-zinc-500'
                                  }`}
                                  title="Test payload schema compliance using Zod validator directly"
                                >
                                  Zod Proof
                                </button>
                                <button
                                  onClick={() => handleDeleteParameter(item.id, item.key)}
                                  className="p-1.5 text-zinc-650 hover:text-rose-500 border border-transparent hover:border-rose-950 rounded hover:bg-rose-950/10 transition-colors"
                                  title="Deplete registry slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* FOOTER TERMINAL ENGINE (Displays chronological events and debug logs of client operations) */}
            <div className="border-t border-[#27272a] pt-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span className="text-zinc-400 font-bold uppercase tracking-widest">Failover Terminal Monitor</span>
                </div>
                <button 
                  onClick={clearLogs}
                  className="text-zinc-500 hover:text-zinc-300 transition-all text-[10px] uppercase hover:underline"
                >
                  Clear Session Consoles
                </button>
              </div>

              <div className="bg-[#09090b] border border-[#27272a] rounded p-3 h-[130px] overflow-y-auto font-mono text-[10px] text-zinc-450 space-y-1.5 select-text leading-relaxed">
                {logs.length === 0 ? (
                  <div className="text-zinc-650 italic text-center py-4">
                    Terminal registers empty. Trigger outage toggles or parameters changes.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-2.5 items-start">
                      <span className="text-zinc-650 shrink-0 text-[9px] select-none">
                        [{log.timestamp}]
                      </span>
                      <span className={`px-1 rounded-[2px] text-[8px] font-semibold tracking-tighter uppercase shrink-0 select-none border ${
                        log.source === 'supabase' 
                          ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/20' 
                          : log.source === 'local_storage' 
                            ? 'bg-amber-950/20 text-amber-500 border-amber-500/20' 
                            : log.source === 'tanstack_cache'
                              ? 'bg-blue-950/30 text-blue-400 border-blue-500/20'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-805'
                      }`}>
                        {log.source.replace('_', ' ')}
                      </span>
                      <span className={`flex-1 tracking-tight ${
                        log.type === 'error' 
                          ? 'text-rose-500 font-semibold' 
                          : log.type === 'warning' 
                            ? 'text-amber-500' 
                            : log.type === 'success' 
                              ? 'text-emerald-400' 
                              : 'text-zinc-350'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </section>
        </main>

        {/* METRIC FOOTER BAR */}
        <footer className="h-10 bg-[#09090b] border-t border-[#27272a] px-6 lg:px-8 flex items-center justify-between text-[10px] font-mono text-zinc-650">
          <div>ARC_VERSION: 1.0.4-STABLE</div>
          <div className="flex gap-4 sm:gap-6 uppercase">
            <span>Client State: Active</span>
            <span className="hidden sm:inline">Buffer Target: 2.2ms</span>
            <span className="text-emerald-500 font-semibold">Health Check: Nominal</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
