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
  ShieldAlert
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { activeRole, setActiveRole, student, setActiveView, interviewState } = useApp();

  const roleLabels: { [key in UserRole]: { label: string; icon: React.ReactNode; badge: string; color: string } } = {
    STUDENT: { label: 'Student Portal', icon: <GraduationCap className="w-4 h-4" />, badge: student.track.replace('_', ' '), color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    FACULTY_MENTOR: { label: 'Faculty Mentor', icon: <Users className="w-4 h-4" />, badge: '25 Mentees', color: 'bg-stone-100 text-stone-800 border-stone-300' },
    PROGRAM_ADMIN: { label: 'Program Admin', icon: <Layers className="w-4 h-4" />, badge: 'HOPE & 21 PEP', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    TRAINER: { label: 'Domain Trainer', icon: <Mic2 className="w-4 h-4" />, badge: 'Cloud & DevOps (Active)', color: 'bg-teal-50 text-teal-800 border-teal-200' },
    PLACEMENT_COORDINATOR: { label: 'Placement Coordinator', icon: <Briefcase className="w-4 h-4" />, badge: 'Super Admin', color: 'bg-stone-900 text-white border-stone-800' },
  };

  return (
    <header className="border-b border-stone-200/80 bg-[#FAF8F5]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo with friendly mascot badge */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setActiveView('DASHBOARD')}
        >
          <div className="w-10 h-10 rounded-2xl bg-[#191C1A] flex items-center justify-center text-white shadow-md shadow-stone-900/10 group-hover:scale-105 transition-transform duration-200">
            <span className="text-xl select-none">🐼</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-stone-900 text-base sm:text-lg">CampusReadiness</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                Bamboo Ed.
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">AI Mock Interview & Communication Companion</p>
          </div>
        </div>

        {/* Right Role Switcher */}
        <div className="flex items-center gap-3">
          {interviewState.isActive && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Proctored Session Active</span>
            </div>
          )}

          <div className="relative">
            <div className="flex items-center gap-2 bg-white border border-stone-300/80 rounded-2xl px-3.5 py-1.5 shadow-sm hover:border-stone-400 transition">
              <span className="text-xs text-stone-400 hidden lg:inline">Role:</span>
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
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
              <ChevronDown className="w-4 h-4 text-stone-500 pointer-events-none" />
            </div>
          </div>

          <div className={`hidden sm:inline-flex items-center text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${roleLabels[activeRole].color}`}>
            {roleLabels[activeRole].badge}
          </div>
        </div>

      </div>
    </header>
  );
};
