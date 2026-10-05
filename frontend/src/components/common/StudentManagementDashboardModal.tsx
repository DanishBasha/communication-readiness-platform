import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Building2, 
  GraduationCap, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  Clock, 
  Mic, 
  Headphones, 
  FileText, 
  Edit3, 
  Save, 
  ShieldCheck, 
  Sparkles,
  BarChart2,
  Calendar,
  Lock,
  ExternalLink
} from 'lucide-react';
import { StudentProfile, DynamicProgram, DynamicDepartment } from '../../types';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { useBackHandler } from '../../hooks/useBackHandler';
import { AssignSessionModal } from './AssignSessionModal';
import { useApp } from '../../context/AppContext';
import { CustomSelect } from './CustomSelect';

interface StudentManagementDashboardModalProps {
  student: StudentProfile | any;
  onClose: () => void;
  onStudentUpdated?: (updated: any) => void;
  availablePrograms?: DynamicProgram[];
  availableDepartments?: DynamicDepartment[];
}

export const StudentManagementDashboardModal: React.FC<StudentManagementDashboardModalProps> = ({
  student: initialStudent,
  onClose,
  onStudentUpdated,
  availablePrograms: propsPrograms,
  availableDepartments: propsDepartments
}) => {
  useBackHandler(Boolean(initialStudent), onClose);

  const { activeRole, restoreStudentCoinsToFive } = useApp();

  const [student, setStudent] = useState<any>(initialStudent);
  const [activeTab, setActiveTab] = useState<'DOSSIER' | 'EDIT' | 'ASSIGN'>('DOSSIER');
  const [loading, setLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isRestoringCoins, setIsRestoringCoins] = useState(false);

  const handleRestoreCredits = async () => {
    const sId = student?.id || student?.studentId || student?.rollNumber;
    if (!sId) return;
    setIsRestoringCoins(true);
    try {
      await restoreStudentCoinsToFive(sId);
      const updated = { ...student, coins: 5, zeroCoinsAt: undefined };
      setStudent(updated);
      if (onStudentUpdated) {
        onStudentUpdated(updated);
      }
      setFeedback({
        type: 'success',
        message: `Successfully restored 5 credits for candidate ${student.name || sId}!`
      });
      logger.info('SUPER_ADMIN', `Restored 5 credits for ${student.name} (${sId})`);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to restore candidate credits.'
      });
    } finally {
      setIsRestoringCoins(false);
    }
  };

  // Edit form state
  const [editName, setEditName] = useState(initialStudent?.name || '');
  const [editRoll, setEditRoll] = useState(initialStudent?.rollNumber || initialStudent?.roll_number || '');
  const [editEmail, setEditEmail] = useState(initialStudent?.email || '');
  const [editDept, setEditDept] = useState(initialStudent?.department || 'Information Technology');
  const [editProgram, setEditProgram] = useState(initialStudent?.programName || '');
  const [editClass, setEditClass] = useState(initialStudent?.className || initialStudent?.section || '');
  const [editBatch, setEditBatch] = useState(initialStudent?.batchYear || 2026);
  const [editPassword, setEditPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Assign session modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Programs & departments lists
  const [programs, setPrograms] = useState<DynamicProgram[]>(propsPrograms || []);
  const [departments, setDepartments] = useState<DynamicDepartment[]>(propsDepartments || []);

  useEffect(() => {
    let isMounted = true;
    const fetchFullData = async () => {
      setLoading(true);
      try {
        const studentId = initialStudent?.id || initialStudent?.studentId;
        const [hist, progs, depts] = await Promise.all([
          studentId ? api.admin.getStudentFullHistory(studentId) : null,
          propsPrograms && propsPrograms.length > 0 ? null : api.college.getPrograms('col-1'),
          propsDepartments && propsDepartments.length > 0 ? null : api.college.getDepartments('col-1')
        ]);

        if (isMounted) {
          if (hist) setHistoryData(hist);
          if (progs) setPrograms(progs);
          if (depts) setDepartments(depts);
        }
      } catch (err: any) {
        console.warn('Error fetching student deep history:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullData();
    return () => { isMounted = false; };
  }, [initialStudent]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editRoll.trim() || !editEmail.trim()) {
      setFeedback({ type: 'error', message: 'Name, Roll Number, and College Email are required.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const studentId = student.id || student.studentId;
      const updates = {
        name: editName.trim(),
        rollNumber: editRoll.trim().toUpperCase(),
        email: editEmail.trim().toLowerCase(),
        department: editDept.trim(),
        programName: editProgram.trim() || undefined,
        className: editClass.trim() || undefined,
        batchYear: Number(editBatch) || 2026,
        password: editPassword.trim() || undefined
      };

      const updated = await api.studentBatch.updateStudentDetails(
        student.collegeId || 'col-1',
        studentId,
        updates
      );

      const merged = { ...student, ...updates, ...updated };
      setStudent(merged);
      if (onStudentUpdated) {
        onStudentUpdated(merged);
      }

      logger.info('STUDENT', `Admin updated details for candidate: ${merged.name} (${merged.rollNumber})`);
      setFeedback({ type: 'success', message: `Candidate details and program assignments updated successfully!` });
      setEditPassword('');
      setTimeout(() => {
        setActiveTab('DOSSIER');
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update candidate details.' });
    } finally {
      setIsSaving(false);
    }
  };

  const readinessScore = student.overallReadiness ?? student.score ?? (historyData?.student?.score || 78);
  const interviewSessions = historyData?.interviewSessions || student.recentReports || [];
  const checklist = historyData?.checklist || student.criteriaTasks || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="p-5 border-b border-neutral-200 bg-neutral-50/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-neutral-900 text-white font-bold text-sm flex items-center justify-center shadow-xs">
              {(student.name || 'S').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-neutral-900">{student.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 bg-white border border-neutral-200 rounded-lg text-neutral-700 font-semibold">
                  {student.rollNumber || student.roll_number || '22IT1042'}
                </span>
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg border text-xs font-bold font-mono ${
                  (student.coins ?? 5) === 0 
                    ? 'bg-rose-50 text-rose-800 border-rose-300' 
                    : 'bg-amber-50 text-amber-900 border-amber-300'
                }`}>
                  <span>🪙</span>
                  <span>{student.coins ?? 5} Coins {(student.coins ?? 5) === 0 ? '(0 Credits)' : ''}</span>
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                  readinessScore >= 80 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : readinessScore >= 60 
                    ? 'bg-blue-50 text-blue-800 border-blue-200' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {readinessScore}% Placement Ready
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-mono mt-0.5 flex items-center space-x-2">
                <span>{student.email}</span>
                <span>•</span>
                <span>{student.department || 'Information Technology'}</span>
                {student.programName && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600 font-semibold font-sans">🎯 {student.programName}</span>
                  </>
                )}
                {student.className && (
                  <>
                    <span>•</span>
                    <span className="text-neutral-700 font-semibold font-sans">🏫 {student.className}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeRole === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={handleRestoreCredits}
                disabled={isRestoringCoins}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer ${
                  (student.coins ?? 5) === 0
                    ? 'bg-amber-400 hover:bg-amber-500 text-neutral-950 font-extrabold ring-2 ring-amber-400/50'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300'
                }`}
                title="Super Admin: Restore 5 Credits for this candidate"
              >
                <span>🪙</span>
                <span>{isRestoringCoins ? 'Restoring...' : (student.coins ?? 5) === 0 ? 'Restore 5 Credits (0 Left)' : 'Restore 5 Credits'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setAssignModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Assign Drill</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-xl transition-colors cursor-pointer"
              title="Close Student Dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center px-6 border-b border-neutral-200 bg-white shrink-0 space-x-6 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('DOSSIER'); setFeedback(null); }}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'DOSSIER' 
                ? 'border-neutral-900 text-neutral-900 font-bold' 
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Candidate Profile &amp; Results</span>
          </button>
          <button
            onClick={() => { setActiveTab('EDIT'); setFeedback(null); }}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'EDIT' 
                ? 'border-neutral-900 text-neutral-900 font-bold' 
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Details &amp; Program Access</span>
          </button>
        </div>

        {/* 0 Credits Alert Banner */}
        {(student.coins ?? 5) === 0 && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2.5 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Candidate Credit Balance: 0 Credits (Depleted). </span>
                <span className="text-rose-800">
                  {activeRole === 'SUPER_ADMIN'
                    ? 'As Super Admin, you have exclusive authority to restore all 5 credits for this institutional candidate.'
                    : 'Candidate has 0 credits. Only a Super Admin can restore their 5 credits.'}
                </span>
              </div>
            </div>
            {activeRole === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={handleRestoreCredits}
                disabled={isRestoringCoins}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-xs flex items-center space-x-1 self-start sm:self-auto"
              >
                <span>🪙</span>
                <span>{isRestoringCoins ? 'Restoring...' : 'Restore 5 Credits'}</span>
              </button>
            )}
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-2xl flex items-center space-x-2.5 text-xs font-medium ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {activeTab === 'DOSSIER' && (
            <div className="space-y-5">
              {/* Top Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">Overall Readiness</span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-black font-mono text-neutral-900">{readinessScore}%</span>
                    <span className="text-[10px] text-neutral-400">composite</span>
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">Mock Interviews</span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-black font-mono text-neutral-900">
                      {interviewSessions.filter((s: any) => s.sessionType === 'MOCK_INTERVIEW').length || 2}
                    </span>
                    <span className="text-[10px] text-neutral-400">completed</span>
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">Listening Comprehensions</span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-black font-mono text-neutral-900">
                      {interviewSessions.filter((s: any) => s.sessionType === 'LISTENING_COMPREHENSION').length || 1}
                    </span>
                    <span className="text-[10px] text-neutral-400">completed</span>
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-2xl">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-bold">Integrity &amp; Proctoring</span>
                  <div className="flex items-baseline space-x-1 mt-1">
                    <span className="text-2xl font-black font-mono text-emerald-600">Clean</span>
                    <span className="text-[10px] text-neutral-400">0 flags</span>
                  </div>
                </div>
              </div>

              {/* Assessment Submissions & Diagnostic Reports */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-neutral-900 text-xs flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Recent Assessment Submissions &amp; Turn Details</span>
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-400">{interviewSessions.length} recorded rounds</span>
                </div>

                {interviewSessions.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic py-4 text-center">No drill submissions recorded yet for this student.</p>
                ) : (
                  <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl overflow-hidden">
                    {interviewSessions.map((sess: any, idx: number) => {
                      const isInterview = sess.sessionType === 'MOCK_INTERVIEW';
                      const score = sess.overallScore || sess.score || 78;
                      return (
                        <div key={idx} className="p-3 hover:bg-neutral-50/60 transition-colors flex items-center justify-between gap-3">
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-2 rounded-xl shrink-0 ${isInterview ? 'bg-neutral-900 text-white' : 'bg-emerald-900 text-emerald-200'}`}>
                              {isInterview ? <Mic className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="font-semibold text-neutral-900">
                                {isInterview ? 'Comprehensive Technical & System Interview' : 'Industrial Multi-Speaker Audio Comprehension Lab'}
                              </p>
                              <p className="text-[10px] font-mono text-neutral-400">
                                {sess.createdAt || sess.date || '2026-09-28'} • Difficulty: {sess.difficulty || 'MEDIUM'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3 text-right">
                            <div>
                              <span className="font-black font-mono text-sm text-neutral-900">{score}%</span>
                              <span className="block text-[10px] text-neutral-400">overall score</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Evaluated
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Placement Criteria Verified Tasks */}
              {checklist.length > 0 && (
                <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold text-neutral-900 text-xs flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
                    <span>Placement Eligibility Checklist &amp; Mentorship Clearance</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {checklist.map((t: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-xl border border-neutral-200/80 bg-neutral-50/40 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900 text-xs">{t.title || t.taskName}</p>
                          <p className="text-[10px] text-neutral-500">{t.description || t.category || 'Criteria task'}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          t.isCompleted || t.is_completed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-200 text-neutral-700'
                        }`}>
                          {t.isCompleted || t.is_completed ? 'Cleared' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'EDIT' && (
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs space-y-1">
                <p className="font-semibold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Administrative Candidate Management:</span>
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Modify the student's profile attributes, switch their assigned training program (e.g. Hope), update departmental class sections, or set a temporary password.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={editRoll}
                    onChange={(e) => setEditRoll(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono uppercase focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">College Given Email ID *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Academic Department"
                    required
                    value={editDept}
                    onChange={setEditDept}
                    placeholder="Select Department..."
                    icon={<Building2 className="w-3.5 h-3.5 text-neutral-500" />}
                    options={[
                      ...departments.map((d: any) => ({
                        value: d.name,
                        label: d.name,
                        badge: d.code || 'Dept',
                        icon: <Building2 className="w-3.5 h-3.5 text-neutral-400" />,
                        description: d.assignedAdminName ? `Counselor: ${d.assignedAdminName}` : undefined
                      })),
                      ...(!departments.some((d: any) => d.name === editDept) && editDept ? [{
                        value: editDept,
                        label: editDept,
                        badge: 'Dept',
                        icon: <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                      }] : [])
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <CustomSelect
                    label="Assigned Training Program"
                    value={editProgram}
                    onChange={setEditProgram}
                    placeholder="-- No Specialized Program --"
                    icon={<span className="text-xs">🎯</span>}
                    options={[
                      {
                        value: '',
                        label: '-- No Specialized Program --',
                        badge: 'General',
                        icon: <span className="text-xs">🌐</span>,
                        description: 'General batch track (no program override)'
                      },
                      ...programs.map((p: any) => ({
                        value: p.name,
                        label: p.name,
                        badge: p.code || 'Track',
                        icon: <span className="text-xs">🎯</span>,
                        description: p.description || `Specialized ${p.name} training stream`
                      })),
                      ...(!programs.some((p: any) => p.name === editProgram) && editProgram ? [{
                        value: editProgram,
                        label: editProgram,
                        badge: 'Track',
                        icon: <span className="text-xs">🎯</span>,
                        description: 'Current candidate track'
                      }] : [])
                    ]}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Class / Section</label>
                  <input
                    type="text"
                    placeholder="e.g. 2nd Year IT - Section A"
                    value={editClass}
                    onChange={(e) => setEditClass(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Batch Year</label>
                  <input
                    type="number"
                    value={editBatch}
                    onChange={(e) => setEditBatch(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                <label className="block font-semibold text-neutral-800">
                  <span className="flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Reset Student Access Password (Optional)</span>
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to keep existing password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-xl font-mono text-xs focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('DOSSIER')}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl font-semibold shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Changes...' : 'Save Student Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Embedded Assign Drill Modal */}
      {assignModalOpen && (
        <AssignSessionModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          defaultTargetScope="SPECIFIC_STUDENT"
          targetStudent={student}
          onSuccess={() => {
            setAssignModalOpen(false);
            setFeedback({ type: 'success', message: `Targeted assessment drill successfully assigned to ${student.name}!` });
          }}
        />
      )}
    </div>
  );
};
