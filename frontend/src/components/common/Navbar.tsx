import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { 
  Search, 
  Command, 
  ChevronDown, 
  User, 
  ShieldCheck, 
  Layers, 
  GraduationCap, 
  Sparkles,
  Check
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { activeRole, setActiveRole, student, setActiveView } = useApp();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const roles: { role: UserRole; label: string; icon: React.ReactNode; badge: string }[] = [
    { role: 'STUDENT', label: 'Student Portal', icon: <User className="w-4 h-4" />, badge: student?.name || 'Aravind Kumar' },
    { role: 'FACULTY_MENTOR', label: 'Faculty Mentor', icon: <GraduationCap className="w-4 h-4" />, badge: 'Dr. Ranganathan (25 Mentees)' },
    { role: 'PROGRAM_ADMIN', label: 'Program Admin', icon: <Layers className="w-4 h-4" />, badge: 'HOPE / 21 PEP Domains' },
    { role: 'TRAINER', label: 'Domain Trainer', icon: <Sparkles className="w-4 h-4" />, badge: '10-15 Day Active Tenure' },
    { role: 'PLACEMENT_COORDINATOR', label: 'Placement Coordinator', icon: <ShieldCheck className="w-4 h-4" />, badge: 'Super Admin' },
  ];

  const currentRoleInfo = roles.find(r => r.role === activeRole);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center space-x-6">
            <div 
              onClick={() => setActiveView('DASHBOARD')}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-black transition-colors">
                R
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold tracking-tight text-neutral-900">READINESS</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono">COLLEGE</span>
                </div>
                <span className="text-[11px] text-neutral-500">Placement Communication Suite</span>
              </div>
            </div>

            <div className="hidden md:flex items-center">
              <div className="flex items-center bg-neutral-100/80 hover:bg-neutral-100 border border-neutral-200/80 rounded-lg px-3 py-1.5 w-64 text-neutral-400 cursor-pointer transition-colors group">
                <Search className="w-3.5 h-3.5 mr-2 text-neutral-400 group-hover:text-neutral-600" />
                <span className="text-xs text-neutral-500">Search criteria, rubrics...</span>
                <span className="ml-auto flex items-center text-[10px] font-medium bg-white px-1.5 py-0.5 rounded border border-neutral-200 text-neutral-500 shadow-2xs">
                  <Command className="w-2.5 h-2.5 mr-0.5" /> K
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {activeRole === 'STUDENT' && (
              <div className="hidden sm:flex items-center space-x-2 bg-neutral-50 border border-neutral-200/80 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-medium text-neutral-700">{student?.track || 'HOPE_ELITE'}</span>
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center space-x-2 bg-white hover:bg-neutral-50 border border-neutral-200/90 shadow-2xs hover:border-neutral-300 text-neutral-900 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              >
                <span className="text-neutral-600">{currentRoleInfo?.icon}</span>
                <span className="font-medium text-neutral-800">{currentRoleInfo?.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-1" />
              </button>

              {roleMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRoleMenuOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-72 bg-white border border-neutral-200 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-neutral-100 bg-neutral-50/50">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 font-mono">Switch Role Preview</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Test end-to-end college workflows</p>
                    </div>
                    
                    <div className="p-1">
                      {roles.map((item) => {
                        const isSelected = activeRole === item.role;
                        return (
                          <button
                            key={item.role}
                            onClick={() => {
                              setActiveRole(item.role);
                              setActiveView('DASHBOARD');
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                              isSelected 
                                ? 'bg-neutral-900 text-white font-medium' 
                                : 'text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className={isSelected ? 'text-white' : 'text-neutral-500'}>{item.icon}</span>
                              <div className="truncate">
                                <p className="text-xs font-medium truncate">{item.label}</p>
                                <p className={`text-[10px] truncate ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                                  {item.badge}
                                </p>
                              </div>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center pl-1">
              <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-800">
                {(student?.name || 'Aravind Kumar').split(' ').map((n: string) => n[0]).join('')}
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
