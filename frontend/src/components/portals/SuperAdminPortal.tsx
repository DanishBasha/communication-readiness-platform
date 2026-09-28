import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { 
  DynamicProgram, 
  DynamicDepartment, 
  AdminPermission, 
  TrainerTenure, 
  PendingInvite,
  College 
} from '../../types';
import { ADMIN_PERMISSION_LABELS } from '../../data/mockData';
import { 
  Building2, 
  Plus, 
  Send, 
  Copy, 
  CheckCircle2, 
  Clock, 
  Users, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  AlertCircle,
  X,
  Search,
  Upload,
  Download,
  Trash2,
  Edit2,
  Eye,
  Briefcase,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Lock,
  ExternalLink,
  Mic,
  Headphones
} from 'lucide-react';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { AssignSessionModal } from '../common/AssignSessionModal';

export const SuperAdminPortal: React.FC = () => {
  const { currentUser } = useApp();

  const [activeTab, setActiveTab] = useState<'PROGRAMS' | 'DEPARTMENTS' | 'STUDENTS' | 'TRAINERS' | 'ADMINS'>('PROGRAMS');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [collegeDetails, setCollegeDetails] = useState<College | null>(null);
  const [programs, setPrograms] = useState<DynamicProgram[]>([]);
  const [departments, setDepartments] = useState<DynamicDepartment[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<TrainerTenure[]>([]);
  const [adminInvites, setAdminInvites] = useState<PendingInvite[]>([]);

  // Search & Filter
  const [studentSearch, setStudentSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterProgram, setFilterProgram] = useState('ALL');

  // Modals
  const [createProgramModal, setCreateProgramModal] = useState(false);
  const [editProgramModal, setEditProgramModal] = useState(false);
  const [selectedProgramToEdit, setSelectedProgramToEdit] = useState<DynamicProgram | null>(null);
  const [safeguardModal, setSafeguardModal] = useState<{ isOpen: boolean; action: 'EDIT' | 'DELETE'; program: DynamicProgram | null }>({ isOpen: false, action: 'EDIT', program: null });
  const [safeguardInput, setSafeguardInput] = useState('');

  const [createDeptModal, setCreateDeptModal] = useState(false);
  const [bulkDeptAdminModal, setBulkDeptAdminModal] = useState(false);
  const [bulkIntakeModal, setBulkIntakeModal] = useState(false);
  const [bulkScrutinyModal, setBulkScrutinyModal] = useState(false);
  const [onboardTrainerModal, setOnboardTrainerModal] = useState(false);
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);

  // Session Assignment Modal state (direct program & department drill assignment)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetScope, setAssignTargetScope] = useState<'ALL_STUDENTS' | 'PROGRAM' | 'DEPARTMENT' | 'SPECIFIC_STUDENT'>('PROGRAM');
  const [assignProgramName, setAssignProgramName] = useState('');
  const [assignDepartment, setAssignDepartment] = useState('');

  // Invitation link copy simulation
  const [activeInviteUrl, setActiveInviteUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Create Program Form state
  const [progName, setProgName] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [progHasSub, setProgHasSub] = useState(true);
  const [progSubInput, setProgSubInput] = useState('');
  const [progSubList, setProgSubList] = useState<string[]>(['Elite Track', 'Non-Elite Core Track']);
  const [progAdminFirstName, setProgAdminFirstName] = useState('');
  const [progAdminLastName, setProgAdminLastName] = useState('');
  const [progAdminEmail, setProgAdminEmail] = useState('');
  const [progPermissions, setProgPermissions] = useState<AdminPermission[]>([
    'CAN_VIEW_STUDENT_PROGRESS',
    'CAN_ASSIGN_INTERVIEWS',
    'CAN_ASSIGN_LISTENING',
    'CAN_ASSIGN_TRAINERS',
    'CAN_MANAGE_STUDENTS'
  ]);
  const [progDelegateTargets, setProgDelegateTargets] = useState<string[]>([]);
  const [progCommonTrainer, setProgCommonTrainer] = useState(true);

  // Department Form state
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptAdminName, setDeptAdminName] = useState('');
  const [deptAdminEmail, setDeptAdminEmail] = useState('');

  // Trainer Form state
  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [trainerCompany, setTrainerCompany] = useState('');
  const [trainerDomain, setTrainerDomain] = useState('System Design & Concurrency');
  const [trainerIsCommon, setTrainerIsCommon] = useState(true);
  const [trainerSelectedProgs, setTrainerSelectedProgs] = useState<string[]>([]);

  // CSV text states
  const [csvIntakeText, setCsvIntakeText] = useState('');
  const [csvScrutinyText, setCsvScrutinyText] = useState('');
  const [csvDeptAdminText, setCsvDeptAdminText] = useState('');

  const collegeId = currentUser?.collegeId || 'col-1';

  const loadData = async () => {
    try {
      setLoading(true);
      const [col, progs, depts, stu, tr, invs] = await Promise.all([
        api.college.getDetails(collegeId),
        api.college.getPrograms(collegeId),
        api.college.getDepartments(collegeId),
        api.admin.getStudents(),
        api.admin.getTrainerTenures(),
        api.invites.getAll()
      ]);
      setCollegeDetails(col);
      setPrograms(progs);
      setDepartments(depts);
      setStudents(stu);
      setTrainers(tr);
      setAdminInvites(invs.filter(i => i.role === 'PROGRAM_ADMIN'));
    } catch (err: any) {
      console.error('Error loading Super Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [collegeId]);

  // Sub-program chip adder
  const handleAddSubProgram = () => {
    if (!progSubInput.trim()) return;
    if (!progSubList.includes(progSubInput.trim())) {
      setProgSubList([...progSubList, progSubInput.trim()]);
    }
    setProgSubInput('');
  };

  const handleRemoveSubProgram = (sub: string) => {
    setProgSubList(progSubList.filter(s => s !== sub));
  };

  const togglePermission = (perm: AdminPermission) => {
    if (progPermissions.includes(perm)) {
      setProgPermissions(progPermissions.filter(p => p !== perm));
    } else {
      setProgPermissions([...progPermissions, perm]);
    }
  };

  // Program Creation
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progName.trim() || !progCode.trim()) {
      setFeedback({ type: 'error', message: 'Program name and code are required.' });
      return;
    }
    try {
      const newProg = await api.college.createProgram(collegeId, {
        collegeId,
        name: progName.trim(),
        code: progCode.trim().toUpperCase(),
        description: progDesc.trim(),
        hasSubPrograms: progHasSub,
        subPrograms: progHasSub ? progSubList : [],
        assignedAdminEmail: progAdminEmail.trim() || undefined,
        assignedAdminName: progAdminFirstName.trim() ? `${progAdminFirstName} ${progAdminLastName}`.trim() : undefined,
        adminPermissions: progPermissions,
        canAssignAdminsToPrograms: progDelegateTargets,
        isCommonTrainerAllowed: progCommonTrainer
      });

      // If program admin email provided, invite them
      if (progAdminEmail.trim() && progAdminFirstName.trim()) {
        const inviteRes = await api.college.inviteProgramAdmin(collegeId, {
          firstName: progAdminFirstName.trim(),
          lastName: progAdminLastName.trim(),
          email: progAdminEmail.trim(),
          programId: newProg.id,
          permissions: progPermissions,
          canAssignAdminsToPrograms: progDelegateTargets
        });
        setActiveInviteUrl(inviteRes.inviteUrl);
      }

      setFeedback({ type: 'success', message: `Training Program "${newProg.name}" created successfully!` });
      setCreateProgramModal(false);
      resetProgramForm();
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to create program.' });
    }
  };

  const resetProgramForm = () => {
    setProgName('');
    setProgCode('');
    setProgDesc('');
    setProgHasSub(true);
    setProgSubList(['Elite Track', 'Non-Elite Core Track']);
    setProgAdminFirstName('');
    setProgAdminLastName('');
    setProgAdminEmail('');
    setProgPermissions(['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_MANAGE_STUDENTS']);
    setProgDelegateTargets([]);
  };

  // Safeguard Trigger
  const triggerSafeguard = (action: 'EDIT' | 'DELETE', program: DynamicProgram) => {
    setSafeguardModal({ isOpen: true, action, program });
    setSafeguardInput('');
  };

  const executeSafeguardAction = async () => {
    if (!safeguardModal.program) return;
    const prog = safeguardModal.program;
    try {
      if (safeguardModal.action === 'DELETE') {
        await api.college.deleteProgram(collegeId, prog.id, safeguardInput);
        setFeedback({ type: 'success', message: `Program "${prog.name}" has been deleted.` });
      } else if (safeguardModal.action === 'EDIT') {
        setSelectedProgramToEdit(prog);
        setEditProgramModal(true);
      }
      setSafeguardModal({ isOpen: false, action: 'EDIT', program: null });
      setSafeguardInput('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Safeguard verification failed.' });
    }
  };

  // Department Creation
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) return;
    try {
      const d = await api.college.createDepartment(collegeId, {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        assignedAdminEmail: deptAdminEmail.trim() || undefined,
        assignedAdminName: deptAdminName.trim() || undefined,
        adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_MANAGE_STUDENTS']
      });

      if (deptAdminEmail.trim() && deptAdminName.trim()) {
        const parts = deptAdminName.trim().split(' ');
        const inviteRes = await api.college.inviteProgramAdmin(collegeId, {
          firstName: parts[0] || 'Department',
          lastName: parts.slice(1).join(' ') || 'Admin',
          email: deptAdminEmail.trim(),
          department: d.name,
          permissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_MANAGE_STUDENTS']
        });
        setActiveInviteUrl(inviteRes.inviteUrl);
      }

      setFeedback({ type: 'success', message: `Department "${d.name}" created successfully!` });
      setCreateDeptModal(false);
      setDeptName('');
      setDeptCode('');
      setDeptAdminName('');
      setDeptAdminEmail('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to create department.' });
    }
  };

  // Bulk Student Intake
  const handleBulkIntake = async () => {
    if (!csvIntakeText.trim()) return;
    try {
      const res = await api.studentBatch.bulkEnroll(collegeId, csvIntakeText);
      setFeedback({ 
        type: 'success', 
        message: `Successfully enrolled ${res.count} students with initial credentials!` 
      });
      setBulkIntakeModal(false);
      setCsvIntakeText('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Bulk student intake failed.' });
    }
  };

  // Bulk Program Allocation Scrutiny
  const handleBulkScrutiny = async () => {
    if (!csvScrutinyText.trim()) return;
    try {
      const res = await api.studentBatch.bulkAssignPrograms(collegeId, csvScrutinyText);
      setFeedback({ 
        type: 'success', 
        message: `Successfully allocated training programs for ${res.count} students!` 
      });
      setBulkScrutinyModal(false);
      setCsvScrutinyText('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Program allocation failed.' });
    }
  };

  // Onboard Trainer
  const handleOnboardTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerName.trim() || !trainerEmail.trim() || !trainerDomain.trim()) return;
    try {
      await api.admin.onboardTrainer({
        trainerName: trainerName.trim(),
        trainerEmail: trainerEmail.trim(),
        companyOrInstitute: trainerCompany.trim() || 'Visiting Industry Expert',
        domain: trainerDomain.trim(),
        isCommonTrainer: trainerIsCommon,
        associatedProgramNames: trainerIsCommon 
          ? (programs.length > 0 ? programs.map(p => p.name) : ['All Institutional Programs']) 
          : [trainerSelectedProgs[0] || 'Core Technical Track'],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setFeedback({ type: 'success', message: `Trainer "${trainerName}" onboarded successfully!` });
      setOnboardTrainerModal(false);
      setTrainerName('');
      setTrainerEmail('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to onboard trainer.' });
    }
  };

  // Download Sample CSVs
  const downloadSampleIntakeCSV = () => {
    const content = "Full Name,Roll Number,College Email,Initial Password,Department,Batch Year\n" +
      "Aravind Kumar,22CS1084,aravind.k@college.edu,welcome@2026,Computer Science & Engineering,2026\n" +
      "Priyadharshini M,22IT1042,priya.m@college.edu,welcome@2026,Information Technology,2026\n" +
      "Karthik Raja,22EC1015,karthik.r@college.edu,welcome@2026,Electronics & Communication,2026\n" +
      "Divya Bharathi,22AI1028,divya.b@college.edu,welcome@2026,Artificial Intelligence & Data Science,2026";
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_student_intake.csv';
    a.click();
  };

  const downloadSampleScrutinyCSV = () => {
    const content = "Roll Number Or Email,Program Name,Sub Program Or Track\n" +
      "22CS1084,Technical Career Accelerator,Elite Track\n" +
      "priya.m@college.edu,Technical Career Accelerator,Standard Track\n" +
      "22EC1015,Cloud & Systems Track,Cloud Computing & DevOps\n" +
      "22AI1028,AI & Data Track,Machine Learning Engineering";
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_program_allocation.csv';
    a.click();
  };

  // Filtered Students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
      (s.rollNumber && s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase()));
    const matchesDept = filterDept === 'ALL' || s.department === filterDept;
    const matchesProg = filterProgram === 'ALL' || s.track === filterProgram || s.programName?.includes(filterProgram);
    return matchesSearch && matchesDept && matchesProg;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* College Super Admin Header */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Institutional Super Administrator</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {collegeDetails?.name || "College Management Portal"}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-2xl">
            Configure dynamic training programs, sub-programs, academic departments, and delegate granular rule sets to program admins. Ingest incoming batches via bulk CSV and allocate students after scrutiny.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setAssignTargetScope('PROGRAM');
              setAssignProgramName(programs[0]?.name || '');
              setAssignDepartment('');
              setAssignModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Assign Assessment</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateProgramModal(true)}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Training Program</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateDeptModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 rounded-xl text-xs font-medium transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Global Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Activation URL Link Alert */}
      {activeInviteUrl && (
        <div className="p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-900 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Admin Activation Link Ready (Simulated Email Dispatch)</span>
            </div>
            <button onClick={() => setActiveInviteUrl(null)} className="text-neutral-400 hover:text-neutral-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-neutral-600">
            A password setup email has been dispatched. You can copy the link below or open it immediately to test the admin registration screen:
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input 
              readOnly 
              value={activeInviteUrl} 
              className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-mono text-neutral-700 select-all" 
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(activeInviteUrl);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2500);
              }}
              className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
            <a
              href={activeInviteUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Activation Page</span>
            </a>
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-neutral-200/80 space-x-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('PROGRAMS')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'PROGRAMS' 
              ? 'border-neutral-900 text-neutral-900 font-semibold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Dynamic Programs &amp; Sub-programs ({programs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DEPARTMENTS')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'DEPARTMENTS' 
              ? 'border-neutral-900 text-neutral-900 font-semibold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments &amp; Admins ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'STUDENTS' 
              ? 'border-neutral-900 text-neutral-900 font-semibold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Intake &amp; Scrutiny ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TRAINERS')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'TRAINERS' 
              ? 'border-neutral-900 text-neutral-900 font-semibold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Domain &amp; Common Trainers ({trainers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ADMINS')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'ADMINS' 
              ? 'border-neutral-900 text-neutral-900 font-semibold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admins &amp; Rule Sets</span>
        </button>
      </div>

      {/* TAB 1: DYNAMIC PROGRAMS & SUB-PROGRAMS */}
      {activeTab === 'PROGRAMS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Custom Institutional Training Programs</h2>
              <p className="text-xs text-neutral-500">
                Define the unique training tracks for your college (e.g. Placement Accelerator with Elite/Standard tiers, specialized domain tracks, or core accelerators)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {programs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAssignTargetScope('PROGRAM');
                    setAssignProgramName(programs[0]?.name || '');
                    setAssignDepartment('');
                    setAssignModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Assign Assessment to Program</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setCreateProgramModal(true)}
                className="px-3.5 py-2 bg-neutral-900 text-white text-xs font-medium rounded-xl hover:bg-black flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Define New Program</span>
              </button>
            </div>
          </div>

          {programs.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-300 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">No Institutional Programs Configured</h3>
                <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1">
                  Your college does not have any active programs yet. Click &quot;Define New Program&quot; to configure custom training tracks and sub-programs for your students.
                </p>
              </div>
              <button
                onClick={() => setCreateProgramModal(true)}
                className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-medium rounded-xl hover:bg-black shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Define First Program</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {programs.map((prog) => (
              <div key={prog.id} className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {prog.code}
                      </span>
                      <h3 className="font-semibold text-neutral-900 text-sm mt-1">{prog.name}</h3>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => triggerSafeguard('EDIT', prog)}
                        title="Edit Program (Safeguard Protected)"
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => triggerSafeguard('DELETE', prog)}
                        title="Delete Program (Safeguard Protected)"
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {prog.description && (
                    <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
                      {prog.description}
                    </p>
                  )}

                  {/* Sub-programs */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-neutral-500 block">
                      {prog.hasSubPrograms ? `Sub-programs / Tracks (${prog.subPrograms.length}):` : 'Single Unified Track'}
                    </span>
                    {prog.hasSubPrograms && prog.subPrograms.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {prog.subPrograms.map((sub, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-neutral-50 border border-neutral-200/80 rounded-md text-[10px] font-medium text-neutral-700">
                            {sub}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">No sub-divisions</span>
                    )}
                  </div>

                  {/* Assigned Admin */}
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Assigned Program Admin</span>
                      {prog.isCommonTrainerAllowed && (
                        <span className="text-[9px] px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">Common Trainers Allowed</span>
                      )}
                    </div>
                    {prog.assignedAdminEmail ? (
                      <div>
                        <div className="font-semibold text-neutral-900">{prog.assignedAdminName || 'Lead Admin'}</div>
                        <div className="text-[11px] font-mono text-neutral-500">{prog.assignedAdminEmail}</div>
                      </div>
                    ) : (
                      <div className="text-neutral-400 italic">No admin assigned yet</div>
                    )}
                  </div>

                  {/* Granted Rule Set Badges */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">Delegated Rule Sets:</span>
                    <div className="flex flex-wrap gap-1">
                      {prog.adminPermissions?.map(p => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-medium">
                          {p.replace('CAN_', '').replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Direct Assign Button on Program Card */}
                <div className="pt-3 border-t border-neutral-100 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignTargetScope('PROGRAM');
                      setAssignProgramName(prog.name);
                      setAssignDepartment('');
                      setAssignModalOpen(true);
                    }}
                    className="w-full py-2 px-3 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Assign Assessment to {prog.name}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

      {/* TAB 2: DEPARTMENTS & ADMINS */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Academic Departments &amp; Department Admins</h2>
              <p className="text-xs text-neutral-500">
                Every college has foundational departments. When a student is not in a specialized training program, their counselor / department admin oversees them.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setAssignTargetScope('DEPARTMENT');
                  setAssignDepartment(departments[0]?.name || 'Computer Science & Engineering');
                  setAssignProgramName('');
                  setAssignModalOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Assign Assessment to Department</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkDeptAdminModal(true)}
                className="px-3.5 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 text-xs font-medium rounded-xl flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Bulk CSV Assign Admins</span>
              </button>
              <button
                type="button"
                onClick={() => setCreateDeptModal(true)}
                className="px-3.5 py-2 bg-neutral-900 text-white text-xs font-medium rounded-xl hover:bg-black flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-neutral-500 font-medium">
                  <th className="py-3.5 px-5">Department Name &amp; Code</th>
                  <th className="py-3.5 px-5">Department Admin (Counselor)</th>
                  <th className="py-3.5 px-5">Email ID (User ID)</th>
                  <th className="py-3.5 px-5">Assigned Rule Sets</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-neutral-50/50">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-neutral-900">{dept.name}</div>
                      <span className="text-[10px] font-mono text-neutral-400">{dept.code}</span>
                    </td>
                    <td className="py-3.5 px-5 text-neutral-800 font-medium">
                      {dept.assignedAdminName || 'Head of Department'}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-neutral-500">
                      {dept.assignedAdminEmail || 'admin.' + dept.code.toLowerCase() + '@college.edu'}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap gap-1">
                        {dept.adminPermissions?.map(p => (
                          <span key={p} className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-medium">
                            {p.replace('CAN_', '').replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignTargetScope('DEPARTMENT');
                          setAssignDepartment(dept.name);
                          setAssignProgramName('');
                          setAssignModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <Mic className="w-3 h-3 text-emerald-400" />
                        <span>Assign Assessment</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT INTAKE & SCRUTINY ALLOCATION */}
      {activeTab === 'STUDENTS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Student Intake &amp; Program Scrutiny</h2>
              <p className="text-xs text-neutral-500">
                Phase 1: Ingest batch Excel sheet at academic year start. Phase 2: Allocate programs/sub-programs after scrutiny.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setBulkIntakeModal(true)}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>1. Bulk Student Intake (CSV)</span>
              </button>
              <button
                onClick={() => setBulkScrutinyModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2. Allocate Programs (Scrutiny CSV)</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by student name, roll number, or email..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-neutral-500">Dept:</span>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.code}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-neutral-500">Program:</span>
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs text-neutral-700 focus:outline-none"
              >
                <option value="ALL">All Programs</option>
                {programs.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Students Roster Table */}
          <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-neutral-500 font-medium">
                  <th className="py-3.5 px-5">Candidate Name &amp; Roll No</th>
                  <th className="py-3.5 px-5">College Email</th>
                  <th className="py-3.5 px-5">Department</th>
                  <th className="py-3.5 px-5">Assigned Program &amp; Sub-Track</th>
                  <th className="py-3.5 px-5">Readiness Score</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-neutral-400">
                      No candidates match your search filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50/50">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-neutral-900">{s.name}</div>
                        <div className="text-[11px] font-mono text-neutral-400">{s.rollNumber || 'No Roll No'}</div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-neutral-600">
                        {s.email}
                      </td>
                      <td className="py-3.5 px-5 text-neutral-700">
                        {s.department}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            s.track?.includes('Elite') || s.subProgramName?.includes('Elite')
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : s.programName
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                          }`}>
                            {s.programName || s.track || 'General Department'}
                          </span>
                          {s.subProgramName && (
                            <span className="text-[10px] text-neutral-500 font-mono">
                              ({s.subProgramName})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${s.score >= 75 ? 'bg-emerald-500' : s.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${s.score || 65}%` }}
                            />
                          </div>
                          <span className="font-bold text-neutral-900">{s.score || 65}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => setInspectStudentId(s.id)}
                          className="px-2.5 py-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                        >
                          Inspect History
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DOMAIN & COMMON TRAINERS */}
      {activeTab === 'TRAINERS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Industry Trainers (Single-Program &amp; Common)</h2>
              <p className="text-xs text-neutral-500">
                Assign trainers to a dedicated program or mark them as common trainers shared across institutional programs.
              </p>
            </div>
            <button
              onClick={() => setOnboardTrainerModal(true)}
              className="px-3.5 py-2 bg-neutral-900 text-white text-xs font-medium rounded-xl hover:bg-black flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Onboard Trainer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trainers.map((t) => (
              <div key={t.id} className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-900 text-sm">{t.trainerName}</h3>
                    <p className="text-[11px] text-neutral-500 font-mono">{t.trainerEmail}</p>
                  </div>
                  {t.isCommonTrainer ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      Shared / Common
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                      Dedicated
                    </span>
                  )}
                </div>

                <div className="text-xs space-y-1">
                  <div className="text-neutral-500">Domain Drill: <span className="font-medium text-neutral-900">{t.domain}</span></div>
                  <div className="text-neutral-500">Organization: <span className="text-neutral-800">{t.companyOrInstitute}</span></div>
                  <div className="text-neutral-500">Tenure Window: <span className="font-mono text-neutral-700">{t.startDate} to {t.endDate}</span></div>
                </div>

                <div className="pt-2 border-t border-neutral-100">
                  <span className="text-[10px] text-neutral-400 block mb-1">Associated Programs:</span>
                  <div className="flex flex-wrap gap-1">
                    {(t.associatedProgramNames || ['Core Technical Track']).map((p, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-neutral-50 border border-neutral-200 rounded text-[9px] font-medium text-neutral-700">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ADMINS & RULE SETS ROSTER */}
      {activeTab === 'ADMINS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Program &amp; Department Admins Roster</h2>
              <p className="text-xs text-neutral-500">
                Review assigned administrators, their active permission rules, and dispatch password setup links.
              </p>
            </div>
          </div>

          <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-neutral-500 font-medium">
                  <th className="py-3.5 px-5">Admin Name</th>
                  <th className="py-3.5 px-5">User ID (Email)</th>
                  <th className="py-3.5 px-5">Assigned Scope</th>
                  <th className="py-3.5 px-5">Granted Rule Sets</th>
                  <th className="py-3.5 px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {programs.filter(p => p.assignedAdminEmail).map(p => (
                  <tr key={p.id} className="hover:bg-neutral-50/50">
                    <td className="py-3.5 px-5 font-semibold text-neutral-900">
                      {p.assignedAdminName || 'Lead Admin'}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-neutral-600">
                      {p.assignedAdminEmail}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-medium">
                        Program: {p.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-wrap gap-1">
                        {p.adminPermissions?.map(perm => (
                          <span key={perm} className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 text-[9px]">
                            {perm.replace('CAN_', '').replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TRAINING PROGRAM */}
      {createProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 shrink-0">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-neutral-900" />
                <h3 className="text-sm font-semibold text-neutral-900">Define Custom Training Program</h3>
              </div>
              <button onClick={() => setCreateProgramModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-neutral-700 mb-1">Program Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Technical Readiness Track"
                    value={progName}
                    onChange={(e) => setProgName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="ATRT"
                    value={progCode}
                    onChange={(e) => setProgCode(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono uppercase focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Program Description</label>
                <textarea
                  rows={2}
                  placeholder="Goals, target student cohort, or recruitment focus..."
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Sub-programs Toggle */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-neutral-900">Sub-Programs / Specialized Tracks</span>
                    <p className="text-[11px] text-neutral-500">Divide this program into sub-tiers (e.g. Elite vs Non-Elite, or specialized technology tracks)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProgHasSub(!progHasSub)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                      progHasSub ? 'bg-neutral-900' : 'bg-neutral-300'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      progHasSub ? 'translate-x-4.5' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {progHasSub && (
                  <div className="space-y-2 pt-2 border-t border-neutral-200/60">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Add track name (e.g. Elite Track, Non-Elite)..."
                        value={progSubInput}
                        onChange={(e) => setProgSubInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubProgram(); } }}
                        className="flex-1 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-neutral-900"
                      />
                      <button
                        type="button"
                        onClick={handleAddSubProgram}
                        className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium cursor-pointer"
                      >
                        Add Track
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {progSubList.map((sub) => (
                        <span key={sub} className="inline-flex items-center px-2.5 py-1 bg-white border border-neutral-200 rounded-lg text-xs font-medium text-neutral-800">
                          <span>{sub}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubProgram(sub)}
                            className="ml-1.5 text-neutral-400 hover:text-neutral-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Assign Program Admin Section */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-3">
                <div>
                  <span className="font-semibold text-blue-950">Assign Program Administrator</span>
                  <p className="text-[11px] text-blue-800/80">User ID will strictly be their email. An email invitation link will be sent to set their password.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First Name (e.g. Swaminathan)"
                    value={progAdminFirstName}
                    onChange={(e) => setProgAdminFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                  <input
                    type="text"
                    placeholder="Last Name (e.g. K)"
                    value={progAdminLastName}
                    onChange={(e) => setProgAdminLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <input
                  type="email"
                  placeholder="admin.email@college.edu (User ID)"
                  value={progAdminEmail}
                  onChange={(e) => setProgAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Granular Permissions Checklist */}
              <div className="space-y-2">
                <span className="font-semibold text-neutral-900 block">Granted Administrative Rule Sets:</span>
                <p className="text-[11px] text-neutral-500">Select which activities this program admin has authority to conduct:</p>

                <div className="space-y-2 border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
                  {Object.entries(ADMIN_PERMISSION_LABELS).map(([permKey, meta]) => {
                    const checked = progPermissions.includes(permKey as AdminPermission);
                    return (
                      <div
                        key={permKey}
                        onClick={() => togglePermission(permKey as AdminPermission)}
                        className={`p-2.5 rounded-lg border flex items-start space-x-2.5 transition-colors cursor-pointer ${
                          checked ? 'bg-white border-neutral-300 shadow-2xs' : 'border-transparent hover:bg-neutral-100/70'
                        }`}
                      >
                        <div className="mt-0.5">
                          {checked ? <CheckSquare className="w-4 h-4 text-neutral-900" /> : <Square className="w-4 h-4 text-neutral-400" />}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900">{meta.label}</div>
                          <div className="text-[11px] text-neutral-500 leading-tight">{meta.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateProgramModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium shadow-xs"
                >
                  Save &amp; Dispatch Admin Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFEGUARD VERIFICATION MODAL (EDIT / DELETE PROGRAM) */}
      {safeguardModal.isOpen && safeguardModal.program && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-red-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center space-x-2 text-red-600 font-bold">
              <Lock className="w-4 h-4" />
              <span>Institutional Safeguard Verification</span>
            </div>

            <p className="text-neutral-700 leading-relaxed">
              Modifying or deleting <strong>"{safeguardModal.program.name}"</strong> will impact currently enrolled students, mentors, and program administrators.
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-[11px]">
              To verify and proceed with this {safeguardModal.action.toLowerCase()}, type <span className="font-mono font-bold select-all">{safeguardModal.program.name}</span> or <span className="font-mono font-bold select-all">CONFIRM_MODIFY</span> below:
            </div>

            <input
              type="text"
              placeholder="Type confirmation here..."
              value={safeguardInput}
              onChange={(e) => setSafeguardInput(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:border-red-600"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSafeguardModal({ isOpen: false, action: 'EDIT', program: null })}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSafeguardAction}
                disabled={!safeguardInput.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Verify &amp; Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      {createDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-neutral-900" />
                <h3 className="font-semibold text-neutral-900 text-sm">Add Academic Department</h3>
              </div>
              <button onClick={() => setCreateDeptModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDept} className="space-y-3.5">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Information Technology"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="IT"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono uppercase focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Department Admin Name (Counselor)</label>
                <input
                  type="text"
                  placeholder="Dr. S. Meenakshi"
                  value={deptAdminName}
                  onChange={(e) => setDeptAdminName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Admin Email (User ID)</label>
                <input
                  type="email"
                  placeholder="admin.it@college.edu"
                  value={deptAdminEmail}
                  onChange={(e) => setDeptAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateDeptModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium shadow-xs"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK INTAKE STUDENTS CSV */}
      {bulkIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-neutral-900" />
                <h3 className="font-semibold text-neutral-900 text-sm">Bulk Student Intake (New Academic Batch CSV)</h3>
              </div>
              <button onClick={() => setBulkIntakeModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-neutral-600 leading-relaxed">
              When an academic year begins, paste or upload the student list CSV with the college-assigned roll numbers, emails, and initial passwords:
            </p>

            <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
              <span className="font-mono text-[11px] text-neutral-500">Format: Name, RollNumber, CollegeEmail, Password, Department, BatchYear</span>
              <button
                type="button"
                onClick={downloadSampleIntakeCSV}
                className="px-2.5 py-1 text-xs bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Sample CSV</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={csvIntakeText}
              onChange={(e) => setCsvIntakeText(e.target.value)}
              placeholder="Full Name,Roll Number,College Email,Initial Password,Department,Batch Year&#10;Aravind Kumar,22CS1084,aravind.k@college.edu,pass123,Computer Science & Engineering,2026"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-neutral-900"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkIntakeModal(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkIntake}
                disabled={!csvIntakeText.trim()}
                className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl font-medium shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Ingest Candidates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK SCRUTINY PROGRAM ALLOCATION CSV */}
      {bulkScrutinyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-neutral-900 text-sm">Post-Scrutiny Program Allocation (CSV)</h3>
              </div>
              <button onClick={() => setBulkScrutinyModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-neutral-600 leading-relaxed">
              After interview and coding scrutiny, assign selected candidates to specialized training programs (e.g. Technical Career Accelerator, Cloud Systems):
            </p>

            <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
              <span className="font-mono text-[11px] text-neutral-500">Format: RollNumberOrEmail, ProgramName, SubProgramOrTrack</span>
              <button
                type="button"
                onClick={downloadSampleScrutinyCSV}
                className="px-2.5 py-1 text-xs bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Sample CSV</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={csvScrutinyText}
              onChange={(e) => setCsvScrutinyText(e.target.value)}
              placeholder="Roll Number Or Email,Program Name,Sub Program Or Track&#10;22CS1084,Technical Career Accelerator,Elite Track&#10;karthik.r@college.edu,Cloud Systems,Cloud Computing & DevOps"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-neutral-900"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkScrutinyModal(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkScrutiny}
                disabled={!csvScrutinyText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Allocate Programs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ONBOARD TRAINER (SINGLE VS COMMON TRAINER) */}
      {onboardTrainerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-neutral-900 text-sm">Onboard Industry Domain Trainer</h3>
              </div>
              <button onClick={() => setOnboardTrainerModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOnboardTrainer} className="space-y-3.5">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Trainer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Vikramaditya Sharma"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Trainer Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="vikram.trainer@enterprise.com"
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Specialized Domain *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud Architecture & Kubernetes"
                  value={trainerDomain}
                  onChange={(e) => setTrainerDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Common Trainer Toggle */}
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-800">Is this a Common / Shared Trainer?</span>
                  <input
                    type="checkbox"
                    checked={trainerIsCommon}
                    onChange={(e) => setTrainerIsCommon(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                </div>
                <p className="text-[11px] text-neutral-500">
                  {trainerIsCommon 
                    ? 'Common trainer shared across multiple institutional programs.' 
                    : 'Dedicated to a single specific training program.'}
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOnboardTrainerModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium shadow-xs"
                >
                  Onboard Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SESSION MODAL (DIRECT PROGRAM & DEPARTMENT DISPATCH) */}
      {assignModalOpen && (
        <AssignSessionModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={(asg) => {
            setAssignModalOpen(false);
            setFeedback({
              type: 'success',
              message: `Successfully dispatched drill "${asg.title}" to ${asg.targetDomainOrTrack || asg.targetProgramName || asg.targetScope}!`
            });
          }}
          defaultRole="SUPER_ADMIN"
          defaultTargetScope={assignTargetScope}
          defaultProgramName={assignProgramName}
          defaultDepartment={assignDepartment}
          studentsList={students}
        />
      )}

      {/* STUDENT HISTORY MODAL */}
      {inspectStudentId && (
        <StudentHistoryModal
          studentId={inspectStudentId}
          onClose={() => setInspectStudentId(null)}
        />
      )}

    </div>
  );
};
