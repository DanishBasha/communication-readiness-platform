import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { MOCK_MENTEES_LIST } from '../../data/mockData';
import { AssignSessionModal } from '../common/AssignSessionModal';
import { StudentDirectoryTable } from '../common/StudentDirectoryTable';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { AssessmentMonitoringWidget } from '../common/AssessmentMonitoringWidget';
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
  const { currentUser, assignments, openStudentDashboard } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<string>('ALL');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetScope, setAssignTargetScope] = useState<'ALL_STUDENTS' | 'PROGRAM' | 'DEPARTMENT' | 'SPECIFIC_STUDENT'>('ALL_STUDENTS');
  const [assignProgramName, setAssignProgramName] = useState<string>('');
  const [assignDepartment, setAssignDepartment] = useState<string>('');
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);
  const [targetStudentForAssign, setTargetStudentForAssign] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [programs, setPrograms] = useState<DynamicProgram[]>([]);
  const [candidates, setCandidates] = useState<any[]>(MOCK_MENTEES_LIST);

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
          api.admin.getUsers({ role: 'STUDENT' }).then(users =>
            users.length > 0 ? users : api.admin.getStudents()
          ).catch(() => api.admin.getStudents()),
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
    const headers = 'ID,Name,RollNumber,Batch,Domain,MockScore,Checklist,Status\n';
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
    { id: 'ALL', label: 'All Students', count: stats.totalCandidates },
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
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Institutional Placement Intelligence</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-900 text-white rounded font-mono">SUPER ADMIN</span>
          </div>
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
          <span>Placement readiness report: {stats.placementReadyRate}% of students are placement ready across active programs.</span>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1.5">
            <span className="font-medium">Total Students</span>
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

      {/* Assessment & Interview Monitoring Hub */}
      <AssessmentMonitoringWidget 
        collegeId={currentUser?.collegeId} 
        programName={selectedCohort !== 'ALL' ? selectedCohort : undefined}
        titlePrefix={selectedCohort !== 'ALL' ? selectedCohort : undefined}
      />

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
              <p className="text-xs font-semibold">Active Training Program: {selectedCohort}</p>
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

      <StudentDirectoryTable
        students={candidates}
        onSelectStudent={(s) => openStudentDashboard(s)}
        onAssignStudent={(s) => {
          setAssignTargetScope('SPECIFIC_STUDENT');
          setTargetStudentForAssign(s);
          setAssignModalOpen(true);
        }}
        showAssignAction={true}
        title="College Placement Candidate Roster"
        subtitle="Inspect candidate diagnostics, turn scores, and readiness criteria across programs and tracks"
      />

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

      {inspectStudentId && (
        <StudentHistoryModal
          studentId={inspectStudentId}
          onClose={() => setInspectStudentId(null)}
        />
      )}

    </div>
  );
};
