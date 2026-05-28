// ============================================================================
// File: src/routes/index.tsx
// ============================================================================
import { createFileRoute } from '@tanstack/react-router';
import { LayoutDashboard } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: DashboardOverview,
});

function DashboardOverview() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <LayoutDashboard className="text-emerald-500" size={24} />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Dashboard</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#0F1117] border border-slate-800/80 rounded-2xl p-6">
          <h2 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">System Status</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white font-medium text-sm">Online & Synchronized</span>
          </div>
        </div>
      </div>
    </div>
  );
}