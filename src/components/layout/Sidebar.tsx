// ============================================================================
// File: src/components/layout/Sidebar.tsx
// ============================================================================
import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutDashboard, PawPrint, Stethoscope, ClipboardList, ShieldAlert,
  CalendarDays, Apple, Syringe, Activity, BriefcaseMedical, AlertTriangle, 
  Wrench, Users, Clock, CalendarHeart, FileBadge, FileWarning, 
  BarChart3, Settings, HelpCircle, ChevronDown, ChevronRight, HeartPulse,
  Utensils, LogOut, MapPin, ArrowRightLeft
} from 'lucide-react';

const navGroups = [
  {
    title: 'Husbandry',
    icon: PawPrint,
    items: [
      { name: 'Daily Logs', to: '/husbandry/daily-logs', icon: ClipboardList },
      { name: 'Daily Rounds', to: '/husbandry/daily-rounds', icon: CalendarDays },
      { name: 'Feeding Schedule', to: '/husbandry/feeding-schedule', icon: Utensils },
    ]
  },
  {
    title: 'Logistics',
    icon: MapPin,
    items: [
      { name: 'Internal Moves', to: '/logistics/internal-movements', icon: ArrowRightLeft },
      { name: 'Ext. Transfers', to: '/logistics/external-transfers', icon: ArrowRightLeft },
    ]
  },
  {
    title: 'Clinical and Medical',
    icon: Stethoscope,
    items: [
      { name: 'Clinical Records', to: '/clinical/records', icon: HeartPulse },
      { name: 'Medication', to: '/clinical/medication', icon: Syringe },
      { name: 'Isolation', to: '/clinical/isolation', icon: Activity },
    ]
  },
  {
    title: 'Safety and Maintenance',
    icon: ShieldAlert,
    items: [
      { name: 'Incidents', to: '/safety/incidents', icon: AlertTriangle },
      { name: 'First Aid', to: '/safety/first-aid', icon: BriefcaseMedical },
      { name: 'Maintenance', to: '/safety/maintenance', icon: Wrench },
      { name: 'Safety Drills', to: '/safety/drills', icon: FileWarning },
    ]
  },
  {
    title: 'Staff Management',
    icon: Users,
    items: [
      { name: 'Rota', to: '/staff/rota', icon: CalendarHeart },
      { name: 'Timesheets', to: '/staff/timesheets', icon: Clock },
      { name: 'Holidays', to: '/staff/holidays', icon: CalendarDays },
      { name: 'Reports', to: '/staff/reports', icon: BarChart3 },
      { name: 'Missing Records', to: '/staff/missing', icon: FileWarning },
      { name: 'ZLA Compliance', to: '/staff/zla', icon: FileBadge },
    ]
  },
  {
    title: 'System Config',
    icon: Settings,
    items: [
      { name: 'Organisation', to: '/admin/settings/organization', icon: Settings },
      { name: 'Operational Lists', to: '/admin/settings/lists', icon: ClipboardList },
      { name: 'ZLA Settings', to: '/admin/settings/zla', icon: FileBadge },
      { name: 'System Health', to: '/admin/settings/health', icon: Activity },
    ]
  }
];

function NavGroup({ group }: { group: typeof navGroups[0] }) {
  const [isOpen, setIsOpen] = useState(true);
  const Icon = group.icon;

  return (
    <div className="mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-white group transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className="group-hover:text-emerald-400 transition-colors" />
          <span className="text-xs font-black uppercase tracking-widest">{group.title}</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      
      {isOpen && (
        <div className="mt-2 space-y-1 pl-4">
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.to}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all [&.active]:bg-emerald-500/10 [&.active]:text-emerald-400 [&.active]:font-bold border border-transparent [&.active]:border-emerald-500/20"
              >
                <ItemIcon size={16} />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const signOut = useAuthStore((s) => s.signOut);
  const session = useAuthStore((s) => s.session);

  const handleSignOut = async () => {
    try {
      await signOut();
      // TanStack router __root.tsx boundary will catch the null session and automatically redirect to /login
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <aside className="w-72 bg-[#0F1117] border-r border-slate-800/80 flex flex-col shrink-0 z-20">
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0A0B0E] border border-slate-800/80 flex items-center justify-center shadow-inner">
            <PawPrint size={16} className="text-emerald-500" />
          </div>
          <span className="font-black text-white tracking-tight uppercase">KOA<span className="text-emerald-500">Sys</span></span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 mb-6 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors group [&.active]:bg-emerald-500/10 [&.active]:text-emerald-400"
        >
          <LayoutDashboard size={18} className="shrink-0 transition-colors group-[&.active]:text-emerald-400" />
          Dashboard
        </Link>
        
        {navGroups.map((group) => (
          <NavGroup key={group.title} group={group} />
        ))}
      </nav>

      {session && (
        <div className="p-4 border-t border-slate-800/80 shrink-0">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}