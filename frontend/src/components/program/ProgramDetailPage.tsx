import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { StudentProfile, DynamicProgram } from '../../types';
import { 
  ArrowLeft, 
  Layers, 
  Users, 
  Clock, 
  ShieldCheck, 
  Mic, 
  FileText, 
  Calendar, 
  Activity, 
  UserCheck, 
  Award,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { StudentDirectoryTable } from '../common/StudentDirectoryTable';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { AssignSessionModal } from '../common/AssignSessionModal';

export const ProgramDetailPage: React.FC = () => {
  const { selectedProgram, setActiveView, viewProgramLogs, currentUser, openStudentDashboard } = useApp();

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileStudent, setProfileStudent] = useState<StudentProfile | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetStudentForAssign, setTargetStudentForAssign] = useState<StudentProfile | null>(null);

  // Fallback program if user reloaded directly on #/program-detail
  const program: DynamicProgram = selectedProgram || {
    id: 'prog-fallback',
    collegeId: currentUser?.collegeId || 'col-1',
    name: 'Advanced Technical Readiness Track',
    code: 'ATRT',
    hasSubPrograms: false,
    subPrograms: [],
    description: 'Comprehensive curriculum evaluating verbal technical turns, systems design, and listening comprehension.',
    assignedAdminName: 'Prof. Swaminathan K',
    assignedAdminEmail: 'program@college.edu',
    adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS'],
    createdAt: new Date().toISOString(),
    startDate: '2026-10-01',
    endDate: '2026-12-15',
    durationWeeks: 10,
    dailyStartTime: '09:00',
    dailyEndTime: '17:00',
    scheduleType: 'SCHEDULED_HOURS',
    minAttendancePercent: 80,
    minPassScore: 75,
    strictProctoring: true,
    customRules: [
      'Minimum 80% attendance on scheduled drills',
      'Passing score threshold set to 75%',
      'Strict voice turn verification and tab-switch proctoring enabled'
    ]
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const all = await api.admin.getUsers({ role: 'STUDENT' }).then(users =>
          users.length > 0 ? users : api.admin.getStudents()
        ).catch(() => api.admin.getStudents());
        // Filter students belonging to this program or track
        const programStudents = (all || []).filter((s: StudentProfile) => 
          s.programName === program.name || 
          s.track?.includes(program.name) ||
          s.track?.includes(program.code)
        );
        setStudents(programStudents.length > 0 ? programStudents : (all || []).slice(0, 12));
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [program.name, program.code, currentUser?.collegeId]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setActiveView('DASHBOARD')}
            className="p-2 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center space-x-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          <div className="h-4 w-[1px] bg-neutral-300" />
          <div className="flex items-center space-x-2 text-xs font-medium text-neutral-500">
            <span>Programs</span>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">{program.name}</span>
          </div>
        </div>

        {/* Action Buttons: Rectangular "View Activity Logs" Button as explicitly requested */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => viewProgramLogs(program)}
            className="px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
          >
            <Activity className="w-4 h-4 text-neutral-600" />
            <span>View Activity Logs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTargetStudentForAssign(null);
              setAssignModalOpen(true);
            }}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
          >
            <Mic className="w-4 h-4 text-emerald-400" />
            <span>Assign Assessment</span>
          </button>
        </div>
      </div>

      {/* Program Hero Banner */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Layers className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">{program.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-lg bg-neutral-100 text-neutral-800 font-mono text-xs font-bold border border-neutral-200">
                    {program.code}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lead Admin Card */}
          <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 min-w-[240px] space-y-1">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Designated Lead Admin</div>
            <div className="font-bold text-xs text-neutral-900 flex items-center space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{program.assignedAdminName || 'Lead Mentor Assigned'}</span>
            </div>
            <div className="text-[11px] font-mono text-neutral-500">{program.assignedAdminEmail || 'program.admin@college.edu'}</div>
          </div>
        </div>

        {/* Metrics, Rules & Schedule Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-neutral-100">
          
          {/* Card 1: Active Enrollment */}
          <div className="p-4 bg-neutral-50/70 rounded-2xl border border-neutral-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700">Enrolled Candidates</span>
              <Users className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 font-mono">
              {loading ? '...' : students.length}
            </div>
            <p className="text-[11px] text-neutral-500">Active participants in this curriculum track</p>
          </div>

          {/* Card 2: Program Rules & Governance */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Program Rules</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div className="space-y-1 text-[11px] text-emerald-900">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Min Attendance: <strong>{program.minAttendancePercent || 80}%</strong></span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Passing Bar: <strong>{program.minPassScore || 75}%</strong> across drills</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>AI Anti-cheating proctoring active</span>
              </div>
            </div>
          </div>

          {/* Card 3: Schedule & Active Hours */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Program Schedule</span>
              </span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                {program.durationWeeks ? `${program.durationWeeks} Weeks` : 'Semester'}
              </span>
            </div>
            <div className="space-y-1 text-[11px] text-blue-900">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
                <span>Timeline: {program.startDate || 'Oct 2026'} → {program.endDate || 'Dec 2026'}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                <span>Daily Window: {program.dailyStartTime || '09:00'} - {program.dailyEndTime || '17:00'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Enrolled Students Directory (Standardized Across All Portals) */}
      <StudentDirectoryTable
        students={students}
        title={`${program.name} Candidates`}
        subtitle="Consistent candidate directory. Click any student row to inspect verified progress, transcripts, and evaluation history."
        onSelectStudent={(student) => openStudentDashboard(student)}
        onAssignStudent={(student) => {
          setTargetStudentForAssign(student);
          setAssignModalOpen(true);
        }}
        showAssignAction={true}
      />

      {/* MODAL: STUDENT HISTORY */}
      {profileStudent && (
        <StudentHistoryModal
          studentId={profileStudent.id}
          onClose={() => setProfileStudent(null)}
        />
      )}

      {/* MODAL: ASSIGN SESSION */}
      {assignModalOpen && (
        <AssignSessionModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setTargetStudentForAssign(null);
          }}
          onSuccess={() => {
            setAssignModalOpen(false);
            setTargetStudentForAssign(null);
          }}
          defaultRole="SUPER_ADMIN"
          defaultTargetScope={targetStudentForAssign ? 'SPECIFIC_STUDENT' : 'PROGRAM'}
          defaultProgramName={program.name}
          targetStudent={targetStudentForAssign}
          studentsList={students}
        />
      )}
    </div>
  );
};
