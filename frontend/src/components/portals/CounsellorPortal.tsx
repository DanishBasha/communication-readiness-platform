import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { InterviewAssignment, DepartmentClass } from '../../types';
import { MOCK_DEPARTMENT_CLASSES } from '../../data/mockData';
import { AssignSessionModal } from '../common/AssignSessionModal';
import { StudentDirectoryTable } from '../common/StudentDirectoryTable';
import { 
  Building2, 
  Layers, 
  Plus, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  Calendar, 
  Mic, 
  Headphones, 
  Sparkles, 
  Filter, 
  CheckCheck,
  TrendingUp,
  AlertTriangle,
  Award
} from 'lucide-react';

export const CounsellorPortal: React.FC = () => {
  const { 
    currentUser, 
    assignments, 
    openStudentDashboard,
    inspectedStudent,
    setInspectedStudent
  } = useApp();

  const counsellorName = currentUser?.name || 'Dr. B. Vijayalakshmi';
  const counsellorDept = currentUser?.department || 'Information Technology';
  const defaultClass = currentUser?.assignedClassName || '2nd Year IT - Section A';

  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'ASSIGNMENTS' | 'VERIFICATIONS' | 'INSIGHTS'>('STUDENTS');
  const [selectedClass, setSelectedClass] = useState<string>(defaultClass);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetAssignStudent, setTargetAssignStudent] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load classes assigned to this counsellor
  const [counsellorClasses, setCounsellorClasses] = useState<DepartmentClass[]>(() => {
    try {
      const saved = localStorage.getItem('crp_department_classes');
      if (saved) {
        const parsed: DepartmentClass[] = JSON.parse(saved);
        const matched = parsed.filter((c: any) => 
          (c.facultyInCharge && c.facultyInCharge.toLowerCase().trim() === counsellorName.toLowerCase().trim()) ||
          (c.facultyInCharge && counsellorName && (
            c.facultyInCharge.toLowerCase().includes(counsellorName.toLowerCase()) ||
            counsellorName.toLowerCase().includes(c.facultyInCharge.toLowerCase())
          )) ||
          (currentUser?.assignedClasses && currentUser.assignedClasses.includes(c.name))
        );
        if (matched.length > 0) return matched;
      }
    } catch {}

    // Mock fallback only for mock counselor Dr. B. Vijayalakshmi / counselor.it
    if (counsellorName.toLowerCase().includes('vijayalakshmi') || (currentUser?.email && currentUser.email.includes('counselor.it'))) {
      return MOCK_DEPARTMENT_CLASSES.filter(c => 
        (c.facultyInCharge && c.facultyInCharge.toLowerCase().includes('vijayalakshmi'))
      );
    }
    return [];
  });

  // Load students
  const [students, setStudents] = useState<any[]>([]);
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const data = await api.admin.getUsers({ role: 'STUDENT' }).then(users =>
          users.length > 0 ? users : api.admin.getStudents()
        ).catch(() => api.admin.getStudents());
        setStudents(data || []);
      } catch (err) {
        console.warn('Failed to load students for counsellor portal:', err);
      }
    };
    loadStudents();
  }, []);

  // Filter students strictly belonging to this counsellor's selected class
  const classStudents = React.useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => {
      const sClass = s.className || s.assignedClassName || s.departmentClass;
      return Boolean(sClass && sClass.toLowerCase().trim() === selectedClass.toLowerCase().trim());
    });
  }, [students, selectedClass]);

  // Filter assignments targeted to this class or individual students in this class
  const classAssignments = React.useMemo(() => {
    const classStudentIds = new Set(classStudents.map(s => String(s.id || s.rollNumber).toLowerCase()));
    return assignments.filter(asg => {
      if (asg.targetStudentId && classStudentIds.has(String(asg.targetStudentId).toLowerCase())) {
        return true;
      }
      if (asg.targetClassNames && asg.targetClassNames.length > 0) {
        return asg.targetClassNames.some(cn => cn.toLowerCase().trim() === selectedClass.toLowerCase().trim());
      }
      if (asg.targetClassName) {
        return asg.targetClassName.toLowerCase().trim() === selectedClass.toLowerCase().trim();
      }
      // Department-level assignment
      if (asg.targetDepartment && asg.targetDepartment.toLowerCase().includes(counsellorDept.toLowerCase())) {
        return true;
      }
      return asg.targetScope === 'ALL_STUDENTS';
    });
  }, [assignments, selectedClass, counsellorDept, classStudents]);

  // Pending verification tasks simulation
  const [verifiedTasks, setVerifiedTasks] = useState<Record<string, boolean>>({
    'task-lc-medium': true,
    'task-resume-ground': true
  });

  const handleVerifyTask = (taskId: string, studentName: string) => {
    setVerifiedTasks(prev => ({ ...prev, [taskId]: true }));
    setFeedback({ type: 'success', message: `Verified task for ${studentName} successfully!` });
    setTimeout(() => setFeedback(null), 3500);
  };

  const avgScore = classStudents.length > 0
    ? Math.round(classStudents.reduce((acc, s) => acc + (s.score || s.overallReadiness || 78), 0) / classStudents.length)
    : 81;

  const placementReadyCount = classStudents.filter(s => (s.score || s.overallReadiness || 78) >= 75).length;
  const atRiskCount = classStudents.filter(s => (s.score || s.overallReadiness || 78) < 60).length;

  // If the staff member is not currently assigned as counselor of any class, show holding splash page
  if (counsellorClasses.length === 0) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-16 space-y-8 animate-in fade-in duration-200">
        {/* Department & Staff Header */}
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold font-mono text-sm shadow-xs">
              {counsellorName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-neutral-900">{counsellorName}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                  Department Staff
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {counsellorDept} • {currentUser?.email || 'staff@college.edu'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                try {
                  const saved = localStorage.getItem('crp_department_classes');
                  if (saved) {
                    const parsed: DepartmentClass[] = JSON.parse(saved);
                    const matched = parsed.filter((c: any) => 
                      (c.facultyInCharge && c.facultyInCharge.toLowerCase().trim() === counsellorName.toLowerCase().trim()) ||
                      (c.facultyInCharge && counsellorName && (
                        c.facultyInCharge.toLowerCase().includes(counsellorName.toLowerCase()) ||
                        counsellorName.toLowerCase().includes(c.facultyInCharge.toLowerCase())
                      )) ||
                      (currentUser?.assignedClasses && currentUser.assignedClasses.includes(c.name))
                    );
                    setCounsellorClasses(matched);
                    if (matched.length > 0) setSelectedClass(matched[0].name);
                  }
                } catch {}
              }}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
            >
              Refresh Status
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('crp_active_user');
                } catch {}
                window.location.reload();
              }}
              className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Not Counselor Notification Card */}
        <div className="bg-gradient-to-b from-amber-50/70 via-white to-white border border-amber-200/80 rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-xs">
            <Users className="w-8 h-8 text-amber-600" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 uppercase tracking-wider">
              Class Assignment Status
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight pt-2">
              You are not a counselor of any class
            </h1>
            <p className="text-sm font-semibold text-amber-700">
              A new feature for staff only is coming soon...
            </p>
          </div>

          <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
            Your staff account is active for the <strong>{counsellorDept}</strong> department. 
            Currently, you are not assigned as a Class Counselor to any academic section. Once your Department Administrator assigns you to a class, your student management dashboard and drill assignment tools will appear here automatically.
          </p>

          <div className="pt-2 max-w-md mx-auto p-4 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between text-left text-xs">
            <div>
              <p className="font-semibold text-neutral-800">Need class assignment?</p>
              <p className="text-[11px] text-neutral-500">Contact your Department HOD or Administrator</p>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg">
              {counsellorDept} Admin
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center space-x-2 text-xs font-semibold shadow-xs ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              {counsellorName}
            </h1>
            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-950 text-emerald-300 rounded-full border border-emerald-800 flex items-center space-x-1.5">
              <span>👩‍🏫 Class Counsellor</span>
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-neutral-100 text-neutral-700 rounded-lg border border-neutral-200">
              {counsellorDept}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setTargetAssignStudent(null);
              setIsAssignModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Assign Drill to My Class</span>
          </button>
        </div>
      </div>

      {/* Class Section Switcher Bar */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-neutral-900">Assigned Counselling Class:</span>
            <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              {selectedClass}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500">
            {classStudents.length} Students Assigned
          </span>
        </div>

        {counsellorClasses.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
            <span className="text-[11px] font-semibold text-neutral-500 self-center mr-1">Switch Class:</span>
            {counsellorClasses.map(cls => (
              <button
                key={cls.id || cls.name}
                type="button"
                onClick={() => setSelectedClass(cls.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedClass === cls.name
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                    : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200'
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Class Students</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-neutral-900">{classStudents.length}</p>
          <p className="text-[11px] text-neutral-500 mt-1">Under your guidance</p>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Class Readiness</span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-neutral-900">{avgScore}%</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Benchmark: &gt;= 75%</p>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Placement Ready</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-neutral-900">{placementReadyCount}</p>
          <p className="text-[11px] text-neutral-500 mt-1">{Math.round((placementReadyCount / (classStudents.length || 1)) * 100)}% of class</p>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Needs Attention</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-neutral-900">{atRiskCount}</p>
          <p className="text-[11px] text-rose-700 font-medium mt-1">Scoring &lt;60%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-neutral-200 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('STUDENTS')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'STUDENTS'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Class Students ({classStudents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ASSIGNMENTS')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'ASSIGNMENTS'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Class Drills ({classAssignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('VERIFICATIONS')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'VERIFICATIONS'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          <span>Task Verifications</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INSIGHTS')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'INSIGHTS'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Communication Insights</span>
        </button>
      </div>

      {/* TAB 1: Class Students */}
      {activeTab === 'STUDENTS' && (
        <div className="space-y-4">
          <StudentDirectoryTable
            students={classStudents}
            onSelectStudent={(stu) => setInspectedStudent(stu)}
            onAssignStudent={(stu) => {
              setTargetAssignStudent(stu);
              setIsAssignModalOpen(true);
            }}
            title={`Students in ${selectedClass}`}
            subtitle={`Academic Mentee Roster under ${counsellorName}`}
          />
        </div>
      )}

      {/* TAB 2: Class Assignments */}
      {activeTab === 'ASSIGNMENTS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Class Practice Drills</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setTargetAssignStudent(null);
                setIsAssignModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Assign Practice Drill</span>
            </button>
          </div>

          {classAssignments.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 border border-dashed border-neutral-200 rounded-xl space-y-2">
              <Layers className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-semibold text-neutral-700">No active drills dispatched for your class yet.</p>
              <p className="text-xs text-neutral-500">Click "Assign Practice Drill" above to dispatch targeted speech practice to your students.</p>
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
                  {classAssignments.map((asg) => {
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
                            {asg.targetClassNames ? asg.targetClassNames.join(', ') : (asg.targetClassName || asg.targetDomainOrTrack || asg.targetScope)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-600">{asg.assignedByName}</td>
                        <td className="py-3 px-4 font-mono font-medium text-neutral-900">
                          {subsCount} / {classStudents.length}
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
      )}

      {/* TAB 3: Task Verifications */}
      {activeTab === 'VERIFICATIONS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Placement Criteria Checklist Verification</h3>
          </div>

          <div className="divide-y divide-neutral-100">
            {classStudents.slice(0, 5).map((stu, idx) => {
              const taskId = `task-verify-${stu.id || idx}`;
              const isDone = Boolean(verifiedTasks[taskId]);
              return (
                <div key={stu.id || idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-neutral-900">{stu.name}</span>
                      <span className="text-[11px] font-mono text-neutral-500">({stu.rollNumber})</span>
                      <span className="px-2 py-0.2 text-[10px] bg-purple-50 text-purple-800 rounded font-semibold border border-purple-200">
                        {selectedClass}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600">
                      Task: <strong>Solve 50 LeetCode Medium Questions &amp; Ground Resume</strong> (Proof Submitted)
                    </p>
                    <p className="text-[11px] text-neutral-400 font-mono">
                      Target Score: {stu.score || 78}% · Checklist: {stu.checklist || '3/5'} Completed
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {isDone ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified by Counsellor ✓</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleVerifyTask(taskId, stu.name)}
                        className="px-4 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl cursor-pointer transition-all shadow-2xs flex items-center space-x-1.5"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verify Task</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: Communication Insights */}
      {activeTab === 'INSIGHTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Speaking Speed &amp; Pace Distribution</span>
            </h3>
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Optimal Pace (120–150 WPM)</span>
                  <span className="text-emerald-700">68% of Class</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Slow / Hesitant Pace (&lt;110 WPM)</span>
                  <span className="text-amber-700">22% of Class</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '22%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Rapid Pace / High Fillers (&gt;160 WPM)</span>
                  <span className="text-rose-700">10% of Class</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>At-Risk Students Requiring 1-on-1 Guidance</span>
            </h3>
            <div className="divide-y divide-neutral-100 pt-1">
              {classStudents.filter(s => (s.score || 75) < 70).slice(0, 3).map((stu, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs text-neutral-900">{stu.name}</p>
                    <p className="text-[11px] font-mono text-neutral-500">{stu.rollNumber} · Score: {stu.score || 58}%</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedStudent(stu)}
                    className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Open Student Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assign Session Modal (locked to counsellor's class) */}
      <AssignSessionModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setTargetAssignStudent(null);
        }}
        defaultRole="COUNSELLOR"
        lockClassScope={true}
        defaultDepartment={counsellorDept}
        defaultClassName={selectedClass}
        targetStudent={targetAssignStudent}
        defaultTargetScope={targetAssignStudent ? 'SPECIFIC_STUDENT' : 'CLASS'}
        onSuccess={(newAsg) => {
          setIsAssignModalOpen(false);
          const studentMsg = targetAssignStudent 
            ? `Individual drill "${newAsg.title}" dispatched to ${targetAssignStudent.name}!` 
            : `Class drill "${newAsg.title}" dispatched to ${selectedClass}!`;
          setTargetAssignStudent(null);
          setFeedback({ type: 'success', message: studentMsg });
          setTimeout(() => setFeedback(null), 4000);
        }}
      />

    </div>
  );
};
