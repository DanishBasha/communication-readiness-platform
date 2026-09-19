import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { 
  GraduationCap, 
  Users, 
  Layers, 
  Mic2, 
  Briefcase, 
  ChevronDown, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { activeRole, setActiveRole, student, setActiveView, interviewState } = useApp();

  const roleLabels: { [key in UserRole]: { label: string; icon: React.ReactNode; badge: string; color: string } } = {
    STUDENT: { label: 'Student Portal', icon: <GraduationCap className="w-4 h-4" />, badge: student.track.replace('_', ' '), color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    FACULTY_MENTOR: { label: 'Faculty Mentor', icon: <Users className="w-4 h-4" />, badge: '25 Mentees', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    PROGRAM_ADMIN: { label: 'Program Admin', icon: <Layers className="w-4 h-4" />, badge: 'HOPE & 21 PEP', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    TRAINER: { label: 'Domain Trainer', icon: <Mic2 className="w-4 h-4" />, badge: 'Cloud & DevOps (Active)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    PLACEMENT_COORDINATOR: { label: 'Placement Coordinator', icon: <Briefcase className="w-4 h-4" />, badge: 'Super Admin', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand / College Title */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveView('DASHBOARD')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base sm:text-lg">CampusReadiness</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">College Ed.</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">AI Communication & Interview Readiness</p>
          </div>
        </div>

        {/* Right: Active Role Switcher Preview Bar */}
        <div className="flex items-center gap-3">
          {interviewState.isActive && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Proctored Session in Progress</span>
            </div>
          )}

          <div className="relative">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
              <span className="text-xs text-slate-400 hidden lg:inline">Simulated Role:</span>
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                {roleLabels[activeRole].icon}
                <span>{roleLabels[activeRole].label}</span>
              </div>
              
              <select
                aria-label="Select active portal role"
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as UserRole)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="STUDENT">Student Portal</option>
                <option value="FACULTY_MENTOR">Faculty Mentor Portal</option>
                <option value="PROGRAM_ADMIN">Program Admin Portal</option>
                <option value="TRAINER">Visiting Trainer Portal</option>
                <option value="PLACEMENT_COORDINATOR">Placement Coordinator Portal</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className={`hidden sm:inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-lg border ${roleLabels[activeRole].color}`}>
            {roleLabels[activeRole].badge}
          </div>
        </div>

      </div>
    </header>
  );
};
