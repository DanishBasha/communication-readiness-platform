import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { InterviewAssignment, DynamicProgram, DepartmentClass, DepartmentStaffMember } from '../../types';
import { MOCK_DEPARTMENT_CLASSES } from '../../data/mockData';
import { AssignSessionModal } from '../common/AssignSessionModal';
import { DepartmentClassesManager } from '../common/DepartmentClassesManager';
import { StudentDirectoryTable } from '../common/StudentDirectoryTable';
import { 
  Building2, 
  Layers, 
  Plus, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  Trash2, 
  Eye, 
  Mic, 
  Headphones, 
  Search,
  BookOpen,
  Filter,
  Check,
  UserPlus,
  UserCheck,
  FileSpreadsheet,
  Upload,
  Download,
  ShieldCheck,
  AlertCircle,
  X,
  ExternalLink
} from 'lucide-react';

export const DepartmentAdminPortal: React.FC = () => {
  const { 
    currentUser, 
    assignments, 
    openStudentDashboard,
    inspectedStudent,
    setInspectedStudent
  } = useApp();

  const activeDeptName = currentUser?.department || 'Information Technology';

  const [activeTab, setActiveTab] = useState<'ASSIGNMENTS' | 'CLASSES' | 'STAFF' | 'STUDENTS'>('ASSIGNMENTS');
  const [activeClassFilter, setActiveClassFilter] = useState<string>('ALL');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Department Staff Directory State
  const [staffList, setStaffList] = useState<DepartmentStaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Add Single Staff Modal
  const [createStaffModalOpen, setCreateStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffDesignation, setNewStaffDesignation] = useState('Assistant Professor');
  const [newStaffId, setNewStaffId] = useState('');

  // Bulk Staff CSV Modal
  const [bulkStaffModalOpen, setBulkStaffModalOpen] = useState(false);
  const [bulkStaffCsvText, setBulkStaffCsvText] = useState('');
  const [bulkStaffFileName, setBulkStaffFileName] = useState('');
  const [bulkStaffError, setBulkStaffError] = useState<string | null>(null);

  // Delete Staff Modal
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState<DepartmentStaffMember | null>(null);

  // Load Department Staff
  const loadStaff = async () => {
    try {
      setStaffLoading(true);
      const data = await api.college.getDepartmentStaff(activeDeptName, currentUser?.collegeId);
      setStaffList(data || []);
    } catch (err) {
      console.warn('Failed to load department staff:', err);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [activeDeptName]);

  // Load department classes
  const [classes, setClasses] = useState<DepartmentClass[]>(() => {
    try {
      const saved = localStorage.getItem('crp_department_classes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return MOCK_DEPARTMENT_CLASSES;
  });

  // Filter classes belonging to this specific department
  const departmentClasses = classes.filter(c => 
    !activeDeptName || 
    c.department.toLowerCase().includes(activeDeptName.toLowerCase()) || 
    activeDeptName.toLowerCase().includes(c.department.toLowerCase())
  );

  // Load all students
  const [students, setStudents] = useState<any[]>([]);
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const data = await api.admin.getStudents();
        setStudents(data || []);
      } catch (err) {
        console.warn('Failed to load students for department portal:', err);
      }
    };
    loadStudents();
  }, []);

  // Filter students strictly scoped to this specific department (and active class if selected)
  const displayedStudents = React.useMemo(() => {
    return students.filter(s => {
      const deptMatches = s.department && (
        s.department.toLowerCase().includes(activeDeptName.toLowerCase()) ||
        activeDeptName.toLowerCase().includes(s.department.toLowerCase())
      );
      if (!deptMatches) return false;

      if (activeClassFilter !== 'ALL') {
        return s.className && s.className.toLowerCase() === activeClassFilter.toLowerCase();
      }
      return true;
    });
  }, [students, activeDeptName, activeClassFilter]);

  // Filter assignments strictly scoped to this specific department (and active class if selected)
  const displayedAssignments = React.useMemo(() => {
    return assignments.filter(asg => {
      // Must be targeted to this department or college-wide
      const deptMatches = asg.targetScope === 'ALL_STUDENTS' || 
        (asg.targetDepartments && asg.targetDepartments.some(d => d.toLowerCase().includes(activeDeptName.toLowerCase()))) ||
        (asg.targetDepartment && asg.targetDepartment.toLowerCase().includes(activeDeptName.toLowerCase())) ||
        (asg.targetDomainOrTrack && asg.targetDomainOrTrack.toLowerCase().includes(activeDeptName.toLowerCase()));

      if (!deptMatches) return false;

      // If active class filter is set
      if (activeClassFilter !== 'ALL') {
        if (asg.targetClassNames && asg.targetClassNames.length > 0) {
          return asg.targetClassNames.some(cn => cn.toLowerCase() === activeClassFilter.toLowerCase());
        }
        if (asg.targetClassName) {
          return asg.targetClassName.toLowerCase().includes(activeClassFilter.toLowerCase());
        }
      }
      return true;
    });
  }, [assignments, activeDeptName, activeClassFilter]);

  // Filter staff by search query
  const displayedStaff = React.useMemo(() => {
    if (!staffSearchQuery.trim()) return staffList;
    const q = staffSearchQuery.trim().toLowerCase();
    return staffList.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.designation.toLowerCase().includes(q) ||
      (s.staffId && s.staffId.toLowerCase().includes(q))
    );
  }, [staffList, staffSearchQuery]);

  const activeStaffCount = staffList.filter(s => s.status === 'ACTIVE').length;
  const counselorAssignedCount = staffList.filter(s => s.assignedClasses && s.assignedClasses.length > 0).length;
  const unassignedStaffCount = staffList.filter(s => !s.assignedClasses || s.assignedClasses.length === 0).length;

  // Single Staff Creation
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      setFeedback({ type: 'error', message: 'Staff name and official email are required.' });
      return;
    }

    try {
      const res = await api.college.addDepartmentStaff({
        name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        designation: newStaffDesignation.trim() || 'Assistant Professor',
        staffId: newStaffId.trim() || undefined,
        department: activeDeptName,
        collegeId: currentUser?.collegeId || 'col-1'
      });

      setCreateStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffDesignation('Assistant Professor');
      setNewStaffId('');
      await loadStaff();

      setFeedback({ type: 'success', message: `Staff member "${res.staff.name}" added to ${activeDeptName}!` });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to add staff member.' });
    }
  };

  // Bulk Staff Upload via CSV
  const handleBulkStaffUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStaffCsvText.trim()) {
      setBulkStaffError('Please provide CSV content or upload a valid .csv file.');
      return;
    }

    try {
      const res = await api.college.bulkAddDepartmentStaff(
        activeDeptName,
        currentUser?.collegeId || 'col-1',
        bulkStaffCsvText
      );

      setBulkStaffModalOpen(false);
      setBulkStaffCsvText('');
      setBulkStaffFileName('');
      setBulkStaffError(null);
      await loadStaff();

      setFeedback({ 
        type: 'success', 
        message: `Successfully onboarded ${res.count} faculty staff member${res.count === 1 ? '' : 's'} into ${activeDeptName}!` 
      });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setBulkStaffError(err?.message || 'Failed to process bulk CSV.');
    }
  };

  const handleDownloadStaffSampleCsv = () => {
    const csvContent = 
`Staff Name,Email,Designation,Staff ID
Dr. Ananya Sharma,ananya.sharma@college.edu,Assistant Professor,IT-FAC-015
Prof. K. Ramesh,ramesh.k@college.edu,Associate Professor,IT-FAC-016
Dr. M. Soundararajan,soundar.m@college.edu,Professor,IT-FAC-017`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDeptName.replace(/\s+/g, '_')}_Staff_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      await api.college.removeDepartmentStaff(staffId);
      setDeleteConfirmStaff(null);
      await loadStaff();
      setFeedback({ type: 'success', message: 'Staff member removed from department directory.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to remove staff member.' });
    }
  };

  const avgReadiness = displayedStudents.length > 0
    ? Math.round(displayedStudents.reduce((acc, s) => acc + (s.score || s.overallReadiness || 75), 0) / displayedStudents.length)
    : 78;

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
              {activeDeptName}
            </h1>
            <span className="px-2.5 py-1 text-xs font-bold bg-purple-950 text-purple-300 rounded-full border border-purple-800 flex items-center space-x-1.5">
              <Building2 className="w-3 h-3 text-purple-400" />
              <span>Department Administration</span>
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-neutral-100 text-neutral-700 rounded-lg border border-neutral-200">
              {currentUser?.collegeName ? currentUser.collegeName.split(' ')[0] : 'Engineering College'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Assign Assessment</span>
          </button>
        </div>
      </div>

      {/* Class / Section Filter Bar (Allows changing classes by selection) */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-neutral-900">Filter Department by Class / Section:</span>
            <span className="text-[11px] text-neutral-500 font-mono">
              ({activeClassFilter === 'ALL' ? 'Showing All Classes' : `Active: ${activeClassFilter}`})
            </span>
          </div>

          <span className="text-[11px] text-neutral-400">
            {departmentClasses.length} {departmentClasses.length === 1 ? 'class section' : 'class sections'} configured
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setActiveClassFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeClassFilter === 'ALL'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeClassFilter === 'ALL' ? 'bg-emerald-400' : 'bg-neutral-300'}`} />
            <span>🏢 All Department Classes ({displayedStudents.length} Students)</span>
          </button>

          {departmentClasses.map((cls) => {
            const isSelected = activeClassFilter === cls.name;
            const classStudentCount = students.filter(s => s.className?.toLowerCase() === cls.name.toLowerCase()).length;
            return (
              <button
                key={cls.id || cls.name}
                type="button"
                onClick={() => setActiveClassFilter(cls.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-purple-950 text-white border-purple-900 shadow-xs ring-2 ring-purple-900/20'
                    : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-neutral-300'}`} />
                <span>{cls.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isSelected ? 'bg-purple-800 text-purple-200' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {classStudentCount > 0 ? `${classStudentCount} Stu` : `Batch ${cls.batchYear}`}
                </span>
                {cls.facultyInCharge && (
                  <span className={`text-[10px] hidden md:inline ${isSelected ? 'text-purple-300' : 'text-neutral-400'}`}>
                    · {cls.facultyInCharge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Students Tracked</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-neutral-900">{displayedStudents.length}</p>
          <p className="text-[11px] text-neutral-500 mt-1">
            {activeClassFilter === 'ALL' ? 'Entire Department' : activeClassFilter}
          </p>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Classes &amp; Sections</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-neutral-900">{departmentClasses.length}</p>
          <p className="text-[11px] text-neutral-500 mt-1">Configured with counsellors</p>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Avg Readiness</span>
            <GraduationCap className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-neutral-900">{avgReadiness}%</p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Target benchmark: 75%</p>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Practice Drills</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-neutral-900">{displayedAssignments.length}</p>
          <p className="text-[11px] text-neutral-500 mt-1">Active assessments</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-neutral-200 pb-px">
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
          <span>Department Assessments ({displayedAssignments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CLASSES')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'CLASSES'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Classes &amp; Counsellors ({departmentClasses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('STAFF')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'STAFF'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Faculty &amp; Staff Directory ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('STUDENTS')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 ${
            activeTab === 'STUDENTS'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Department Students ({displayedStudents.length})</span>
        </button>
      </div>

      {/* TAB 1: Department Assessments */}
      {activeTab === 'ASSIGNMENTS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Department Assessments &amp; Practice Drills</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Assign New Drill</span>
            </button>
          </div>

          {displayedAssignments.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 border border-dashed border-neutral-200 rounded-xl space-y-2">
              <Layers className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-semibold text-neutral-700">No practice drills dispatched for this department yet.</p>
              <p className="text-xs text-neutral-500">Click "Assign New Drill" above to dispatch a mock interview or listening test to your department.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
                  <tr>
                    <th className="py-3 px-4 font-medium">FORMAT</th>
                    <th className="py-3 px-4 font-medium">ASSIGNMENT TITLE</th>
                    <th className="py-3 px-4 font-medium">TARGET BATCH / CLASSES</th>
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
                            {asg.targetClassNames ? asg.targetClassNames.join(', ') : (asg.targetClassName || asg.targetDomainOrTrack || asg.targetScope)}
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
      )}

      {/* TAB 2: Classes & Counsellors */}
      {activeTab === 'CLASSES' && (
        <div className="space-y-4">
          <DepartmentClassesManager 
            departmentFilter={activeDeptName}
            collegeId={currentUser?.collegeId}
            onStudentsAssigned={() => {
              setFeedback({ type: 'success', message: 'Class changes saved.' });
              setTimeout(() => setFeedback(null), 3000);
            }}
          />
        </div>
      )}

      {/* TAB 3: Faculty & Staff Directory */}
      {activeTab === 'STAFF' && (
        <div className="space-y-6">
          {/* Department Faculty Pool Header Banner */}
          <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-950 text-purple-300 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">{activeDeptName} Faculty &amp; Staff Pool</h3>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBulkStaffCsvText('');
                  setBulkStaffFileName('');
                  setBulkStaffError(null);
                  setBulkStaffModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Bulk onboard staff via CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>Bulk Upload Staff (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateStaffModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-purple-300" />
                <span>+ Add Staff Member</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-neutral-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Total Department Staff</span>
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold font-mono text-neutral-900">{staffList.length}</p>
              <p className="text-[11px] text-neutral-500 mt-1">Exclusive to {activeDeptName}</p>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-neutral-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Active Accounts</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold font-mono text-neutral-900">{activeStaffCount}</p>
              <p className="text-[11px] text-emerald-700 mt-1">Activated with passwords</p>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-neutral-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Class Counsellors</span>
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold font-mono text-neutral-900">{counselorAssignedCount}</p>
              <p className="text-[11px] text-blue-700 mt-1">Leading class sections</p>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-neutral-400 mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Unassigned Staff</span>
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold font-mono text-neutral-900">{unassignedStaffCount}</p>
              <p className="text-[11px] text-amber-700 mt-1">Will see &quot;coming soon&quot; page</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff by name, email, designation, or ID..."
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            {staffSearchQuery && (
              <button
                type="button"
                onClick={() => setStaffSearchQuery('')}
                className="text-xs text-neutral-500 hover:text-neutral-800 font-medium px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Staff Roster Table */}
          <div className="bg-white border border-neutral-200/90 rounded-2xl shadow-xs overflow-hidden">
            {displayedStaff.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-800">
                  {staffSearchQuery ? 'No staff matched your query' : `No faculty registered in ${activeDeptName} yet`}
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  {staffSearchQuery ? 'Try clearing the search or checking spelling.' : 'Add your first faculty member or bulk upload staff using a CSV file.'}
                </p>
                {!staffSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCreateStaffModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add First Staff Member</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-neutral-500 font-medium">
                      <th className="py-3 px-5">Staff Member</th>
                      <th className="py-3 px-5">Designation</th>
                      <th className="py-3 px-5">Class Counsellor Assignment</th>
                      <th className="py-3 px-5">Account Status</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {displayedStaff.map((staff) => {
                      const isAssigned = staff.assignedClasses && staff.assignedClasses.length > 0;
                      return (
                        <tr key={staff.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                                {staff.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-neutral-900">{staff.name}</p>
                                <p className="text-[11px] text-neutral-500 font-mono">{staff.email}</p>
                                {staff.staffId && (
                                  <span className="text-[10px] text-neutral-400 font-mono">ID: {staff.staffId}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                              {staff.designation}
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            {isAssigned ? (
                              <div className="flex flex-wrap gap-1">
                                {staff.assignedClasses?.map((clsName) => (
                                  <span
                                    key={clsName}
                                    className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  >
                                    <GraduationCap className="w-3 h-3 text-emerald-600" />
                                    <span>{clsName}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                <span>Unassigned (Will see holding screen)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5">
                            {staff.status === 'ACTIVE' ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                                <AlertCircle className="w-3 h-3" />
                                <span>Pending Activation</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmStaff(staff)}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Remove staff member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
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

      {/* TAB 4: Department Students */}
      {activeTab === 'STUDENTS' && (
        <div className="space-y-4">
          <StudentDirectoryTable
            students={displayedStudents}
            onSelectStudent={(stu) => setInspectedStudent(stu)}
            title={`${activeDeptName} Candidates`}
            subtitle={activeClassFilter === 'ALL' ? 'All enrolled students across all departmental classes' : `Enrolled in ${activeClassFilter}`}
          />
        </div>
      )}

      {/* ADD SINGLE STAFF MODAL */}
      {createStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-950 text-purple-300 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Add Faculty Member</h3>
                  <p className="text-xs text-neutral-500">Scoped strictly to {activeDeptName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateStaffModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ananya Sharma"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Official Email (Login ID) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ananya.sharma@college.edu"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <p className="text-[11px] text-neutral-500 mt-1">An onboarding activation link will be generated for this email.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Designation
                  </label>
                  <select
                    value={newStaffDesignation}
                    onChange={(e) => setNewStaffDesignation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 text-neutral-800"
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Senior Lecturer">Senior Lecturer</option>
                    <option value="Lab Instructor">Lab Instructor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Staff ID / Employee No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IT-FAC-019"
                    value={newStaffId}
                    onChange={(e) => setNewStaffId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/70 text-[11px] text-purple-900 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  This staff member belongs exclusively to <strong>{activeDeptName}</strong>. You can subsequently assign them as Class Counsellor in the Classes tab.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateStaffModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-black rounded-xl transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Create &amp; Generate Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD STAFF CSV MODAL */}
      {bulkStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Bulk Upload Faculty &amp; Staff (CSV)</h3>
                  <p className="text-xs text-neutral-500">Import multiple department staff at once into {activeDeptName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkStaffModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkStaffUpload} className="space-y-4">
              {/* Template Download Box */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-800">CSV Template Format</p>
                  <p className="text-[11px] text-neutral-500 font-mono">Staff Name, Email, Designation, Staff ID</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadStaffSampleCsv}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Download Sample</span>
                </button>
              </div>

              {/* File Upload Trigger */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Upload Staff CSV File (.csv)
                </label>
                <label className="border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-neutral-50">
                  <Upload className="w-5 h-5 text-neutral-400 mb-1" />
                  <span className="text-xs font-medium text-neutral-700">
                    {bulkStaffFileName ? bulkStaffFileName : 'Click to browse or drop your CSV here'}
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBulkStaffFileName(file.name);
                      setBulkStaffError(null);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        setBulkStaffCsvText(content || '');
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>

              {/* Or paste directly */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Or Paste CSV Data Directly
                </label>
                <textarea
                  rows={4}
                  value={bulkStaffCsvText}
                  onChange={(e) => setBulkStaffCsvText(e.target.value)}
                  placeholder={`Staff Name, Email, Designation, Staff ID\nDr. Ananya Sharma, ananya.sharma@college.edu, Assistant Professor, IT-FAC-015`}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              {bulkStaffError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{bulkStaffError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setBulkStaffModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-black rounded-xl transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Onboard All Staff</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Remove Staff Member</h3>
                <p className="text-xs text-neutral-500">Confirm removal from {activeDeptName}</p>
              </div>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed">
              Are you sure you want to remove <strong>&quot;{deleteConfirmStaff.name}&quot;</strong> ({deleteConfirmStaff.email}) from {activeDeptName}? Their login access will be revoked.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmStaff(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteStaff(deleteConfirmStaff.id)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Staff</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Session Modal (strictly locked to this department, with interactive class selection) */}
      <AssignSessionModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        defaultRole="DEPARTMENT_ADMIN"
        lockDepartmentScope={true}
        defaultDepartment={activeDeptName}
        defaultClassName={activeClassFilter !== 'ALL' ? activeClassFilter : undefined}
        onSuccess={(newAsg) => {
          setIsAssignModalOpen(false);
          setFeedback({ type: 'success', message: `Assessment "${newAsg.title}" dispatched successfully!` });
          setTimeout(() => setFeedback(null), 4000);
        }}
      />

    </div>
  );
};
