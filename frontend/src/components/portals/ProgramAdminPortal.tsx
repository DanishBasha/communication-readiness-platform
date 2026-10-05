import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { ADMIN_PERMISSION_LABELS } from '../../data/mockData';
import { InterviewAssignment, AdminPermission, DynamicProgram } from '../../types';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { AssignSessionModal } from '../common/AssignSessionModal';
import { DatePicker } from '../common/DatePicker';
import { StudentDirectoryTable } from '../common/StudentDirectoryTable';
import { AssessmentMonitoringWidget } from '../common/AssessmentMonitoringWidget';
import { useBackHandler } from '../../hooks/useBackHandler';
import { DepartmentClassesManager } from '../common/DepartmentClassesManager';
import { 
  Layers, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Sparkles, 
  UserPlus, 
  Calendar, 
  Trash2, 
  Users, 
  Eye, 
  X, 
  ShieldCheck, 
  Lock, 
  Mic, 
  Headphones, 
  Check, 
  Building2,
  Search
} from 'lucide-react';

export const ProgramAdminPortal: React.FC = () => {
  const { 
    currentUser, 
    assignments, 
    createAssignment, 
    openStudentDashboard, 
    openAdminDashboard 
  } = useApp();

  const userPermissions: AdminPermission[] = currentUser?.permissions && currentUser.permissions.length > 0
    ? currentUser.permissions
    : [
        'CAN_VIEW_STUDENT_PROGRESS',
        'CAN_ASSIGN_INTERVIEWS',
        'CAN_ASSIGN_LISTENING',
        'CAN_MANAGE_STUDENTS'
      ];

  const hasPerm = (p: AdminPermission) => userPermissions.includes(p);

  const [programs, setPrograms] = useState<DynamicProgram[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Identity scoping: Is this portal for a specific program admin (e.g. Hope) or department admin?
  const isDepartmentAdmin = Boolean(currentUser?.department && !currentUser?.programName);
  const activeProgramName = currentUser?.programName || (!isDepartmentAdmin ? (programs[0]?.name || 'Hope') : '');
  const activeDeptName = currentUser?.department || '';
  const activeProgram = programs.find(p => p.name.toLowerCase() === activeProgramName.toLowerCase() || p.id === currentUser?.programId) || programs[0];

  // Specific Program Admin does NOT manage department classes. Only Department Admin has classes & sections.
  const allowedTabs: ('ASSIGNMENTS' | 'CLASSES' | 'STUDENTS')[] = isDepartmentAdmin 
    ? ['ASSIGNMENTS', 'CLASSES', 'STUDENTS'] 
    : ['ASSIGNMENTS', 'STUDENTS'];

  const [activeTab, setActiveTab] = useState<'ASSIGNMENTS' | 'CLASSES' | 'STUDENTS'>('ASSIGNMENTS');

  const [selectedProgId, setSelectedProgId] = useState<string>(activeProgram?.id || 'prog-hope');
  const [selectedSubProgram, setSelectedSubProgram] = useState<string>('');

  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; role: string; email?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter students strictly scoped to this specific program or department
  const displayedStudents = React.useMemo(() => {
    if (isDepartmentAdmin) {
      return students.filter(s => 
        (s.department && s.department.toLowerCase().includes(activeDeptName.toLowerCase())) ||
        (activeDeptName.toLowerCase().includes(s.department?.toLowerCase() || ''))
      );
    }
    return students.filter(s => 
      (s.programName && s.programName.toLowerCase() === activeProgramName.toLowerCase()) ||
      (s.track && s.track.toLowerCase().includes(activeProgramName.toLowerCase())) ||
      (activeProgram && s.programId === activeProgram.id)
    );
  }, [students, isDepartmentAdmin, activeDeptName, activeProgramName, activeProgram]);

  // Filter assignments strictly scoped to this specific program or department
  const displayedAssignments = React.useMemo(() => {
    if (isDepartmentAdmin) {
      return assignments.filter(a => 
        (a.targetDepartment && a.targetDepartment.toLowerCase() === activeDeptName.toLowerCase()) ||
        (a.targetDepartments && a.targetDepartments.some((d: string) => d.toLowerCase() === activeDeptName.toLowerCase())) ||
        (a.targetDomainOrTrack && a.targetDomainOrTrack.toLowerCase().includes(activeDeptName.toLowerCase()))
      );
    }
    return assignments.filter(a => 
      (a.targetProgramName && a.targetProgramName.toLowerCase() === activeProgramName.toLowerCase()) ||
      (a.targetProgramNames && a.targetProgramNames.some((p: string) => p.toLowerCase() === activeProgramName.toLowerCase())) ||
      (a.targetDomainOrTrack && a.targetDomainOrTrack.toLowerCase().includes(activeProgramName.toLowerCase()))
    );
  }, [assignments, isDepartmentAdmin, activeDeptName, activeProgramName]);

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [stuName, setStuName] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuRollNumber, setStuRollNumber] = useState('');
  const [stuDepartment, setStuDepartment] = useState('Computer Science & Engineering');
  const [stuBatchYear, setStuBatchYear] = useState(2026);
  const [stuMentorId, setStuMentorId] = useState('');
  const [stuPassword, setStuPassword] = useState('');
  const [stuSubmitting, setStuSubmitting] = useState(false);

  // College student search & program assignment states
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('');
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);

  // College-wide departmental students available to be assigned to this program
  const filteredCollegeStudents = React.useMemo(() => {
    // Only students who are in any defined department
    const deptStudents = students.filter(s => Boolean(s.department && s.department.trim().length > 0));
    if (!collegeSearchQuery.trim()) {
      return deptStudents;
    }
    const q = collegeSearchQuery.trim().toLowerCase();
    return deptStudents.filter(s => 
      s.name.toLowerCase().includes(q) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.department && s.department.toLowerCase().includes(q)) ||
      (s.batchYear && String(s.batchYear).includes(q))
    );
  }, [students, collegeSearchQuery]);

  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const [mentorName, setMentorName] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [mentorPassword, setMentorPassword] = useState('');

  const [asgModalOpen, setAsgModalOpen] = useState(false);
  const [asgTargetScope, setAsgTargetScope] = useState<'ALL_STUDENTS' | 'PROGRAM' | 'DEPARTMENT' | 'SPECIFIC_STUDENT'>(isDepartmentAdmin ? 'DEPARTMENT' : 'PROGRAM');
  const [asgProgramName, setAsgProgramName] = useState<string>(activeProgramName);
  const [asgDepartment, setAsgDepartment] = useState<string>(isDepartmentAdmin ? activeDeptName : '');
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState<any | null>(null);

  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');

  useBackHandler(studentModalOpen, () => setStudentModalOpen(false));
  useBackHandler(mentorModalOpen, () => setMentorModalOpen(false));
  useBackHandler(allocModalOpen, () => setAllocModalOpen(false));

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const [progs, mList, sList] = await Promise.all([
        api.college.getPrograms(currentUser?.collegeId || 'col-1'),
        api.admin.getFacultyMentors(),
        api.admin.getStudents()
      ]);
      if (progs) {
        setPrograms(progs);
        const allSubProgs: string[] = [];
        progs.forEach(p => {
          if (p.hasSubPrograms && p.subPrograms) {
            allSubProgs.push(...p.subPrograms);
          }
        });
        setDomains(allSubProgs);
        const matched = progs.find(p => p.name.toLowerCase() === (currentUser?.programName || '').toLowerCase() || p.id === currentUser?.programId);
        if (matched) {
          setSelectedProgId(matched.id);
          if (matched.hasSubPrograms && matched.subPrograms && matched.subPrograms.length > 0) {
            setSelectedSubProgram(matched.subPrograms[0]);
          }
        } else if (progs.length > 0 && selectedProgId === 'GENERAL') {
          const firstProg = progs[0];
          if (firstProg) {
            setSelectedProgId(firstProg.id);
            if (firstProg.hasSubPrograms && firstProg.subPrograms && firstProg.subPrograms.length > 0) {
              setSelectedSubProgram(firstProg.subPrograms[0]);
            }
          }
        }
      }
      if (mList) setMentors(mList);
      if (sList) setStudents(sList);
    } catch (err) {
      console.warn('Error fetching Program Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorName.trim() || !mentorEmail.trim()) return;

    try {
      await api.admin.createFacultyMentor({
        name: mentorName.trim(),
        email: mentorEmail.trim(),
        password: mentorPassword.trim() || 'mentor123'
      });
      setFeedback({ type: 'success', message: `Faculty Mentor '${mentorName}' added successfully!` });
      setMentorName('');
      setMentorEmail('');
      setMentorPassword('');
      setMentorModalOpen(false);
      await loadPortalData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to add Faculty Mentor.' });
    }
  };

  const handleAssignMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedMentorId) return;

    try {
      await api.admin.assignMentor(selectedStudentId, selectedMentorId);
      setFeedback({ type: 'success', message: 'Student assigned to Faculty Mentor successfully!' });
      setAllocModalOpen(false);
      await loadPortalData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to assign mentor.' });
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stuName.trim() || !stuEmail.trim() || !stuRollNumber.trim()) return;
    setStuSubmitting(true);
    try {
      const progName = !isDepartmentAdmin ? activeProgramName : undefined;
      const targetDept = isDepartmentAdmin ? activeDeptName : stuDepartment;
      const trackName = !isDepartmentAdmin
        ? (activeProgram && activeProgram.hasSubPrograms && selectedSubProgram ? `${activeProgram.name} (${selectedSubProgram})` : activeProgramName)
        : 'DEPARTMENT';

      await api.studentBatch.enrollSingle(currentUser?.collegeId || 'col-1', {
        name: stuName.trim(),
        email: stuEmail.trim(),
        rollNumber: stuRollNumber.trim(),
        department: targetDept,
        batchYear: Number(stuBatchYear),
        programName: progName,
        subProgramName: !isDepartmentAdmin && activeProgram?.hasSubPrograms ? selectedSubProgram : undefined,
        password: stuPassword.trim() || 'student123'
      });
      setFeedback({ 
        type: 'success', 
        message: `Student '${stuName}' enrolled in ${!isDepartmentAdmin ? activeProgramName : activeDeptName} successfully!` 
      });
      setStudentModalOpen(false);
      setStuName('');
      setStuEmail('');
      setStuRollNumber('');
      setStuPassword('');
      await loadPortalData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to enroll student.' });
    } finally {
      setStuSubmitting(false);
    }
  };

  const handleAssignCollegeStudentToProgram = async (targetStudent: any) => {
    try {
      setAssigningStudentId(targetStudent.id);
      const trackName = activeProgram && activeProgram.hasSubPrograms && selectedSubProgram 
        ? `${activeProgram.name} (${selectedSubProgram})` 
        : activeProgramName;
      
      await api.studentBatch.updateStudentDetails(currentUser?.collegeId || 'col-1', targetStudent.id, {
        programName: activeProgramName,
        programId: activeProgram?.id,
        track: trackName
      });
      setFeedback({ 
        type: 'success', 
        message: `Successfully assigned ${targetStudent.name} (${targetStudent.rollNumber}) to ${activeProgramName}!` 
      });
      await loadPortalData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to assign student to program.' });
    } finally {
      setAssigningStudentId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.admin.deleteUser(deleteTarget.id);
      setFeedback({ type: 'success', message: res.message || `${deleteTarget.name} removed successfully.` });
      setDeleteTarget(null);
      await loadPortalData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to remove user.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                  {isDepartmentAdmin ? `${activeDeptName} Department Portal` : `${activeProgramName} Admin Portal`}
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-900 rounded border border-blue-200 font-mono">
                  {isDepartmentAdmin ? 'DEPARTMENT ADMIN' : `${activeProgramName.toUpperCase()} ADMIN`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(hasPerm('CAN_ASSIGN_INTERVIEWS') || hasPerm('CAN_ASSIGN_LISTENING')) && (
            <button 
              type="button"
              onClick={() => {
                if (isDepartmentAdmin) {
                  setAsgTargetScope('DEPARTMENT');
                  setAsgDepartment(activeDeptName);
                  setAsgProgramName('');
                } else {
                  setAsgTargetScope('PROGRAM');
                  setAsgProgramName(activeProgramName);
                  setAsgDepartment('');
                }
                setSelectedStudentForAssign(null);
                setAsgModalOpen(true);
                setFeedback(null);
              }}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Assign Assessment</span>
            </button>
          )}
          {hasPerm('CAN_MANAGE_STUDENTS') && (
            <button 
              onClick={() => { 
                setCollegeSearchQuery(''); 
                setStudentModalOpen(true); 
                setFeedback(null); 
              }}
              className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer"
              title={isDepartmentAdmin ? "Enroll student in department" : `Assign college student to ${activeProgramName}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isDepartmentAdmin ? '+ Enroll Student' : `+ Assign Student to ${activeProgramName}`}</span>
            </button>
          )}
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

      <div className="flex border-b border-neutral-200 space-x-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('ASSIGNMENTS')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ASSIGNMENTS'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Assessments & Monitoring ({displayedAssignments.length})</span>
        </button>

        {isDepartmentAdmin && (
          <button
            onClick={() => setActiveTab('CLASSES')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'CLASSES'
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Department Classes & Sections</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'STUDENTS'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isDepartmentAdmin ? `${activeDeptName} Candidates` : `${activeProgramName} Candidates`} ({displayedStudents.length})</span>
        </button>
      </div>

      {activeTab === 'ASSIGNMENTS' && (
        <div className="space-y-6">
          <AssessmentMonitoringWidget 
            collegeId={currentUser?.collegeId} 
            programName={!isDepartmentAdmin ? activeProgramName : undefined}
            department={isDepartmentAdmin ? activeDeptName : undefined}
            titlePrefix={!isDepartmentAdmin ? activeProgramName : activeDeptName}
            hideScopeSelector={true}
          />

          <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
                  Assigned Practice & Mock Rounds ({!isDepartmentAdmin ? activeProgramName : activeDeptName})
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isDepartmentAdmin) {
                      setAsgTargetScope('DEPARTMENT');
                      setAsgDepartment(activeDeptName);
                      setAsgProgramName('');
                    } else {
                      setAsgTargetScope('PROGRAM');
                      setAsgProgramName(activeProgramName);
                      setAsgDepartment('');
                    }
                    setSelectedStudentForAssign(null);
                    setAsgModalOpen(true);
                  }}
                  className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg font-semibold cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  <Mic className="w-3 h-3 text-emerald-200" />
                  <span>+ Assign Assessment to {!isDepartmentAdmin ? activeProgramName : activeDeptName}</span>
                </button>
              </div>
            </div>

            {displayedAssignments.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                <Layers className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                <p className="font-medium text-neutral-600">No active assignments created for {!isDepartmentAdmin ? activeProgramName : activeDeptName}.</p>
                <p className="mt-1">Click "Assign Assessment" above to dispatch the first practice drill.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
                    <tr>
                      <th className="py-3 px-4 font-medium">FORMAT</th>
                      <th className="py-3 px-4 font-medium">ASSIGNMENT TITLE</th>
                      <th className="py-3 px-4 font-medium">TARGET BATCH</th>
                      <th className="py-3 px-4 font-medium">ASSIGNED BY</th>
                      <th className="py-3 px-4 font-medium">SUBMISSIONS</th>
                      <th className="py-3 px-4 font-medium">DUE DATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {displayedAssignments.map((asg) => {
                      const isInterview = asg.sessionType === 'MOCK_INTERVIEW';
                      const subsCount = asg.submissions?.length || 0;
                      return (
                        <tr key={asg.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isInterview ? 'bg-neutral-900 text-white' : 'bg-emerald-900 text-emerald-100'
                            }`}>
                              {isInterview ? <Mic className="w-2.5 h-2.5 text-emerald-400" /> : <Headphones className="w-2.5 h-2.5 text-emerald-300" />}
                              <span>{isInterview ? 'Mock Interview' : 'Listening Lab'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-neutral-900">{asg.title}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800">
                              {asg.targetProgramName || asg.targetDomainOrTrack || asg.targetScope}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-neutral-600">{asg.assignedByName}</td>
                          <td className="py-3 px-4 font-mono font-medium text-neutral-900">
                            {subsCount} / {displayedStudents.length}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">{asg.dueDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'CLASSES' && isDepartmentAdmin && (
        <DepartmentClassesManager 
          collegeId={currentUser?.collegeId} 
          departmentFilter={activeDeptName} 
        />
      )}

      {activeTab === 'STUDENTS' && (
        <div className="space-y-4">
          {hasPerm('CAN_MANAGE_STUDENTS') && (
            <div className="flex items-center justify-end">
              <button
                onClick={() => { 
                  setCollegeSearchQuery(''); 
                  setStudentModalOpen(true); 
                  setFeedback(null); 
                }}
                className="text-xs bg-neutral-900 text-white px-3.5 py-2 rounded-xl hover:bg-black font-semibold cursor-pointer flex items-center space-x-1.5 shadow-xs"
                title={isDepartmentAdmin ? "Enroll candidate in department" : `Assign college student to ${activeProgramName}`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isDepartmentAdmin ? '+ Enroll New Candidate' : `+ Assign Student to ${activeProgramName}`}</span>
              </button>
            </div>
          )}

          <StudentDirectoryTable
            students={displayedStudents}
            onSelectStudent={(s) => openStudentDashboard(s)}
            onAssignStudent={(hasPerm('CAN_ASSIGN_INTERVIEWS') || hasPerm('CAN_ASSIGN_LISTENING')) ? (s) => {
              setSelectedStudentForAssign(s);
              setAsgModalOpen(true);
            } : undefined}
            showAssignAction={hasPerm('CAN_ASSIGN_INTERVIEWS') || hasPerm('CAN_ASSIGN_LISTENING')}
            title={isDepartmentAdmin ? `${activeDeptName} Candidates Directory` : `${activeProgramName} Candidates Directory`}
            subtitle={isDepartmentAdmin 
              ? `View candidates and readiness scores across ${activeDeptName}` 
              : `View candidates, readiness scores, and verified criteria strictly for ${activeProgramName}`}
          />
        </div>
      )}

      {mentorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
                  FM
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Add Faculty Mentor</h3>
              </div>
              <button onClick={() => setMentorModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMentor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Faculty Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. S. Ranganathan"
                  value={mentorName}
                  onChange={(e) => setMentorName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Faculty Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ranganathan.s@college.edu"
                  value={mentorEmail}
                  onChange={(e) => setMentorEmail(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  placeholder="Default: mentor123"
                  value={mentorPassword}
                  onChange={(e) => setMentorPassword(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setMentorModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium"
                >
                  Create Mentor Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {asgModalOpen && (
        <AssignSessionModal
          isOpen={asgModalOpen}
          onClose={() => {
            setAsgModalOpen(false);
            setSelectedStudentForAssign(null);
          }}
          onSuccess={(newAsg) => {
            setFeedback({
              type: 'success',
              message: `Assignment '${newAsg.title}' dispatched successfully!`
            });
            setAsgModalOpen(false);
            setSelectedStudentForAssign(null);
          }}
          defaultRole="PROGRAM_ADMIN"
          defaultTargetScope={selectedStudentForAssign ? 'SPECIFIC_STUDENT' : asgTargetScope}
          defaultProgramName={asgProgramName}
          defaultDepartment={asgDepartment}
          studentsList={students}
          menteesList={mentors}
          targetStudent={selectedStudentForAssign}
        />
      )}

      {allocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Assign Student to Faculty Mentor</h3>
              <button onClick={() => setAllocModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignMentor} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Select Student *</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                >
                  <option value="">-- Choose Candidate --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNumber}) - Track: {s.track}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Assign to Faculty Mentor *</label>
                <select
                  required
                  value={selectedMentorId}
                  onChange={(e) => setSelectedMentorId(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                >
                  <option value="">-- Choose Faculty Mentor --</option>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email}) - {m.menteeCount || 0} Current Mentees
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAllocModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs">
                  {isDepartmentAdmin ? <UserPlus className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    {isDepartmentAdmin 
                      ? 'Enroll Department Candidate (One-by-One)' 
                      : `Assign College Student to ${activeProgramName}`}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {isDepartmentAdmin 
                      ? `Adding single candidate to ${activeDeptName} department` 
                      : `Search across registered department students to assign to ${activeProgramName}`}
                  </p>
                </div>
              </div>
              <button onClick={() => { setStudentModalOpen(false); setCollegeSearchQuery(''); }} className="text-neutral-400 hover:text-neutral-600 text-xs p-1">✕</button>
            </div>

            {!isDepartmentAdmin ? (
              /* PROGRAM ADMIN: SEARCH & ASSIGN COLLEGE STUDENT TO PROGRAM DOMAIN */
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-blue-900 text-xs flex items-start space-x-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-950">College Student Program Domain Assignment</p>
                    <p className="text-[11px] text-blue-800/90 mt-0.5 leading-relaxed">
                      Students already belong to their academic departments (CSE, IT, ECE, etc.). Search across the college by student name or roll number to assign them to the <strong>{activeProgramName}</strong> domain track.
                    </p>
                  </div>
                </div>

                {activeProgram?.hasSubPrograms && activeProgram?.subPrograms && activeProgram.subPrograms.length > 0 && (
                  <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-neutral-800">Target Track Tier:</span>
                    <select
                      value={selectedSubProgram}
                      onChange={(e) => setSelectedSubProgram(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-800 font-medium focus:outline-none"
                    >
                      {activeProgram.subPrograms.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search college student by name, roll, or batch year (e.g. Aravind, 21CS1084, 2028)..."
                    value={collegeSearchQuery}
                    onChange={(e) => setCollegeSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  {collegeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCollegeSearchQuery('')}
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 text-xs p-0.5"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Search Results List */}
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredCollegeStudents.length === 0 ? (
                    <div className="p-6 text-center bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-1">
                      <p className="text-xs font-semibold text-neutral-700">No matching departmental students</p>
                      <p className="text-[11px] text-neutral-500">
                        {collegeSearchQuery 
                          ? `No student matching "${collegeSearchQuery}" found in college departments.` 
                          : 'No students registered in college departments yet.'}
                      </p>
                    </div>
                  ) : (
                    filteredCollegeStudents.map(s => {
                      const isAlreadyEnrolled = 
                        (s.programName && s.programName.toLowerCase() === activeProgramName.toLowerCase()) ||
                        (s.track && s.track.toLowerCase().includes(activeProgramName.toLowerCase())) ||
                        (activeProgram && s.programId === activeProgram.id);

                      return (
                        <div
                          key={s.id}
                          className="p-3 bg-white border border-neutral-200 rounded-xl hover:border-neutral-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-xs text-neutral-900 truncate">{s.name}</span>
                              <span className="font-mono text-[11px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                                {s.rollNumber || 'NO ROLL'}
                              </span>
                              <span className="text-[10px] font-semibold text-neutral-700 bg-neutral-100 border border-neutral-200 px-1.5 py-0.5 rounded">
                                Batch {s.batchYear || 2026}
                              </span>
                              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                {s.department || 'General'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-[11px] text-neutral-500 mt-1">
                              <span className="truncate">{s.email}</span>
                              {s.className && (
                                <span className="font-mono text-neutral-600 bg-neutral-50 px-1 rounded">
                                  Class: {s.className}
                                </span>
                              )}
                              {s.programName && s.programName.toLowerCase() !== activeProgramName.toLowerCase() && (
                                <span className="text-amber-700 text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  In: {s.programName}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isAlreadyEnrolled ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>In {activeProgramName}</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={assigningStudentId === s.id}
                                onClick={() => handleAssignCollegeStudentToProgram(s)}
                                className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                              >
                                {assigningStudentId === s.id ? (
                                  <span>Assigning...</span>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Assign to {activeProgramName}</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-neutral-500">
                    Showing {filteredCollegeStudents.length} departmental student(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentModalOpen(false);
                      setCollegeSearchQuery('');
                    }}
                    className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl hover:bg-neutral-50 text-xs font-medium cursor-pointer"
                  >
                    Done / Close
                  </button>
                </div>
              </div>
            ) : (
              /* DEPARTMENT ADMIN: ENROLL CANDIDATE INTO DEPARTMENT */
              <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bavan Balaji"
                    value={stuName}
                    onChange={(e) => setStuName(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">College Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="student@college.edu"
                      value={stuEmail}
                      onChange={(e) => setStuEmail(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Roll Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 22CS045"
                      value={stuRollNumber}
                      onChange={(e) => setStuRollNumber(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Department *</label>
                    <div className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-800 font-medium truncate">
                      {activeDeptName}
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Batch Year</label>
                    <input
                      type="number"
                      value={stuBatchYear}
                      onChange={(e) => setStuBatchYear(Number(e.target.value))}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Assigned Mentor</label>
                  <select
                    value={stuMentorId}
                    onChange={(e) => setStuMentorId(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 text-xs"
                  >
                    <option value="">-- Optional / Unassigned --</option>
                    {mentors.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    placeholder="Default: student123"
                    value={stuPassword}
                    onChange={(e) => setStuPassword(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
                  />
                </div>
                <div className="pt-2 flex justify-end space-x-2">
                  <button type="button" onClick={() => setStudentModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-neutral-50">Cancel</button>
                  <button type="submit" disabled={stuSubmitting} className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium">
                    {stuSubmitting ? 'Enrolling...' : 'Enroll Student'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {inspectStudentId && (
        <StudentHistoryModal
          studentIdOrUserId={inspectStudentId}
          onClose={() => setInspectStudentId(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title={`Remove ${deleteTarget.role.replace('_', ' ')}`}
          userName={deleteTarget.name}
          userRole={deleteTarget.role}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

    </div>
  );
};

export default ProgramAdminPortal;

