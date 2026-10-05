import React, { useState } from 'react';
import { 
  User, 
  Search, 
  Mic, 
  Eye, 
  Building2, 
  GraduationCap,
  ArrowUpDown,
  LayoutDashboard
} from 'lucide-react';
import { StudentProfile } from '../../types';
import { useApp } from '../../context/AppContext';

export interface StudentDirectoryTableProps {
  students: StudentProfile[];
  onSelectStudent?: (student: StudentProfile) => void;
  onAssignStudent?: (student: StudentProfile) => void;
  title?: string;
  subtitle?: string;
  filterDepartment?: string;
  filterProgram?: string;
  showAssignAction?: boolean;
}

export const StudentDirectoryTable: React.FC<StudentDirectoryTableProps> = ({
  students,
  onSelectStudent,
  onAssignStudent,
  title = 'Enrolled Students',
  subtitle = '',
  filterDepartment,
  filterProgram,
  showAssignAction = true
}) => {
  const { activeRole, restoreStudentCoinsToFive } = useApp();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'IN_PROGRESS' | 'NEEDS_ATTENTION'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME' | 'SCORE' | 'ROLL'>('SCORE');

  // Filter students
  const filtered = students.filter(s => {
    if (filterDepartment && s.department && s.department !== filterDepartment) return false;
    if (filterProgram && s.programName && s.programName !== filterProgram) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchRoll = (s.rollNumber || '').toLowerCase().includes(q);
      const matchEmail = (s.email || '').toLowerCase().includes(q);
      const matchDept = (s.department || '').toLowerCase().includes(q);
      const matchBatch = (s.batchYear ? String(s.batchYear) : '').includes(q);
      if (!matchName && !matchRoll && !matchEmail && !matchDept && !matchBatch) return false;
    }

    const readiness = s.overallReadiness ?? (s.recentReports?.[0]?.overallScore || 75);
    if (statusFilter === 'READY' && readiness < 80) return false;
    if (statusFilter === 'IN_PROGRESS' && (readiness < 60 || readiness >= 80)) return false;
    if (statusFilter === 'NEEDS_ATTENTION' && readiness >= 60) return false;

    return true;
  });

  // Sort students
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'NAME') return a.name.localeCompare(b.name);
    if (sortBy === 'ROLL') return (a.rollNumber || '').localeCompare(b.rollNumber || '');
    const scoreA = a.overallReadiness ?? (a.recentReports?.[0]?.overallScore || 0);
    const scoreB = b.overallReadiness ?? (b.recentReports?.[0]?.overallScore || 0);
    return scoreB - scoreA;
  });

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Table Header / Toolbar */}
      <div className="p-4 sm:p-5 border-b border-neutral-200/80 bg-neutral-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-neutral-900" />
            <h3 className="text-sm font-bold text-neutral-900">{title} ({sorted.length})</h3>
          </div>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate, roll, batch (e.g. 2028)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-white border border-neutral-200 rounded-xl p-0.5 text-[11px] font-medium text-neutral-600">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-neutral-900 text-white font-semibold' : 'hover:text-neutral-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('READY')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'READY' ? 'bg-emerald-600 text-white font-semibold' : 'hover:text-neutral-900'
              }`}
            >
              80%+ Ready
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'IN_PROGRESS' ? 'bg-blue-600 text-white font-semibold' : 'hover:text-neutral-900'
              }`}
            >
              60-80%
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('NEEDS_ATTENTION')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'NEEDS_ATTENTION' ? 'bg-rose-600 text-white font-semibold' : 'hover:text-neutral-900'
              }`}
            >
              &lt;60%
            </button>
          </div>

          {/* Sort By Toggle */}
          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'SCORE' ? 'NAME' : sortBy === 'NAME' ? 'ROLL' : 'SCORE')}
            className="px-2.5 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-medium flex items-center space-x-1 cursor-pointer shadow-2xs"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3 h-3 text-neutral-400" />
            <span className="text-[11px]">Sort: {sortBy}</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      {sorted.length === 0 ? (
        <div className="p-10 text-center text-neutral-400">
          <User className="w-8 h-8 mx-auto mb-2 text-neutral-300 stroke-[1.5]" />
          <p className="text-xs font-semibold text-neutral-600">No matching students found</p>
          <p className="text-[11px] text-neutral-400 mt-0.5">Try clearing filters or adjusting your search term.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200/80 bg-neutral-50/50 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-5">Candidate</th>
                <th className="py-3 px-4">Program / Track</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Readiness Metric</th>
                <th className="py-3 px-4">Completed Drills</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sorted.map((student) => {
                const readiness = student.overallReadiness ?? (student.recentReports?.[0]?.overallScore || 75);
                const drillsCount = (student.recentReports?.length || 0);

                return (
                  <tr 
                    key={student.id}
                    onClick={() => onSelectStudent && onSelectStudent(student)}
                    className="hover:bg-neutral-50/80 transition-colors group cursor-pointer"
                  >
                    {/* Candidate Identity */}
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:ring-2 group-hover:ring-neutral-900/20 transition-all">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors flex items-center space-x-1.5">
                            <span>{student.name}</span>
                            <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono border ${
                              (student.coins ?? 5) === 0 
                                ? 'bg-rose-50 text-rose-800 border-rose-300' 
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}>
                              <span>🪙</span>
                              <span>{student.coins ?? 5} Coins {(student.coins ?? 5) === 0 ? '(0 Left)' : ''}</span>
                            </span>
                            <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" />
                          </div>
                          <div className="text-[11px] font-mono text-neutral-500 flex items-center space-x-1.5 mt-0.5">
                            <span>{student.rollNumber || 'Direct Candidate'}</span>
                            <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[10px] font-semibold border border-neutral-200">
                              Batch {student.batchYear || 2026}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[140px] text-neutral-400">{student.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Program */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-800 text-[11px] font-medium border border-neutral-200">
                        {student.programName || student.track || 'General Readiness'}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-neutral-600 text-xs">
                      <div className="flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-[180px]">{student.department || 'Computer Science & Engineering'}</span>
                      </div>
                    </td>

                    {/* Readiness Bar & Metric */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold font-mono ${
                            readiness >= 80 ? 'text-emerald-700' : readiness >= 60 ? 'text-blue-700' : 'text-amber-700'
                          }`}>
                            {readiness}%
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                            readiness >= 80 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : readiness >= 60
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {readiness >= 80 ? 'Placement Ready' : readiness >= 60 ? 'Developing' : 'Action Required'}
                          </span>
                        </div>
                        <div className="w-28 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              readiness >= 80 ? 'bg-emerald-500' : readiness >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, readiness))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Completed Drills */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 text-neutral-700">
                        <Mic className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="font-semibold font-mono text-xs">{drillsCount}</span>
                        <span className="text-[11px] text-neutral-400">drills</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        {activeRole === 'SUPER_ADMIN' && (student.coins ?? 5) < 5 && (
                          <button
                            type="button"
                            disabled={restoringId === student.id}
                            onClick={async () => {
                              setRestoringId(student.id);
                              try {
                                await restoreStudentCoinsToFive(student.id || student.rollNumber);
                              } finally {
                                setRestoringId(null);
                              }
                            }}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1 ${
                              (student.coins ?? 5) === 0
                                ? 'bg-amber-400 hover:bg-amber-500 text-neutral-950 font-extrabold ring-1 ring-amber-400'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                            }`}
                            title="Super Admin: Restore 5 Credits for this candidate"
                          >
                            <span>🪙</span>
                            <span>{restoringId === student.id ? 'Restoring...' : 'Restore 5'}</span>
                          </button>
                        )}
                        {showAssignAction && onAssignStudent && (
                          <button
                            type="button"
                            onClick={() => onAssignStudent(student)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1"
                            title={`Assign targeted assessment to ${student.name}`}
                          >
                            <Mic className="w-3 h-3 text-emerald-600" />
                            <span>Assign</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectStudent && onSelectStudent(student)}
                          className="px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:text-black bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1"
                          title={`Open ${student.name}'s Student Dashboard`}
                        >
                          <LayoutDashboard className="w-3 h-3 text-neutral-600" />
                          <span>Dashboard</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
