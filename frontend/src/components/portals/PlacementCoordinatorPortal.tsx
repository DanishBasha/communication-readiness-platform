import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { MOCK_MENTEES_LIST } from '../../data/mockData';
import { AssignSessionModal } from '../common/AssignSessionModal';
import type { DynamicProgram, InterviewAssignment } from '../../types';
import { 
  Users, 
  TrendingUp, 
  Award, 
  Layers, 
  Search, 
  Download, 
  ArrowUpRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  Plus,
  Mic,
  Headphones,
  Clock,
  Check,
  AlertCircle
} from 'lucide-react';

export const PlacementCoordinatorPortal: React.FC = () => {
  const { currentUser, assignments } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<string>('ALL');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetScope, setAssignTargetScope] = useState<'ALL_STUDENTS' | 'PROGRAM' | 'DEPARTMENT' | 'SPECIFIC_STUDENT'>('ALL_STUDENTS');
  const [assignProgramName, setAssignProgramName] = useState<string>('');
  const [assignDepartment, setAssignDepartment] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [programs, setPrograms] = useState<DynamicProgram[]>([]);
  const [candidates, setCandidates] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('admin_students');
      return stored ? JSON.parse(stored) : MOCK_MENTEES_LIST;
    } catch {
      return MOCK_MENTEES_LIST;
    }
  });

  const calculateDynamicStats = (list: any[], progs: DynamicProgram[] = []) => {
    const total = list.length;
    const ready = list.filter(s => (s.score || 0) >= 75).length;
    return {
      totalCandidates: total,
      activeProgramsCount: progs.length,
      placementReadyCount: ready,
      placementReadyRate: Math.round((ready / Math.max(1, total)) * 100),
    };
  };

  const [stats, setStats] = useState(() => calculateDynamicStats(candidates, []));
  const [reportGenerated, setReportGenerated] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [list, progs] = await Promise.all([
          api.admin.getStudents(),
          api.college.getPrograms(currentUser?.collegeId || 'col-1')
        ]);
        const currentProgs = progs || [];
        setPrograms(currentProgs);
        if (list && list.length > 0) {
          setCandidates(list);
          setStats(calculateDynamicStats(list, currentProgs));
        } else {
          setStats(calculateDynamicStats(candidates, currentProgs));
        }
      } catch (err) {
        console.warn('Using local stats fallback:', err);
      }
    };
    fetchStats();
  }, [currentUser?.collegeId]);

  const handleExportCsv = () => {
    const headers = 'ID,Name,RollNumber,Cohort,Domain,MockScore,Checklist,Status\n';
    const rows = candidates.map(c => 
      `${c.id},"${c.name}",${c.rollNumber},${c.track},"${c.domain || ''}",${c.score},"${c.checklist}",${c.status}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `college_placement_readiness_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateSenateReport = () => {
    setReportGenerated(true);
    setTimeout(() => setReportGenerated(false), 3000);
  };

  const cohorts = [
    { id: 'ALL', label: 'All Candidates', count: stats.totalCandidates },
    ...programs.map(p => ({
      id: p.name,
      label: p.name,
      count: candidates.filter(s => s.programName === p.name || s.track === p.name || s.track?.startsWith(p.name)).length
    })),
    {
      id: 'General Track',
      label: 'General Track',
      count: candidates.filter(s => (!s.programName && !programs.some(p => s.track?.startsWith(p.name))) || s.track === 'General Track').length
    }
  ];

  const filteredCandidates = candidates.filter(s => {
    const matchesCohort = selectedCohort === 'ALL'
      || s.programName === selectedCohort
      || s.track === selectedCohort
      || s.track?.startsWith(selectedCohort);
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCohort && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Institutional Placement Intelligence</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-900 text-white rounded font-mono">SUPER ADMIN</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Macro college-wide placement readiness, dynamic program tracking, and domain benchmark oversight.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            type="button"
            onClick={() => { 
              setAssignTargetScope('ALL_STUDENTS');
              setAssignProgramName('');
              setAssignDepartment('');
              setAssignModalOpen(true); 
              setFeedback(null); 
            }}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Assessment</span>
          </button>
          <button 
            type="button"
            onClick={() => { 
              setAssignTargetScope('PROGRAM');
              setAssignProgramName(programs[0]?.name || '');
              setAssignDepartment('');
              setAssignModalOpen(true); 
              setFeedback(null); 
            }}
            className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Assign Assessment by Program</span>
          </button>
          <button 
            type="button"
            onClick={() => { 
              setAssignTargetScope('DEPARTMENT');
              setAssignProgramName('');
              setAssignDepartment('Computer Science & Engineering');
              setAssignModalOpen(true); 
              setFeedback(null); 
            }}
            className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Assign Assessment by Department</span>
          </button>
          <button 
            type="button"
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 px-3 py-2 rounded-xl text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Export CSV</span>
          </button>
          <button 
            type="button"
            onClick={handleGenerateSenateReport}
            className="flex items-center space-x-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{reportGenerated ? 'Report Compiled!' : 'Senate Report'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl text-xs border flex items-center justify-between ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>
      )}

      {reportGenerated && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 animate-in slide-in-from-top duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Senate Academic Council placement audit synthesized: {stats.placementReadyRate}% candidates placement ready across active institutional programs.</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1.5">
            <span className="font-medium">Total Candidates</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{stats.totalCandidates.toLocaleString()}</div>
          <p className="text-[11px] text-neutral-400 mt-1">Enrolled for Season</p>
        </div>

        <div className="p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1.5">
            <span className="font-medium">Placement Ready</span>
            <Award className="w-4 h-4 text-neutral-900" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{stats.placementReadyCount}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Cleared readiness threshold</p>
        </div>

        <div className="p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1.5">
            <span className="font-medium">Active Programs</span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{stats.activeProgramsCount} Programs</div>
          <p className="text-[11px] text-neutral-400 mt-1">Configured by Super Admin</p>
        </div>

        <div className="p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1.5">
            <span className="font-medium">Readiness Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{stats.placementReadyRate}%</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">College-wide benchmark</p>
        </div>
      </div>

      {/* College-Wide Dispatched Mock & Listening Drills */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-neutral-900">
                Dispatched College Mock Interviews &amp; Listening Drills
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-100 text-neutral-800 rounded font-mono">
                {assignments.length} ACTIVE DRILLS
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Targeted oral mock interview rounds and listening comprehension drills assigned across the college.
            </p>
          </div>

          <button
            onClick={() => { setAssignModalOpen(true); setFeedback(null); }}
            className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Dispatch New Drill</span>
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">
            <Layers className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
            <p className="font-semibold text-neutral-700">No college assignments dispatched yet.</p>
            <p className="mt-0.5">Click "Dispatch New Drill" to assign the first mock interview or listening test.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((asg) => {
              const isInterview = asg.sessionType === 'MOCK_INTERVIEW';
              const subsCount = asg.submissions?.length || 0;
              return (
                <div key={asg.id} className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl flex flex-col justify-between space-y-3 hover:border-neutral-300 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isInterview ? 'bg-neutral-900 text-white' : 'bg-emerald-900 text-emerald-100'
                      }`}>
                        {isInterview ? <Mic className="w-3 h-3 text-emerald-400" /> : <Headphones className="w-3 h-3 text-emerald-300" />}
                        <span>{isInterview ? 'Mock Interview' : 'Listening Lab'}</span>
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        asg.isMandatory ? 'bg-rose-100 text-rose-800' : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {asg.isMandatory ? 'Mandatory' : 'Practice'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-neutral-900 line-clamp-1">{asg.title}</h4>
                    <p className="text-[11px] text-neutral-500">
                      By: <span className="font-medium text-neutral-700">{asg.assignedByName}</span> ({asg.assignedByRole.replace(/_/g, ' ')})
                    </p>

                    <div className="text-[11px] text-neutral-600 bg-white p-2 rounded-lg border border-neutral-200/60 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Target:</span>
                        <span className="font-medium text-neutral-800">{asg.targetProgramName || asg.targetDomainOrTrack || asg.targetScope}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Due:</span>
                        <span className="font-mono text-neutral-700">{asg.dueDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-neutral-500">
                      <strong className="text-neutral-900">{subsCount}</strong> submissions
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3">
        {cohorts.map((cohort) => (
          <button
            key={cohort.id}
            onClick={() => setSelectedCohort(cohort.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCohort === cohort.id 
                ? 'bg-neutral-900 text-white shadow-xs' 
                : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600'
            }`}
          >
            {cohort.label} ({cohort.count})
          </button>
        ))}
      </div>

      {/* Dynamic Cohort Quick-Assign Action Banner */}
      {selectedCohort !== 'ALL' && (
        <div className="p-4 bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">Active Program Cohort: {selectedCohort}</p>
              <p className="text-[11px] text-neutral-400">Instantly dispatch a customized mock interview or listening test to all students in {selectedCohort}.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAssignTargetScope('PROGRAM');
              setAssignProgramName(selectedCohort);
              setAssignDepartment('');
              setAssignModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Mic className="w-3.5 h-3.5 text-emerald-200" />
            <span>Assign Assessment to all &ldquo;{selectedCohort}&rdquo; Students</span>
          </button>
        </div>
      )}

      <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:px-6 border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter candidate by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <span className="text-xs text-neutral-500">
            Showing active mock interview evaluations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
              <tr>
                <th className="py-3 px-6 font-medium">CANDIDATE</th>
                <th className="py-3 px-6 font-medium">COHORT TRACK</th>
                <th className="py-3 px-6 font-medium">DOMAIN</th>
                <th className="py-3 px-6 font-medium">MOCK SCORE</th>
                <th className="py-3 px-6 font-medium">STATUS</th>
                <th className="py-3 px-6 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCandidates.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3.5 px-6 font-medium text-neutral-900">
                    <div>{s.name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{s.rollNumber}</div>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                      {s.track}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-neutral-600">
                    {s.domain}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-neutral-900 text-white">
                      {s.score}/100
                    </span>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button className="text-neutral-500 hover:text-neutral-900 font-medium inline-flex items-center">
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {assignModalOpen && (
        <AssignSessionModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={(newAsg) => {
            setFeedback({
              type: 'success',
              message: `College drill '${newAsg.title}' dispatched successfully!`
            });
            setAssignModalOpen(false);
          }}
          defaultRole="SUPER_ADMIN"
          defaultTargetScope={assignTargetScope}
          defaultProgramName={assignProgramName}
          defaultDepartment={assignDepartment}
          studentsList={candidates}
        />
      )}

    </div>
  );
};
