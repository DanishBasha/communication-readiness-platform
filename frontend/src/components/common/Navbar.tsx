import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  Command, 
  LogOut,
  Plus,
  Mic
} from 'lucide-react';
import { AssignSessionModal } from './AssignSessionModal';

export const Navbar: React.FC = () => {
  const { activeRole, student, setActiveView, currentUser, logout } = useApp();
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const roleBadgeMap: Record<string, string> = {
    'PLATFORM_OWNER': '🌐 Platform Owner',
    'SUPER_ADMIN': '👑 Super Administrator',
    'PROGRAM_ADMIN': '🏢 Program Administrator',
    'FACULTY_MENTOR': '👨‍🏫 Faculty Mentor',
    'TRAINER': '💼 Domain Trainer',
    'PLACEMENT_COORDINATOR': '📊 Placement Coordinator',
    'STUDENT': '🎓 Student'
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          <div className="flex items-center space-x-6">
            <div 
              onClick={() => setActiveView('DASHBOARD')}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 flex items-center justify-center">
                <img src="/logo.png" alt="PC Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold tracking-tight text-neutral-900">READINESS</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono">
                    {currentUser?.collegeName ? currentUser.collegeName.split(' ')[0] : 'COLLEGE'}
                  </span>
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
                <span className="text-xs font-medium text-neutral-700">
                  {(currentUser?.isIndependent || student?.isIndependent) ? '🎯 Independent Candidate' : (student?.track || 'General Track')}
                </span>
              </div>
            )}

            {activeRole !== 'STUDENT' && (
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
                title="Assign mock interview or listening test to program students or department"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Assign Assessment</span>
              </button>
            )}

            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center space-x-1.5 ${
                activeRole === 'PLATFORM_OWNER'
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                  : activeRole === 'SUPER_ADMIN'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : activeRole === 'PROGRAM_ADMIN'
                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                  : activeRole === 'FACULTY_MENTOR'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : activeRole === 'TRAINER'
                  ? 'bg-purple-50 text-purple-900 border-purple-200'
                  : 'bg-neutral-100 text-neutral-800 border-neutral-200'
              }`}>
                <span>{roleBadgeMap[activeRole] || activeRole}</span>
              </span>
            </div>

            <div className="flex items-center space-x-2 pl-2 border-l border-neutral-200 ml-1">
              <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold shadow-xs">
                {(currentUser?.name || student?.name || 'Aravind Kumar').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="hidden lg:block text-left text-xs leading-tight">
                <p className="font-semibold text-neutral-900 truncate max-w-[140px]">
                  {currentUser?.name || student?.name || 'Aravind Kumar'}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[140px]">
                  {currentUser?.email || activeRole}
                </p>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors ml-1 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {assignModalOpen && (
        <AssignSessionModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          defaultRole={activeRole as any}
        />
      )}
    </header>
  );
};
