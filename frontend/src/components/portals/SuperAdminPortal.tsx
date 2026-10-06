import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { logger } from '../../services/logger';
import { 
  DynamicProgram, 
  DynamicDepartment, 
  AdminPermission, 
  College 
} from '../../types';
import { ADMIN_PERMISSION_LABELS } from '../../data/mockData';
import { 
  Building2, 
  Plus, 
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
  FileSpreadsheet, 
  Lock, 
  Mic, 
  Clock, 
  ArrowLeft, 
  Award, 
  TrendingUp, 
  UserCheck, 
  Check, 
  CheckCircle2, 
  UserPlus,
  Users,
  Calendar,
  LayoutDashboard,
  ExternalLink,
  User
} from 'lucide-react';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { AssignSessionModal } from '../common/AssignSessionModal';
import { AutoDismissAlert } from '../common/AutoDismissAlert';
import { useBackHandler } from '../../hooks/useBackHandler';
import { DatePicker } from '../common/DatePicker';
import { TimePicker } from '../common/TimePicker';
import { StudentDirectoryTable } from '../common/StudentDirectoryTable';
import { AssessmentMonitoringWidget } from '../common/AssessmentMonitoringWidget';
import { DepartmentClassesManager } from '../common/DepartmentClassesManager';
import { CustomSelect } from '../common/CustomSelect';

export const SuperAdminPortal: React.FC = () => {
  const { currentUser, assignments, viewProgramDetail, openStudentDashboard, openAdminDashboard } = useApp();

  // Tab navigation: exactly 3 active tabs
  const [activeTab, setActiveTab] = useState<'PROGRAMS' | 'DEPARTMENTS' | 'STUDENTS'>('PROGRAMS');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [collegeDetails, setCollegeDetails] = useState<College | null>(null);
  const [programs, setPrograms] = useState<DynamicProgram[]>([]);
  const [departments, setDepartments] = useState<DynamicDepartment[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Search & Filter in Student Intake
  const [studentSearch, setStudentSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterProgram, setFilterProgram] = useState('ALL');

  // Program Profile Drilldown View (replaces card view with dedicated profile page)
  const [selectedProgramProfile, setSelectedProgramProfile] = useState<{ program: DynamicProgram; subProgramName?: string } | null>(null);

  // Department Progress Modal (with black blurred background)
  const [selectedDeptForProgress, setSelectedDeptForProgress] = useState<DynamicDepartment | null>(null);

  // Modals
  const [createProgramModal, setCreateProgramModal] = useState(false);
  const [editProgramModal, setEditProgramModal] = useState(false);
  const [selectedProgramToEdit, setSelectedProgramToEdit] = useState<DynamicProgram | null>(null);
  const [safeguardDeleteModal, setSafeguardDeleteModal] = useState<{ isOpen: boolean; program: DynamicProgram | null }>({ isOpen: false, program: null });
  const [safeguardInput, setSafeguardInput] = useState('');

  const [createDeptModal, setCreateDeptModal] = useState(false);
  const [bulkDeptModal, setBulkDeptModal] = useState(false);
  const [csvDeptText, setCsvDeptText] = useState('');

  const [purgeBatchModal, setPurgeBatchModal] = useState(false);
  const [purgeBatchYear, setPurgeBatchYear] = useState<number>(2024);
  const [purgeVerificationInput, setPurgeVerificationInput] = useState('');

  const [singleStudentModal, setSingleStudentModal] = useState(false);
  const [intakeTargetBatch, setIntakeTargetBatch] = useState<number>(2028);
  const [bulkIntakeModal, setBulkIntakeModal] = useState(false);
  const [bulkScrutinyModal, setBulkScrutinyModal] = useState(false);
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);

  // Session Assignment Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetScope, setAssignTargetScope] = useState<'ALL_STUDENTS' | 'PROGRAM' | 'DEPARTMENT' | 'SPECIFIC_STUDENT'>('PROGRAM');
  const [assignProgramName, setAssignProgramName] = useState('');
  const [assignDepartment, setAssignDepartment] = useState('');
  const [targetStudentForAssign, setTargetStudentForAssign] = useState<any | null>(null);

  // Create Program Form state
  const [progName, setProgName] = useState('');
  const [progCode, setProgCode] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [progAdminFirstName, setProgAdminFirstName] = useState('');
  const [progAdminLastName, setProgAdminLastName] = useState('');
  const [progAdminEmail, setProgAdminEmail] = useState('');

  // Program Schedule & Time
  const [progStartDate, setProgStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [progEndDate, setProgEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 70);
    return d.toISOString().split('T')[0];
  });
  const [progDurationWeeks, setProgDurationWeeks] = useState(10);
  const [progStartTime, setProgStartTime] = useState('09:00');
  const [progEndTime, setProgEndTime] = useState('17:00');

  // Program Governance Rules
  const [progMinAttendance, setProgMinAttendance] = useState(80);
  const [progMinPassScore, setProgMinPassScore] = useState(75);
  const [progStrictProctoring, setProgStrictProctoring] = useState(true);
  const [progPermissions, setProgPermissions] = useState<AdminPermission[]>([
    'CAN_VIEW_STUDENT_PROGRESS',
    'CAN_ASSIGN_INTERVIEWS',
    'CAN_ASSIGN_LISTENING',
    'CAN_MANAGE_STUDENTS'
  ]);

  // Program Copy / Clone state
  const [selectedProgramToCopy, setSelectedProgramToCopy] = useState<string>('');
  const [copyEnrolledStudents, setCopyEnrolledStudents] = useState<boolean>(true);

  // Edit Program Form state
  const [editProgName, setEditProgName] = useState('');
  const [editProgCode, setEditProgCode] = useState('');
  const [editProgDesc, setEditProgDesc] = useState('');
  const [editProgAdminName, setEditProgAdminName] = useState('');
  const [editProgAdminEmail, setEditProgAdminEmail] = useState('');
  const [editProgPermissions, setEditProgPermissions] = useState<AdminPermission[]>([]);
  const [editProgSubList, setEditProgSubList] = useState<string[]>([]);
  const [editProgSubInput, setEditProgSubInput] = useState('');
  const [editSafeguardCode, setEditSafeguardCode] = useState('');
  const [editProgStartDate, setEditProgStartDate] = useState('');
  const [editProgEndDate, setEditProgEndDate] = useState('');
  const [editProgDurationWeeks, setEditProgDurationWeeks] = useState(10);
  const [editProgStartTime, setEditProgStartTime] = useState('09:00');
  const [editProgEndTime, setEditProgEndTime] = useState('17:00');
  const [editProgMinAttendance, setEditProgMinAttendance] = useState(80);
  const [editProgMinPassScore, setEditProgMinPassScore] = useState(75);
  const [editProgStrictProctoring, setEditProgStrictProctoring] = useState(true);

  // Department Form state
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptAdminName, setDeptAdminName] = useState('');
  const [deptAdminEmail, setDeptAdminEmail] = useState('');

  // Department Search state
  const [deptSearchInput, setDeptSearchInput] = useState('');
  const [deptSearchQuery, setDeptSearchQuery] = useState('');

  // Edit Department Modal state
  const [editDeptModal, setEditDeptModal] = useState(false);
  const [selectedDeptToEdit, setSelectedDeptToEdit] = useState<DynamicDepartment | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptCode, setEditDeptCode] = useState('');
  const [editDeptAdminName, setEditDeptAdminName] = useState('');
  const [editDeptAdminEmail, setEditDeptAdminEmail] = useState('');

  // Delete Department Confirmation state
  const [deleteDeptModal, setDeleteDeptModal] = useState<{ isOpen: boolean; department: DynamicDepartment | null }>({
    isOpen: false,
    department: null
  });

  // Single Student Intake state
  const [singleStuName, setSingleStuName] = useState('');
  const [singleStuRoll, setSingleStuRoll] = useState('');
  const [singleStuEmail, setSingleStuEmail] = useState('');
  const [singleStuPassword, setSingleStuPassword] = useState('welcome@2026');
  const [singleStuDept, setSingleStuDept] = useState('');
  const [singleStuBatch, setSingleStuBatch] = useState(2028);
  const [singleStuProg, setSingleStuProg] = useState('');
  const [singleStuSubProg, setSingleStuSubProg] = useState('');

  // CSV text states
  const [csvIntakeText, setCsvIntakeText] = useState('');
  const [csvScrutinyText, setCsvScrutinyText] = useState('');

  const collegeId = currentUser?.collegeId || 'col-1';

  // Back gesture handlers for modals and sub-views
  useBackHandler(Boolean(selectedProgramProfile), () => setSelectedProgramProfile(null));
  useBackHandler(Boolean(selectedDeptForProgress), () => setSelectedDeptForProgress(null));
  useBackHandler(createProgramModal, () => setCreateProgramModal(false));
  useBackHandler(editProgramModal, () => setEditProgramModal(false));
  useBackHandler(safeguardDeleteModal.isOpen, () => setSafeguardDeleteModal({ isOpen: false, program: null }));
  useBackHandler(createDeptModal, () => setCreateDeptModal(false));
  useBackHandler(editDeptModal, () => setEditDeptModal(false));
  useBackHandler(deleteDeptModal.isOpen, () => setDeleteDeptModal({ isOpen: false, department: null }));
  useBackHandler(bulkDeptModal, () => setBulkDeptModal(false));
  useBackHandler(purgeBatchModal, () => setPurgeBatchModal(false));
  useBackHandler(singleStudentModal, () => setSingleStudentModal(false));
  useBackHandler(bulkIntakeModal, () => setBulkIntakeModal(false));
  useBackHandler(bulkScrutinyModal, () => setBulkScrutinyModal(false));

  const loadData = async () => {
    try {
      setLoading(true);

      const [col, progs, depts, stu] = await Promise.all([
        api.college.getDetails(collegeId),
        api.college.getPrograms(collegeId),
        api.college.getDepartments(collegeId),
        api.admin.getUsers({ role: 'STUDENT' }).then(users =>
          users.length > 0 ? users : api.admin.getStudents()
        ).catch(() => api.admin.getStudents())
      ]);
      setCollegeDetails(col);
      setPrograms(progs);
      setDepartments(depts);
      setStudents(stu);
      if (depts.length > 0 && !singleStuDept) {
        setSingleStuDept(depts[0].name);
      }
    } catch (err: any) {
      console.error('Error loading Super Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [collegeId]);

  const handleCopyFromProgram = (sourceProgId: string) => {
    setSelectedProgramToCopy(sourceProgId);
    if (!sourceProgId) return;

    const source = programs.find(p => p.id === sourceProgId);
    if (!source) return;

    setProgDesc(source.description ? `(Copy of ${source.name}) ${source.description}` : `Configured based on ${source.name} curriculum and readiness guidelines.`);
    setProgDurationWeeks(source.durationWeeks || 10);
    setProgStartTime(source.dailyStartTime || '09:00');
    setProgEndTime(source.dailyEndTime || '17:00');
    setProgMinAttendance(source.minAttendancePercent || 80);
    setProgMinPassScore(source.minPassScore || 75);
    setProgStrictProctoring(source.strictProctoring ?? true);
    setProgPermissions(source.adminPermissions || ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_MANAGE_STUDENTS']);
    setCopyEnrolledStudents(true);
  };

  const clearProgramCopy = () => {
    setSelectedProgramToCopy('');
    setCopyEnrolledStudents(false);
  };

  // Handle Create Program
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
        hasSubPrograms: false,
        subPrograms: [],
        assignedAdminEmail: progAdminEmail.trim() || undefined,
        assignedAdminName: progAdminFirstName.trim() ? `${progAdminFirstName} ${progAdminLastName}`.trim() : undefined,
        adminPermissions: progPermissions,
        startDate: progStartDate,
        endDate: progEndDate,
        durationWeeks: progDurationWeeks,
        dailyStartTime: progStartTime,
        dailyEndTime: progEndTime,
        minAttendancePercent: progMinAttendance,
        minPassScore: progMinPassScore,
        strictProctoring: progStrictProctoring,
        customRules: [
          `Minimum ${progMinAttendance}% attendance on scheduled drills`,
          `Passing score threshold set to ${progMinPassScore}% across evaluation turns`,
          progStrictProctoring ? 'Strict anti-cheating, voice turn validation and proctoring enabled' : 'Flexible proctoring'
        ]
      });

      let copiedCount = 0;
      if (selectedProgramToCopy && copyEnrolledStudents) {
        const sourceProg = programs.find(p => p.id === selectedProgramToCopy);
        if (sourceProg) {
          let allStudents: any[] = [];
          try {
            allStudents = await api.admin.getUsers({ role: 'STUDENT' });
          } catch {
            allStudents = await api.admin.getStudents();
          }
          const targetSourceStudents = allStudents.filter(s => 
            (s.programName && s.programName.toLowerCase() === sourceProg.name.toLowerCase()) ||
            (s.track && s.track.toLowerCase().includes(sourceProg.name.toLowerCase())) ||
            s.programId === sourceProg.id
          );

          for (const s of targetSourceStudents) {
            await api.studentBatch.enrollSingle(collegeId, {
              name: s.name,
              rollNumber: `${s.rollNumber || 'STU'}-${newProg.code}`,
              email: s.email,
              department: s.department || 'Information Technology',
              batchYear: s.batchYear || 2026,
              programName: newProg.name,
              password: 'student123'
            });
            copiedCount++;
          }
        }
      }

      logger.info('PROGRAM', `Program created: ${newProg.name} (${newProg.code}) with ${copiedCount} copied candidates`);
      const copyMsg = copiedCount > 0 
        ? ` Copied settings and enrolled ${copiedCount} students from ${programs.find(p => p.id === selectedProgramToCopy)?.name}.`
        : '';
      setFeedback({ type: 'success', message: `Training Program "${newProg.name}" created successfully!${copyMsg}` });
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
    setProgAdminFirstName('');
    setProgAdminLastName('');
    setProgAdminEmail('');
    setProgPermissions(['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_MANAGE_STUDENTS']);
    setProgDurationWeeks(10);
    setProgMinAttendance(80);
    setProgMinPassScore(75);
    setProgStrictProctoring(true);
    setSelectedProgramToCopy('');
    setCopyEnrolledStudents(false);
  };

  // Open Edit Program Modal with pre-filled values
  const openEditModal = (prog: DynamicProgram) => {
    setSelectedProgramToEdit(prog);
    setEditProgName(prog.name);
    setEditProgCode(prog.code);
    setEditProgDesc(prog.description || '');
    setEditProgAdminName(prog.assignedAdminName || '');
    setEditProgAdminEmail(prog.assignedAdminEmail || '');
    setEditProgPermissions(prog.adminPermissions || ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS']);
    setEditProgSubList(prog.subPrograms || []);
    setEditProgSubInput('');
    setEditSafeguardCode(prog.code);
    setEditProgStartDate(prog.startDate || new Date().toISOString().split('T')[0]);
    setEditProgEndDate(prog.endDate || '');
    setEditProgDurationWeeks(prog.durationWeeks || 10);
    setEditProgStartTime(prog.dailyStartTime || '09:00');
    setEditProgEndTime(prog.dailyEndTime || '17:00');
    setEditProgMinAttendance(prog.minAttendancePercent ?? 80);
    setEditProgMinPassScore(prog.minPassScore ?? 75);
    setEditProgStrictProctoring(prog.strictProctoring !== false);
    setEditProgramModal(true);
  };

  // Handle Save Edit Program
  const handleSaveProgramEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProgramToEdit) return;

    if (!editProgName.trim() || !editProgCode.trim()) {
      setFeedback({ type: 'error', message: 'Program name and code cannot be empty.' });
      return;
    }

    try {
      await api.college.updateProgram(
        collegeId,
        selectedProgramToEdit.id,
        {
          name: editProgName.trim(),
          code: editProgCode.trim().toUpperCase(),
          description: editProgDesc.trim(),
          assignedAdminName: editProgAdminName.trim() || undefined,
          assignedAdminEmail: editProgAdminEmail.trim() || undefined,
          adminPermissions: editProgPermissions,
          hasSubPrograms: false,
          subPrograms: [],
          startDate: editProgStartDate,
          endDate: editProgEndDate,
          durationWeeks: editProgDurationWeeks,
          dailyStartTime: editProgStartTime,
          dailyEndTime: editProgEndTime,
          minAttendancePercent: editProgMinAttendance,
          minPassScore: editProgMinPassScore,
          strictProctoring: editProgStrictProctoring
        },
        editSafeguardCode || selectedProgramToEdit.code
      );

      logger.info('PROGRAM', `Program modified: ${editProgName.trim()} (${editProgCode.trim()})`);
      setFeedback({ type: 'success', message: `Program "${editProgName.trim()}" updated successfully!` });
      setEditProgramModal(false);
      setSelectedProgramToEdit(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update program.' });
    }
  };

  // Execute Safeguard Delete
  const executeSafeguardDelete = async () => {
    if (!safeguardDeleteModal.program) return;
    const prog = safeguardDeleteModal.program;
    try {
      await api.college.deleteProgram(collegeId, prog.id, safeguardInput);
      logger.info('PROGRAM', `Program deleted: ${prog.name} (${prog.code})`);
      setFeedback({ type: 'success', message: `Program "${prog.name}" has been permanently removed.` });
      setSafeguardDeleteModal({ isOpen: false, program: null });
      setSafeguardInput('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Safeguard verification failed.' });
    }
  };

  // Department Creation
  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim() || !deptAdminName.trim() || !deptAdminEmail.trim()) {
      setFeedback({ type: 'error', message: 'Department name, code, admin name, and admin email are all required.' });
      return;
    }
    try {
      const d = await api.college.createDepartment(collegeId, {
        name: deptName.trim(),
        code: deptCode.trim().toUpperCase(),
        assignedAdminEmail: deptAdminEmail.trim(),
        assignedAdminName: deptAdminName.trim(),
        adminPermissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_MANAGE_STUDENTS']
      });

      logger.info('DEPT', `Department created: ${d.name} (${d.code}) with counselor ${deptAdminName}`);
      setFeedback({ type: 'success', message: `Department "${d.name}" and administrator configured successfully!` });
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

  // Open Edit Department Modal
  const handleOpenEditDept = (dept: DynamicDepartment) => {
    setSelectedDeptToEdit(dept);
    setEditDeptName(dept.name);
    setEditDeptCode(dept.code);
    setEditDeptAdminName(dept.assignedAdminName || '');
    setEditDeptAdminEmail(dept.assignedAdminEmail || '');
    setEditDeptModal(true);
  };

  // Save Department & Admin Edit
  const handleSaveDeptEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptToEdit) return;

    if (!editDeptName.trim() || !editDeptCode.trim()) {
      setFeedback({ type: 'error', message: 'Department name and code are required.' });
      return;
    }

    try {
      await api.college.updateDepartment(collegeId, selectedDeptToEdit.id, {
        name: editDeptName.trim(),
        code: editDeptCode.trim().toUpperCase(),
        assignedAdminName: editDeptAdminName.trim() || undefined,
        assignedAdminEmail: editDeptAdminEmail.trim() || undefined
      });

      logger.info('DEPT', `Department modified: ${editDeptName.trim()} (${editDeptCode.trim()})`);
      setFeedback({ type: 'success', message: `Department "${editDeptName.trim()}" updated successfully!` });
      setEditDeptModal(false);
      setSelectedDeptToEdit(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update department.' });
    }
  };

  // Confirm Delete Department
  const handleConfirmDeleteDept = async () => {
    if (!deleteDeptModal.department) return;
    const dept = deleteDeptModal.department;
    try {
      await api.college.deleteDepartment(collegeId, dept.id);
      logger.info('DEPT', `Department deleted: ${dept.name} (${dept.code})`);
      setFeedback({ type: 'success', message: `Department "${dept.name}" removed.` });
      setDeleteDeptModal({ isOpen: false, department: null });
      if (selectedDeptForProgress?.id === dept.id) {
        setSelectedDeptForProgress(null);
      }
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to delete department.' });
    }
  };

  // Bulk Create Departments via CSV (Exclusively for Academic Departments, NOT for Programs)
  const handleBulkCreateDepartments = async () => {
    if (!csvDeptText.trim()) return;
    try {
      const res = await api.college.bulkCreateDepartments(collegeId, csvDeptText);
      logger.info('DEPT', `Bulk created ${res.created} academic departments via CSV`);
      setFeedback({
        type: 'success',
        message: `Successfully provisioned ${res.created} academic departments and assigned department administrators!`
      });
      setBulkDeptModal(false);
      setCsvDeptText('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to bulk create departments.' });
    }
  };

  const downloadSampleDeptCSV = () => {
    const content = "Department Name,Department Code,Admin Name,Admin Email\n" +
      "Computer Science & Engineering,CSE,Dr. K. Swaminathan,swaminathan@college.edu\n" +
      "Information Technology,IT,Dr. B. Vijayalakshmi,vijayalakshmi@college.edu\n" +
      "Electronics & Communication Engineering,ECE,Dr. P. Rajesh,rajesh.p@college.edu\n" +
      "Mechanical Engineering,MECH,Dr. S. Sundar,sundar.s@college.edu";
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'departments_and_admins_template.csv';
    a.click();
  };

  const handleDeptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setCsvDeptText(text);
    };
    reader.readAsText(file);
  };

  // Purge Graduated Batch of Students (Super Admin Safeguard)
  const handlePurgeBatch = async () => {
    if (!purgeBatchYear || purgeBatchYear < 2000) {
      setFeedback({ type: 'error', message: 'Please select a valid graduated batch year.' });
      return;
    }
    const expectedConf = `PURGE ${purgeBatchYear}`;
    if (purgeVerificationInput.trim().toUpperCase() !== expectedConf) {
      setFeedback({ type: 'error', message: `Verification failed. Please type "${expectedConf}" to confirm batch removal.` });
      return;
    }

    try {
      const res = await api.studentBatch.purgeGraduatedBatch(collegeId, purgeBatchYear, purgeVerificationInput);
      logger.info('BATCH_PURGE', `Super Admin purged Batch ${purgeBatchYear}: ${res.purgedCount} students removed`);
      setFeedback({
        type: 'success',
        message: `Successfully removed graduated Batch ${purgeBatchYear} (${res.purgedCount} candidate accounts permanently deleted).`
      });
      setPurgeBatchModal(false);
      setPurgeVerificationInput('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to purge batch.' });
    }
  };

  // Distinct batch years with count for Super Admin purge selector
  const batchYearStats = React.useMemo(() => {
    const counts: Record<number, number> = {};
    students.forEach(s => {
      const b = s.batchYear || 2026;
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([yr, cnt]) => ({ year: Number(yr), count: cnt }))
      .sort((a, b) => a.year - b.year);
  }, [students]);

  // Single Student Intake
  const handleSingleStudentIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleStuName.trim() || !singleStuRoll.trim() || !singleStuEmail.trim() || !singleStuDept) {
      setFeedback({ type: 'error', message: 'Candidate name, roll number, email, and department are required.' });
      return;
    }
    if (!singleStuBatch || singleStuBatch < 2000) {
      setFeedback({ type: 'error', message: 'Valid graduating Batch Year is required (e.g. 2028).' });
      return;
    }

    try {
      const enrolled = await api.studentBatch.enrollSingle(collegeId, {
        name: singleStuName.trim(),
        rollNumber: singleStuRoll.trim(),
        email: singleStuEmail.trim(),
        password: singleStuPassword.trim(),
        department: singleStuDept,
        batchYear: singleStuBatch,
        programName: singleStuProg || undefined,
        subProgramName: singleStuSubProg || undefined
      });

      logger.info('STUDENT', `Single intake: ${enrolled.name} (${enrolled.rollNumber}) in ${enrolled.department} [Batch ${singleStuBatch}]`);
      setFeedback({ type: 'success', message: `Student "${enrolled.name}" (${enrolled.rollNumber}) successfully enrolled in Batch ${singleStuBatch}!` });
      setSingleStudentModal(false);
      setSingleStuName('');
      setSingleStuRoll('');
      setSingleStuEmail('');
      setSingleStuProg('');
      setSingleStuSubProg('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to enroll student.' });
    }
  };

  // Bulk Student Intake & Conditional Program/Department Assignment (CSV)
  const handleBulkIntake = async () => {
    if (!csvIntakeText.trim()) return;
    try {
      const res = await api.studentBatch.bulkImportAndAssignStudents(collegeId, csvIntakeText, intakeTargetBatch);
      logger.info('STUDENT', `Bulk student assignment completed: ${res.count} candidates in Batch ${intakeTargetBatch}`);
      setFeedback({ 
        type: 'success', 
        message: `Successfully processed ${res.count} candidates (Batch ${intakeTargetBatch}): ${res.assignedToProgramCount} assigned to institutional programs (e.g. Hope), ${res.assignedToDepartmentCount} assigned to academic departments!` 
      });
      setBulkIntakeModal(false);
      setCsvIntakeText('');
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Bulk student assignment failed.' });
    }
  };

  // Bulk Program Allocation Scrutiny
  const handleBulkScrutiny = async () => {
    if (!csvScrutinyText.trim()) return;
    try {
      const res = await api.studentBatch.bulkAssignPrograms(collegeId, csvScrutinyText);
      logger.info('SCRUTINY', `Allocated programs for ${res.count} candidates`);
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

  const downloadSampleIntakeCSV = () => {
    const content = "Name,College Given Mail ID,Program Name,Department Name,Roll Number,Batch Year\n" +
      "Bavan Balaji,bavan.b@college.edu,Hope,Information Technology,22IT1042,2028\n" +
      "Keerthana R,keerthana.r@college.edu,Hope,Computer Science & Engineering,22CS1055,2028\n" +
      "Naveen Kumar,naveen.k@college.edu,,Information Technology,22IT1088,2028\n" +
      "Divya Shree,divya.s@college.edu,,Computer Science & Engineering,22CS1090,2028\n" +
      "Vignesh M,vignesh.m@college.edu,Cloud Computing & DevOps,Computer Science & Engineering,22CS1095,2028";
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_assignment_template.csv';
    a.click();
  };

  const handleIntakeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvIntakeText(text);
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleScrutinyCSV = () => {
    const content = "Roll Number Or Email,Program Name,Sub Program Or Track\n" +
      "22CS1084,Advanced Technical Readiness,Elite Track\n" +
      "priya.m@college.edu,Advanced Technical Readiness,Non-Elite Core Track\n" +
      "22EC1015,Cloud Systems Track,Cloud Architecture & DevOps\n" +
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
      (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase())) ||
      (s.batchYear && String(s.batchYear).includes(studentSearch.toLowerCase()));
    const matchesDept = filterDept === 'ALL' || s.department === filterDept;
    const matchesProg = filterProgram === 'ALL' || s.track === filterProgram || s.programName?.includes(filterProgram);
    return matchesSearch && matchesDept && matchesProg;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* College Super Admin Header */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Institutional Super Administrator</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            {collegeDetails?.name || "College Management Portal"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (programs && programs.length > 0) {
                setAssignTargetScope('PROGRAM');
                setAssignProgramName(programs[0].name);
                setAssignDepartment('');
              } else {
                setAssignTargetScope('DEPARTMENT');
                setAssignProgramName('');
                setAssignDepartment(departments[0]?.name || 'Computer Science & Engineering');
              }
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

      {/* Auto-Dismissing Alert with Reverse Countdown Bar */}
      {feedback && (
        <AutoDismissAlert
          type={feedback.type}
          message={feedback.message}
          durationMs={5000}
          onClose={() => setFeedback(null)}
        />
      )}

      {/* 3 Active Navigation Tabs */}
      <div className="flex border-b border-neutral-200/80 space-x-8 text-xs font-medium">
        <button
          onClick={() => {
            setActiveTab('PROGRAMS');
            setSelectedProgramProfile(null);
          }}
          className={`pb-3.5 border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'PROGRAMS' 
              ? 'border-neutral-900 text-neutral-900 font-bold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Dynamic Training Programs ({programs.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('DEPARTMENTS');
            setSelectedProgramProfile(null);
          }}
          className={`pb-3.5 border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'DEPARTMENTS' 
              ? 'border-neutral-900 text-neutral-900 font-bold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments &amp; Admins ({departments.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('STUDENTS');
            setSelectedProgramProfile(null);
          }}
          className={`pb-3.5 border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'STUDENTS' 
              ? 'border-neutral-900 text-neutral-900 font-bold' 
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Students &amp; Program Assignment ({students.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DYNAMIC PROGRAMS & SUB-PROGRAMS */}
      {/* ========================================================================= */}
      {activeTab === 'PROGRAMS' && (
        <div className="space-y-6">
          
          {/* If viewing a specific Program Profile */}
          {selectedProgramProfile ? (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Back Navigation Bar */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedProgramProfile(null)}
                  className="inline-flex items-center space-x-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 bg-white hover:bg-neutral-50 px-3.5 py-2 rounded-xl border border-neutral-200 transition-colors shadow-2xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Programs Directory</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignTargetScope('PROGRAM');
                      setAssignProgramName(selectedProgramProfile.program.name);
                      setAssignDepartment('');
                      setAssignModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Assign Assessment to this Program</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedProgramProfile.program)}
                    className="inline-flex items-center space-x-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Program</span>
                  </button>
                </div>
              </div>

              {/* Program Profile Header Banner */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                        {selectedProgramProfile.program.code}
                      </span>
                      {selectedProgramProfile.subProgramName && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          {selectedProgramProfile.subProgramName}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Active Dynamic Track</span>
                      </span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-neutral-900">
                      {selectedProgramProfile.program.name}
                      {selectedProgramProfile.subProgramName ? ` — ${selectedProgramProfile.subProgramName}` : ''}
                    </h2>
                    <p className="text-xs text-neutral-500 max-w-2xl">
                      {selectedProgramProfile.program.description || 'Custom institutional curriculum track evaluating student technical readiness and communication proficiency.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openAdminDashboard({
                      role: 'PROGRAM_ADMIN',
                      name: selectedProgramProfile.program.assignedAdminName || 'Program Administrator',
                      email: selectedProgramProfile.program.assignedAdminEmail || 'admin.cloud@college.edu',
                      programName: selectedProgramProfile.program.name,
                      collegeId: currentUser?.collegeId
                    })}
                    className="p-3 bg-blue-50/70 hover:bg-blue-100/80 rounded-xl border border-blue-200 text-xs space-y-1 sm:text-right transition-all cursor-pointer group shadow-2xs hover:shadow-xs"
                    title="Open Program Admin Dashboard"
                  >
                    <span className="text-[10px] text-blue-600 block uppercase font-mono font-semibold">Assigned Lead Admin · Click to open</span>
                    <div className="font-bold text-neutral-900 group-hover:text-blue-700 flex items-center sm:justify-end space-x-1">
                      <span>{selectedProgramProfile.program.assignedAdminName || 'Lead Mentor'}</span>
                      <ExternalLink className="w-3 h-3 text-blue-500" />
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500">{selectedProgramProfile.program.assignedAdminEmail || 'Open Dashboard'}</div>
                  </button>
                </div>

                {/* 4 Program Telemetry KPI Boxes */}
                {(() => {
                  const enrolledInProg = students.filter(s => {
                    const matchesP = s.programName === selectedProgramProfile.program.name || s.track?.includes(selectedProgramProfile.program.name);
                    if (selectedProgramProfile.subProgramName) {
                      return matchesP && (s.subProgramName === selectedProgramProfile.subProgramName || s.track?.includes(selectedProgramProfile.subProgramName));
                    }
                    return matchesP;
                  });
                  const highPerformers = enrolledInProg.filter(s => (s.score || 70) >= 75);
                  const avgScore = enrolledInProg.length > 0 
                    ? Math.round(enrolledInProg.reduce((acc, s) => acc + (s.score || 70), 0) / enrolledInProg.length)
                    : 74;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
                      <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80">
                        <span className="text-[11px] font-medium text-neutral-500 block">Enrolled Students</span>
                        <div className="text-2xl font-bold text-neutral-900 mt-1">{enrolledInProg.length}</div>
                        <span className="text-[10px] text-neutral-400">Total active candidates</span>
                      </div>

                      <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80">
                        <span className="text-[11px] font-medium text-neutral-500 block">Assessments Assigned</span>
                        <div className="text-2xl font-bold text-blue-600 mt-1">6</div>
                        <span className="text-[10px] text-neutral-400">Voice &amp; Audio Drills</span>
                      </div>

                      <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80">
                        <span className="text-[11px] font-medium text-neutral-500 block">Top Performers (&gt;75%)</span>
                        <div className="text-2xl font-bold text-emerald-600 mt-1">
                          {highPerformers.length}
                          <span className="text-xs font-normal text-emerald-700 ml-1">
                            ({enrolledInProg.length > 0 ? Math.round((highPerformers.length / enrolledInProg.length) * 100) : 0}%)
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-medium">Placement Ready</span>
                      </div>

                      <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80">
                        <span className="text-[11px] font-medium text-neutral-500 block">Average Readiness</span>
                        <div className="text-2xl font-bold text-neutral-900 mt-1">{avgScore}%</div>
                        <span className="text-[10px] text-neutral-400">Batch average score</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Program Activity Logs */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Program Activity Logs &amp; Milestones</span>
                </div>
                <div className="space-y-2 font-mono text-[11px] bg-neutral-950 text-neutral-300 p-4 rounded-xl border border-neutral-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-neutral-500">[2026-09-29 09:15:20]</span>
                    <span className="text-emerald-400">[ASSIGN]</span>
                    <span>Distributed Systems &amp; Concurrency Mock Drill assigned to batch</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-neutral-500">[2026-09-28 14:10:05]</span>
                    <span className="text-blue-400">[PROGRAM]</span>
                    <span>Assigned 42 students into program based on coding benchmark</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-neutral-500">[2026-09-27 11:30:44]</span>
                    <span className="text-purple-400">[MENTOR]</span>
                    <span>Lead mentor {selectedProgramProfile.program.assignedAdminName || 'Admin'} active with 5 delegated rule sets</span>
                  </div>
                </div>
              </div>

              {/* Program-Specific Assessment & Interview Operations Hub */}
              <AssessmentMonitoringWidget 
                collegeId={currentUser?.collegeId}
                programName={selectedProgramProfile.program.name}
                hideScopeSelector={true}
                titlePrefix={selectedProgramProfile.program.name}
              />

              {/* Enrolled Students in this Program */}
              <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900">Enrolled Candidates</h3>
                  <span className="text-xs text-neutral-500 font-mono">
                    {students.filter(s => s.programName === selectedProgramProfile.program.name || s.track?.includes(selectedProgramProfile.program.name)).length} students active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-neutral-500 font-medium">
                        <th className="py-3 px-4">Candidate</th>
                        <th className="py-3 px-4">Roll Number</th>
                        <th className="py-3 px-4">Department</th>
                        <th className="py-3 px-4">Sub-Track</th>
                        <th className="py-3 px-4">Readiness Score</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60">
                      {students
                        .filter(s => s.programName === selectedProgramProfile.program.name || s.track?.includes(selectedProgramProfile.program.name))
                        .map(s => (
                          <tr key={s.id} className="hover:bg-neutral-50/50">
                            <td className="py-3 px-4 font-semibold text-neutral-900">
                              <button
                                type="button"
                                onClick={() => openStudentDashboard(s)}
                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-bold"
                                title={`Open ${s.name}'s Student Dashboard`}
                              >
                                {s.name}
                              </button>
                            </td>
                            <td className="py-3 px-4 font-mono text-neutral-500">{s.rollNumber || '—'}</td>
                            <td className="py-3 px-4 text-neutral-700">{s.department}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-neutral-100 rounded text-[10px] font-mono">
                                {s.subProgramName || 'General Track'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`font-bold ${s.score >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {s.score || 70}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => openStudentDashboard(s)}
                                className="px-2.5 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg cursor-pointer inline-flex items-center space-x-1 font-semibold"
                                title={`Open ${s.name}'s Student Dashboard`}
                              >
                                <LayoutDashboard className="w-3 h-3 text-neutral-600" />
                                <span>Open Dashboard</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            /* Program Directory List View */
            <div className="space-y-6">
              {/* Assessment & Interview Monitoring Hub */}
              <AssessmentMonitoringWidget collegeId={currentUser?.collegeId} />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-neutral-900">Custom Institutional Training Programs</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCreateProgramModal(true)}
                    className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-black flex items-center space-x-1.5 shadow-xs cursor-pointer"
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
                      Your college does not have any active programs yet. Click &quot;Define New Program&quot; to configure custom tracks.
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
                /* Elegant List/Table Layout for Programs */
                <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-neutral-500 font-medium">
                        <th className="py-3.5 px-5">Program Name &amp; Code</th>
                        <th className="py-3.5 px-5">Schedule &amp; Timeline</th>
                        <th className="py-3.5 px-5">Governance Rules</th>
                        <th className="py-3.5 px-5">Lead Admin</th>
                        <th className="py-3.5 px-5">Enrolled</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60">
                      {programs.map((prog) => {
                        const enrolledCount = students.filter(s => s.programName === prog.name || s.track?.includes(prog.name)).length;
                        return (
                          <tr 
                            key={prog.id} 
                            className="hover:bg-neutral-50/60 transition-colors group cursor-pointer"
                            onClick={() => viewProgramDetail(prog)}
                          >
                            <td className="py-4 px-5">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-neutral-900 text-sm group-hover:text-blue-600 transition-colors">
                                  {prog.name}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                                  {prog.code}
                                </span>
                              </div>
                              {prog.description && (
                                <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{prog.description}</p>
                              )}
                            </td>

                            <td className="py-4 px-5">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1.5 text-neutral-800 font-medium text-xs">
                                  <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                                  <span>{prog.startDate || 'Immediate'} → {prog.endDate || 'Ongoing'}</span>
                                </div>
                                <div className="text-[10px] text-neutral-500 font-mono">
                                  {prog.durationWeeks || 10} Weeks {prog.dailyStartTime ? `(${prog.dailyStartTime} - ${prog.dailyEndTime || '17:00'})` : ''}
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-5">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-medium">
                                  ≥ {prog.minAttendancePercent ?? 80}% Att.
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-medium">
                                  Pass {prog.minPassScore ?? 75}%
                                </span>
                                {prog.strictProctoring !== false && (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-medium">
                                    Proctored
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                              {prog.assignedAdminEmail ? (
                                <button
                                  type="button"
                                  onClick={() => openAdminDashboard({
                                    role: 'PROGRAM_ADMIN',
                                    name: prog.assignedAdminName || 'Program Administrator',
                                    email: prog.assignedAdminEmail || 'admin@college.edu',
                                    programName: prog.name,
                                    collegeId: currentUser?.collegeId
                                  })}
                                  className="text-left group/admin hover:bg-neutral-100 p-1.5 -m-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Open Program Admin Dashboard"
                                >
                                  <div className="font-semibold text-neutral-800 group-hover/admin:text-blue-600 flex items-center space-x-1">
                                    <span>{prog.assignedAdminName || 'Lead Admin'}</span>
                                    <ExternalLink className="w-3 h-3 text-neutral-400 group-hover/admin:text-blue-600" />
                                  </div>
                                  <div className="text-[10px] font-mono text-neutral-400">{prog.assignedAdminEmail}</div>
                                </button>
                              ) : (
                                <span className="text-neutral-400 italic">No admin assigned</span>
                              )}
                            </td>

                            <td className="py-4 px-5">
                              <span className="font-bold text-neutral-900">{enrolledCount}</span>
                              <span className="text-[10px] text-neutral-400 ml-1">students</span>
                            </td>

                            <td className="py-4 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssignTargetScope('PROGRAM');
                                    setAssignProgramName(prog.name);
                                    setAssignDepartment('');
                                    setAssignModalOpen(true);
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors cursor-pointer mr-1"
                                  title={`Assign Assessment to ${prog.name}`}
                                >
                                  <Mic className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Assign</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => viewProgramDetail(prog)}
                                  className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="View Program Details & Activity Logs"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(prog)}
                                  className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Program"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSafeguardDeleteModal({ isOpen: true, program: prog });
                                    setSafeguardInput('');
                                  }}
                                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Program"
                                >
                                  <Trash2 className="w-4 h-4" />
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
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEPARTMENTS & ADMINS */}
      {/* ========================================================================= */}
      {activeTab === 'DEPARTMENTS' && (() => {
        const filteredDepartments = departments.filter((dept) => {
          if (!deptSearchQuery.trim()) return true;
          const q = deptSearchQuery.trim().toLowerCase();
          const matchName = dept.name?.toLowerCase().includes(q);
          const matchCode = dept.code?.toLowerCase().includes(q);
          const matchAdmin = (dept.assignedAdminName || '').toLowerCase().includes(q);
          const matchEmail = (dept.assignedAdminEmail || '').toLowerCase().includes(q);
          return Boolean(matchName || matchCode || matchAdmin || matchEmail);
        });

        return (
          <div className="space-y-6">
            {/* Card Header & Search Toolbar */}
            <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-semibold text-neutral-900">Academic Departments &amp; Admins</h2>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 rounded border border-neutral-200">
                      {filteredDepartments.length} {filteredDepartments.length === 1 ? 'DEPT' : 'DEPTS'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Departments must be defined before adding students. Click any department to view its detailed progress and student performance in a modal.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvDeptText('');
                      setBulkDeptModal(true);
                    }}
                    className="px-3.5 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-black flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    title="Bulk provision academic departments and assign admins via CSV (Departments ONLY)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Bulk Create Departments (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateDeptModal(true)}
                    className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Department</span>
                  </button>
                </div>
              </div>

              {/* Search Bar with dedicated Search Button */}
              <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setDeptSearchQuery(deptSearchInput);
                  }} 
                  className="flex items-center gap-2 max-w-md w-full"
                >
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search department, code, admin, counselor..."
                      value={deptSearchInput}
                      onChange={(e) => {
                        setDeptSearchInput(e.target.value);
                        setDeptSearchQuery(e.target.value);
                      }}
                      className="w-full pl-8 pr-7 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                    {deptSearchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeptSearchInput('');
                          setDeptSearchQuery('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                        title="Clear input"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                    title="Search departments"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </button>
                </form>

                {deptSearchQuery && (
                  <div className="text-xs text-neutral-500 flex items-center space-x-2">
                    <span>Showing results for &ldquo;<strong>{deptSearchQuery}</strong>&rdquo;</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeptSearchInput('');
                        setDeptSearchQuery('');
                      }}
                      className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-neutral-500 font-medium">
                    <th className="py-3.5 px-5">Department Name &amp; Code</th>
                    <th className="py-3.5 px-5">Department Admin (Counselor)</th>
                    <th className="py-3.5 px-5">Admin Email (User ID)</th>
                    <th className="py-3.5 px-5">Enrolled Students</th>
                    <th className="py-3.5 px-5">Avg Readiness</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 px-5 text-center text-neutral-400">
                        <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto mb-3 flex items-center justify-center">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-neutral-800">
                          {deptSearchQuery ? 'No matching departments found' : 'No departments configured yet'}
                        </p>
                        <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                          {deptSearchQuery
                            ? `No department or admin matched "${deptSearchQuery}". Try adjusting your keywords or clearing the search.`
                            : 'Define academic departments to start enrolling students and assigning counselors.'}
                        </p>
                        {deptSearchQuery ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeptSearchInput('');
                              setDeptSearchQuery('');
                            }}
                            className="mt-3 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl inline-flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Clear Search</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCreateDeptModal(true)}
                            className="mt-3 inline-flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add First Department</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => {
                      const deptStudents = students.filter(s => s.department === dept.name);
                      const avgScore = deptStudents.length > 0 
                        ? Math.round(deptStudents.reduce((acc, s) => acc + (s.score || 70), 0) / deptStudents.length)
                        : 72;

                      return (
                        <tr 
                          key={dept.id} 
                          onClick={() => setSelectedDeptForProgress(dept)}
                          className="hover:bg-neutral-50/60 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-neutral-900 text-sm group-hover:text-blue-600 transition-colors">
                              {dept.name}
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400">{dept.code}</span>
                          </td>
                          <td className="py-3.5 px-5 text-neutral-800 font-medium" onClick={(e) => e.stopPropagation()}>
                            <div className="py-1">
                              <span className="font-semibold text-neutral-900 block">
                                {dept.assignedAdminName || 'Head of Department'}
                              </span>
                              <span className="text-[10px] text-neutral-400 block font-mono">Department Counselor</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 font-mono text-neutral-500">
                            {dept.assignedAdminEmail || 'admin.' + dept.code.toLowerCase() + '@college.edu'}
                          </td>
                          <td className="py-3.5 px-5">
                            <span className="font-bold text-neutral-900">{deptStudents.length}</span>
                            <span className="text-[10px] text-neutral-400 ml-1">students</span>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`font-bold ${avgScore >= 75 ? 'text-emerald-600' : 'text-neutral-900'}`}>
                              {avgScore}%
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignTargetScope('DEPARTMENT');
                                  setAssignDepartment(dept.name);
                                  setAssignProgramName('');
                                  setAssignModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer inline-flex items-center space-x-1"
                                title={`Assign Assessment to ${dept.name}`}
                              >
                                <Mic className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Assign Drill</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedDeptForProgress(dept)}
                                className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                                title="View Department Progress"
                              >
                                View Progress
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditDept(dept)}
                                className="p-1.5 text-neutral-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer inline-flex items-center"
                                title="Edit Department & Admin Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteDeptModal({ isOpen: true, department: dept })}
                                className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center"
                                title="Remove Department"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Department Classes & Sections with CSV Bulk Student Assignment */}
            <DepartmentClassesManager collegeId={currentUser?.collegeId} />
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 3: STUDENT INTAKE & SCRUTINY ALLOCATION */}
      {/* ========================================================================= */}
      {activeTab === 'STUDENTS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Student Directory &amp; Program Assignment</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSingleStudentModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Add Single Student</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkIntakeModal(true)}
                className="px-3.5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import &amp; Assign Students (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPurgeVerificationInput('');
                  if (batchYearStats.length > 0) {
                    setPurgeBatchYear(batchYearStats[0].year);
                  }
                  setPurgeBatchModal(true);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-xs cursor-pointer"
                title="Super Admin Only: Permanently remove an entire graduated batch of students (e.g. Batch 2028)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge Graduated Batch</span>
              </button>
            </div>
          </div>

          {/* Standardized Student Directory across platform */}
          <StudentDirectoryTable
            students={students}
            onSelectStudent={(s) => openStudentDashboard(s)}
            onAssignStudent={(s) => {
              setAssignTargetScope('SPECIFIC_STUDENT');
              setTargetStudentForAssign(s);
              setAssignModalOpen(true);
            }}
            title="Institutional Student Candidate Roster"
            subtitle="Click any candidate row or Dashboard button to open their live interactive Student Dashboard."
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT PROGRAM (WORKING & COMPLETE) */}
      {/* ========================================================================= */}
      {editProgramModal && selectedProgramToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 shrink-0">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-neutral-900" />
                <h3 className="text-sm font-semibold text-neutral-900">Edit Training Program: {selectedProgramToEdit.name}</h3>
              </div>
              <button onClick={() => setEditProgramModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProgramEdit} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-medium text-neutral-700 mb-1">Program Name *</label>
                  <input
                    type="text"
                    required
                    value={editProgName}
                    onChange={(e) => setEditProgName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    value={editProgCode}
                    onChange={(e) => setEditProgCode(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono uppercase focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editProgDesc}
                  onChange={(e) => setEditProgDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Reassign Mentor / Lead Admin */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-3">
                <span className="font-semibold text-blue-950 block">Reassign Program Administrator / Mentor</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">Admin / Mentor Name</label>
                    <input
                      type="text"
                      value={editProgAdminName}
                      onChange={(e) => setEditProgAdminName(e.target.value)}
                      placeholder="e.g. Dr. K. Swaminathan"
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-neutral-600 mb-1">Admin Email (User ID)</label>
                    <input
                      type="email"
                      value={editProgAdminEmail}
                      onChange={(e) => setEditProgAdminEmail(e.target.value)}
                      placeholder="admin@college.edu"
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Delegated Rule Sets Checklist */}
              <div className="space-y-2">
                <span className="font-semibold text-neutral-900 block">Delegated Rule Sets &amp; Permissions:</span>
                <div className="space-y-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-50/50">
                  {Object.entries(ADMIN_PERMISSION_LABELS).map(([permKey, meta]) => {
                    const checked = editProgPermissions.includes(permKey as AdminPermission);
                    return (
                      <div
                        key={permKey}
                        onClick={() => {
                          if (checked) {
                            setEditProgPermissions(editProgPermissions.filter(p => p !== permKey));
                          } else {
                            setEditProgPermissions([...editProgPermissions, permKey as AdminPermission]);
                          }
                        }}
                        className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          checked ? 'bg-white border-neutral-300 shadow-2xs' : 'border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-neutral-900">{meta.label}</div>
                          <div className="text-[10px] text-neutral-500">{meta.desc}</div>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          checked ? 'bg-neutral-900 border-neutral-900 text-white' : 'border-neutral-300 bg-white'
                        }`}>
                          {checked && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Safeguard Verification Code */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Safeguard Verification</span>
                </div>
                <p className="text-[10px] text-amber-800">
                  Type program code <strong className="font-mono">{selectedProgramToEdit.code}</strong> or <strong className="font-mono">CONFIRM_MODIFY</strong> to authorize modifications:
                </p>
                <input
                  type="text"
                  required
                  placeholder={selectedProgramToEdit.code}
                  value={editSafeguardCode}
                  onChange={(e) => setEditSafeguardCode(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-mono text-xs focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditProgramModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-semibold shadow-xs cursor-pointer"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DEPARTMENT PROGRESS MODAL (BLACK BLURRED BACKGROUND) */}
      {/* ========================================================================= */}
      {selectedDeptForProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-5 h-5 text-neutral-100" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">{selectedDeptForProgress.name}</h2>
                  <p className="text-xs text-neutral-500 font-mono">
                    Code: {selectedDeptForProgress.code} · Counselor: {selectedDeptForProgress.assignedAdminName || 'HOD'} ({selectedDeptForProgress.assignedAdminEmail || 'Active'})
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditDept(selectedDeptForProgress)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  title="Edit Department & Admin Details"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const deptName = selectedDeptForProgress.name;
                    setSelectedDeptForProgress(null);
                    setAssignTargetScope('DEPARTMENT');
                    setAssignDepartment(deptName);
                    setAssignProgramName('');
                    setAssignModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Assign Drill to {selectedDeptForProgress.code}</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedDeptForProgress(null)}
                  className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto text-xs">
              {(() => {
                const deptStudents = students.filter(s => s.department === selectedDeptForProgress.name);
                const avgScore = deptStudents.length > 0
                  ? Math.round(deptStudents.reduce((acc, s) => acc + (s.score || 70), 0) / deptStudents.length)
                  : 72;
                const topCount = deptStudents.filter(s => (s.score || 70) >= 75).length;
                const midCount = deptStudents.filter(s => (s.score || 70) >= 60 && (s.score || 70) < 75).length;
                const needCount = deptStudents.filter(s => (s.score || 70) < 60).length;

                return (
                  <>
                    {/* Performance Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <span className="text-[11px] text-neutral-500 block">Total Enrolled</span>
                        <div className="text-xl font-bold text-neutral-900 mt-0.5">{deptStudents.length}</div>
                        <span className="text-[10px] text-neutral-400">Candidates in Dept</span>
                      </div>

                      <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <span className="text-[11px] text-neutral-500 block">Avg Readiness</span>
                        <div className="text-xl font-bold text-neutral-900 mt-0.5">{avgScore}%</div>
                        <span className="text-[10px] text-neutral-400">Placement benchmark</span>
                      </div>

                      <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                        <span className="text-[11px] text-emerald-800 block">Placement Ready</span>
                        <div className="text-xl font-bold text-emerald-700 mt-0.5">{topCount}</div>
                        <span className="text-[10px] text-emerald-600 font-medium">Score &gt;= 75%</span>
                      </div>

                      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                        <span className="text-[11px] text-amber-800 block">Needs Practice</span>
                        <div className="text-xl font-bold text-amber-700 mt-0.5">{needCount}</div>
                        <span className="text-[10px] text-amber-600 font-medium">Score &lt; 60%</span>
                      </div>
                    </div>

                    {/* Department-Specific Assessment & Interview Operations Hub */}
                    <AssessmentMonitoringWidget 
                      collegeId={currentUser?.collegeId}
                      department={selectedDeptForProgress.name}
                      hideScopeSelector={true}
                      titlePrefix={selectedDeptForProgress.name}
                    />

                    {/* Progress Roster */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 text-xs uppercase tracking-wider">Department Student Roster</span>
                        <span className="text-[11px] text-neutral-500">{deptStudents.length} Students Listed</span>
                      </div>

                      <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium">
                              <th className="py-2.5 px-4">Candidate</th>
                              <th className="py-2.5 px-4">Roll Number</th>
                              <th className="py-2.5 px-4">Assigned Program</th>
                              <th className="py-2.5 px-4">Readiness</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {deptStudents.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-neutral-400">
                                  No candidates currently enrolled in {selectedDeptForProgress.name}.
                                </td>
                              </tr>
                            ) : (
                              deptStudents.map(s => (
                                <tr key={s.id} className="hover:bg-neutral-50/50">
                                  <td className="py-2.5 px-4 font-semibold text-neutral-900">
                                    {s.name}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-neutral-500">
                                    <div className="flex items-center space-x-1.5">
                                      <span>{s.rollNumber || '—'}</span>
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                                        Batch {s.batchYear || 2026}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-100">
                                      {s.programName || s.track || 'General Stream'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <span className={`font-bold ${s.score >= 75 ? 'text-emerald-600' : 'text-neutral-900'}`}>
                                      {s.score || 70}%
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SINGLE STUDENT INTAKE (BLACK BLURRED BACKGROUND) */}
      {/* ========================================================================= */}
      {singleStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 shrink-0">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-neutral-900" />
                <h3 className="text-sm font-semibold text-neutral-900">Add Single Student</h3>
              </div>
              <button onClick={() => setSingleStudentModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSingleStudentIntake} className="p-6 space-y-4 text-xs overflow-y-auto">
              {/* Mandatory Batch Year - Asked First */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-neutral-900 text-xs">
                    Target Graduating Batch Year *
                  </label>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                    Mandatory Step 1
                  </span>
                </div>
                <input
                  type="number"
                  required
                  min="2020"
                  max="2040"
                  placeholder="e.g. 2028"
                  value={singleStuBatch}
                  onChange={(e) => setSingleStuBatch(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-neutral-900 focus:outline-none focus:border-amber-600 text-sm"
                />
                <p className="text-[11px] text-amber-900/80">
                  Specify candidate's graduating batch (e.g. <strong>2028</strong>). Required to track tenure and permit Super Admin graduated batch purge upon college completion.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sudharshan R"
                    value={singleStuName}
                    onChange={(e) => setSingleStuName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 22CS1099"
                    value={singleStuRoll}
                    onChange={(e) => setSingleStuRoll(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono uppercase focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">College Email (User ID) *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={singleStuEmail}
                    onChange={(e) => setSingleStuEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Initial Password *</label>
                  <input
                    type="text"
                    required
                    value={singleStuPassword}
                    onChange={(e) => setSingleStuPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <CustomSelect
                  label="Academic Department"
                  required
                  value={singleStuDept}
                  onChange={setSingleStuDept}
                  placeholder="Select Academic Department..."
                  icon={<Building2 className="w-3.5 h-3.5 text-neutral-500" />}
                  options={departments.map(d => ({
                    value: d.name,
                    label: `${d.name} (${d.code})`,
                    badge: d.code,
                    icon: <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                  }))}
                />
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <span className="font-semibold text-neutral-900 block">Initial Program Assignment (Optional)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CustomSelect
                    value={singleStuProg}
                    onChange={(val) => {
                      setSingleStuProg(val);
                      setSingleStuSubProg('');
                    }}
                    placeholder="-- No Specialized Program --"
                    icon={<span className="text-xs">🎯</span>}
                    options={[
                      {
                        value: '',
                        label: '-- No Specialized Program --',
                        badge: 'General',
                        icon: <span className="text-xs">🌐</span>
                      },
                      ...programs.map(p => ({
                        value: p.name,
                        label: p.name,
                        badge: p.code,
                        icon: <span className="text-xs">🎯</span>,
                        description: p.description
                      }))
                    ]}
                  />

                  {singleStuProg && (() => {
                    const matchedProg = programs.find(p => p.name === singleStuProg);
                    if (!matchedProg?.hasSubPrograms || !matchedProg.subPrograms?.length) return null;
                    return (
                      <CustomSelect
                        value={singleStuSubProg}
                        onChange={setSingleStuSubProg}
                        placeholder="-- All Sub-Tiers --"
                        icon={<span className="text-xs">⚡</span>}
                        options={[
                          {
                            value: '',
                            label: '-- All Sub-Tiers --',
                            badge: 'All'
                          },
                          ...matchedProg.subPrograms.map(sub => ({
                            value: sub,
                            label: sub,
                            badge: 'Tier'
                          }))
                        ]}
                      />
                    );
                  })()}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSingleStudentModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-semibold shadow-xs cursor-pointer"
                >
                  Enroll Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE TRAINING PROGRAM */}
      {/* ========================================================================= */}
      {createProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
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
              {/* Copy / Clone Existing Program (e.g. Hope) */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-950 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Copy / Clone from Existing Program (e.g. Hope)</span>
                  </span>
                  {selectedProgramToCopy && (
                    <button
                      type="button"
                      onClick={clearProgramCopy}
                      className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold cursor-pointer"
                    >
                      Clear Copied Template
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-blue-800">
                  Select an existing program to automatically copy all its rules, duration, passing thresholds, permissions, and enrolled students.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <select
                    value={selectedProgramToCopy}
                    onChange={(e) => handleCopyFromProgram(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-blue-200 rounded-xl text-xs text-neutral-800 focus:outline-none"
                  >
                    <option value="">-- Start from Scratch --</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>
                        📋 Copy from: {p.name} ({p.code})
                      </option>
                    ))}
                  </select>

                  {selectedProgramToCopy && (
                    <label className="flex items-center space-x-2 px-3 py-1.5 bg-white/90 border border-blue-200 rounded-xl cursor-pointer text-xs text-blue-950">
                      <input
                        type="checkbox"
                        checked={copyEnrolledStudents}
                        onChange={(e) => setCopyEnrolledStudents(e.target.checked)}
                        className="rounded text-neutral-900 focus:ring-0"
                      />
                      <span className="font-semibold text-[11px]">Copy enrolled students &amp; access</span>
                    </label>
                  )}
                </div>
              </div>

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
                  placeholder="Goals, target student batch, or recruitment focus..."
                  value={progDesc}
                  onChange={(e) => setProgDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              {/* Assign Program Admin Section */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-3">
                <div>
                  <span className="font-semibold text-blue-950">Assign Program Administrator</span>
                  <p className="text-[11px] text-blue-800/80">User ID will strictly be their email.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First Name (e.g. Swaminathan)"
                    value={progAdminFirstName}
                    onChange={(e) => setProgAdminFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Last Name (e.g. K)"
                    value={progAdminLastName}
                    onChange={(e) => setProgAdminLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none"
                  />
                </div>

                <input
                  type="email"
                  placeholder="admin.email@college.edu (User ID)"
                  value={progAdminEmail}
                  onChange={(e) => setProgAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCreateProgramModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-semibold shadow-xs cursor-pointer"
                >
                  Save &amp; Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAFEGUARD DELETE PROGRAM */}
      {/* ========================================================================= */}
      {safeguardDeleteModal.isOpen && safeguardDeleteModal.program && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-red-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center space-x-2 text-red-600 font-bold">
              <Lock className="w-4 h-4" />
              <span>Institutional Safeguard Verification</span>
            </div>

            <p className="text-neutral-700 leading-relaxed">
              Deleting <strong>&quot;{safeguardDeleteModal.program.name}&quot;</strong> will permanently remove this track and affect its enrolled students.
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-[11px]">
              To verify deletion, type <span className="font-mono font-bold select-all">{safeguardDeleteModal.program.name}</span> or <span className="font-mono font-bold select-all">CONFIRM_MODIFY</span> below:
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
                onClick={() => setSafeguardDeleteModal({ isOpen: false, program: null })}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSafeguardDelete}
                disabled={!safeguardInput.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Verify &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD DEPARTMENT */}
      {/* ========================================================================= */}
      {createDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
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
                <label className="block font-medium text-neutral-700 mb-1">Department Admin Name (Counselor) *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. S. Meenakshi"
                  value={deptAdminName}
                  onChange={(e) => setDeptAdminName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Admin Email (User ID) *</label>
                <input
                  type="email"
                  required
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
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-semibold shadow-xs cursor-pointer"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT DEPARTMENT & ADMIN (SUPER ADMIN CAPABILITY) */}
      {/* ========================================================================= */}
      {editDeptModal && selectedDeptToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-neutral-900 text-sm">Edit Department &amp; Admin Details</h3>
              </div>
              <button onClick={() => setEditDeptModal(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeptEdit} className="space-y-3.5">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Information Technology"
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="IT"
                  value={editDeptCode}
                  onChange={(e) => setEditDeptCode(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono uppercase focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Department Admin Name (Counselor) *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. S. Meenakshi"
                  value={editDeptAdminName}
                  onChange={(e) => setEditDeptAdminName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Admin Email (User ID) *</label>
                <input
                  type="email"
                  required
                  placeholder="admin.it@college.edu"
                  value={editDeptAdminEmail}
                  onChange={(e) => setEditDeptAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditDeptModal(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-semibold shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE DEPARTMENT CONFIRMATION (SUPER ADMIN) */}
      {/* ========================================================================= */}
      {deleteDeptModal.isOpen && deleteDeptModal.department && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-rose-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">Remove Academic Department</h3>
                <p className="text-xs text-neutral-500">Confirm department deletion</p>
              </div>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed">
              Are you sure you want to remove <strong>&quot;{deleteDeptModal.department.name}&quot;</strong> ({deleteDeptModal.department.code})?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1">
              <span className="font-bold block">⚠️ Notice:</span>
              <p>Removing this department will unlist its administrative entry. Students enrolled under this department will keep their test histories and profiles intact.</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteDeptModal({ isOpen: false, department: null })}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDept}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Department</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK INTAKE STUDENTS CSV */}
      {/* ========================================================================= */}
      {bulkIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-neutral-900" />
                <h3 className="font-semibold text-neutral-900 text-sm">Assign Students via CSV File</h3>
              </div>
              <button onClick={() => setBulkIntakeModal(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanatory Assignment Rules Banner */}
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 space-y-2 text-xs">
              <div className="font-bold flex items-center space-x-1.5 text-blue-950">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Conditional Program &amp; Department Routing</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Provide a CSV containing: <strong className="font-mono">Name</strong>, <strong className="font-mono">College Given Mail ID</strong>, and <strong className="font-mono">Program Name</strong> or <strong className="font-mono">Department Name</strong>.
              </p>
              <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 text-[11px] space-y-1">
                <div className="flex items-start space-x-1.5">
                  <span className="font-bold text-blue-700 shrink-0">• If Program Name is present:</span>
                  <span className="text-neutral-700">Assigns the candidate directly to that training program (e.g., <strong>Hope</strong>, <strong>Cloud Computing &amp; DevOps</strong>).</span>
                </div>
                <div className="flex items-start space-x-1.5">
                  <span className="font-bold text-blue-700 shrink-0">• Else if Department Name is present:</span>
                  <span className="text-neutral-700">Assigns candidate directly to their academic department (e.g., <strong>Information Technology</strong>).</span>
                </div>
              </div>
            </div>

            {/* Mandatory Batch Year Selection - Asked First */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <label className="block font-bold text-neutral-900 text-xs">
                  Target Graduating Batch Year *
                </label>
                <p className="text-[11px] text-amber-900/80">
                  Select graduating batch. Students in this CSV default to this batch unless specified per row.
                </p>
              </div>
              <input
                type="number"
                required
                min="2020"
                max="2040"
                value={intakeTargetBatch}
                onChange={(e) => setIntakeTargetBatch(Number(e.target.value))}
                className="w-28 px-3 py-1.5 bg-white border border-amber-300 rounded-xl font-bold text-neutral-900 text-sm focus:outline-none focus:border-amber-600 text-center"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
              <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 cursor-pointer text-neutral-800 font-medium shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-neutral-600" />
                <span>Upload CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleIntakeFileUpload}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={downloadSampleIntakeCSV}
                className="px-2.5 py-1 text-xs bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 flex items-center space-x-1 cursor-pointer text-neutral-700 shadow-2xs"
              >
                <Download className="w-3 h-3" />
                <span>Sample CSV Template</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={csvIntakeText}
              onChange={(e) => setCsvIntakeText(e.target.value)}
              placeholder="Name,College Given Mail ID,Program Name,Department Name,Roll Number,Batch Year&#10;Bavan Balaji,bavan.b@college.edu,Hope,Information Technology,22IT1042,2028&#10;Keerthana R,keerthana.r@college.edu,Hope,Computer Science & Engineering,22CS1055,2028&#10;Naveen Kumar,naveen.k@college.edu,,Information Technology,22IT1088,2028&#10;Divya Shree,divya.s@college.edu,,Computer Science & Engineering,22CS1090,2028"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-neutral-900"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkIntakeModal(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkIntake}
                disabled={!csvIntakeText.trim()}
                className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Assign &amp; Ingest Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK SCRUTINY PROGRAM ALLOCATION CSV */}
      {/* ========================================================================= */}
      {bulkScrutinyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-neutral-900 text-sm">Assign Students to Programs (CSV)</h3>
              </div>
              <button onClick={() => setBulkScrutinyModal(false)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-4 h-4" />
              </button>
            </div>

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
              placeholder="Roll Number Or Email,Program Name,Sub Program Or Track&#10;22CS1084,Advanced Technical Readiness,Elite Track&#10;karthik.r@college.edu,Cloud Systems,Cloud Computing & DevOps"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-neutral-900"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkScrutinyModal(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkScrutiny}
                disabled={!csvScrutinyText.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Assign Programs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK CREATE DEPARTMENTS CSV (STRICTLY FOR DEPARTMENTS, NOT PROGRAMS) */}
      {/* ========================================================================= */}
      {bulkDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-neutral-900" />
                <h3 className="font-semibold text-neutral-900 text-sm">Bulk Create Academic Departments (CSV)</h3>
              </div>
              <button onClick={() => setBulkDeptModal(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Department-Only Notice */}
            <div className="p-3 bg-neutral-900 text-white rounded-2xl space-y-1 text-xs">
              <div className="flex items-center space-x-2 font-bold text-amber-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Exclusively for Academic Departments &amp; Admins</span>
              </div>
              <p className="text-[11px] text-neutral-300">
                This setup creates academic engineering departments (e.g., CSE, IT, ECE) and designates their Department Admins / Counselors. Training Programs (e.g. Hope) are managed separately under the Programs tab.
              </p>
            </div>

            <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
              <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 cursor-pointer text-neutral-800 font-medium shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-neutral-600" />
                <span>Upload CSV File</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleDeptFileUpload}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={downloadSampleDeptCSV}
                className="px-2.5 py-1 text-xs bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 flex items-center space-x-1 cursor-pointer text-neutral-700 shadow-2xs font-medium"
              >
                <Download className="w-3 h-3" />
                <span>Sample CSV Template</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={csvDeptText}
              onChange={(e) => setCsvDeptText(e.target.value)}
              placeholder="Department Name,Department Code,Admin Name,Admin Email&#10;Computer Science & Engineering,CSE,Dr. K. Swaminathan,swaminathan@college.edu&#10;Information Technology,IT,Dr. B. Vijayalakshmi,vijayalakshmi@college.edu&#10;Electronics & Communication Engineering,ECE,Dr. P. Rajesh,rajesh.p@college.edu&#10;Mechanical Engineering,MECH,Dr. S. Sundar,sundar.s@college.edu"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-neutral-900"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeptModal(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkCreateDepartments}
                disabled={!csvDeptText.trim()}
                className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Create Departments &amp; Admins
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PURGE GRADUATED BATCH (SUPER ADMIN ONLY SAFEGUARD) */}
      {/* ========================================================================= */}
      {purgeBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-rose-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2 text-rose-600">
                <Trash2 className="w-4 h-4" />
                <h3 className="font-bold text-neutral-900 text-sm">Purge Graduated Batch of Students</h3>
              </div>
              <button onClick={() => setPurgeBatchModal(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-1.5">
              <div className="font-bold flex items-center space-x-1.5 text-rose-950">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Super Admin Safeguarded Purge</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                When a batch has graduated and completed college (e.g. <strong>Batch 2028</strong>), Super Admin can completely remove their candidate profiles, accounts, and test submissions from the system to preserve institutional memory and quota.
              </p>
              <p className="text-[11px] font-bold text-rose-900">
                ⚠️ Warning: This permanent deletion cannot be undone.
              </p>
            </div>

            <div>
              <label className="block font-bold text-neutral-900 mb-1">
                Select Graduated Batch to Purge *
              </label>
              <select
                value={purgeBatchYear}
                onChange={(e) => setPurgeBatchYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-semibold text-neutral-900 text-xs focus:outline-none focus:border-rose-600"
              >
                {batchYearStats.map(b => (
                  <option key={b.year} value={b.year}>
                    Batch {b.year} ({b.count} candidate{b.count === 1 ? '' : 's'} enrolled)
                  </option>
                ))}
                {batchYearStats.length === 0 && (
                  <option value={2024}>Batch 2024 (0 candidates)</option>
                )}
              </select>
            </div>

            {/* Targeted Count Callout */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-neutral-500 block">Candidates Targeted for Removal</span>
                <span className="text-base font-bold text-neutral-900">
                  {students.filter(s => (s.batchYear || 2026) === purgeBatchYear).length} Students
                </span>
              </div>
              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-mono text-[11px] font-bold">
                Batch {purgeBatchYear}
              </span>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Type <span className="font-mono font-bold text-rose-600">PURGE {purgeBatchYear}</span> to confirm permanent deletion:
              </label>
              <input
                type="text"
                placeholder={`PURGE ${purgeBatchYear}`}
                value={purgeVerificationInput}
                onChange={(e) => setPurgeVerificationInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl font-mono text-xs uppercase focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPurgeBatchModal(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeBatch}
                disabled={purgeVerificationInput.trim().toUpperCase() !== `PURGE ${purgeBatchYear}`}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Purge Batch {purgeBatchYear}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN SESSION MODAL */}
      {/* ========================================================================= */}
      {assignModalOpen && (
        <AssignSessionModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          onSuccess={(asg) => {
            setAssignModalOpen(false);
            logger.info('ASSIGN', `Assessment assigned: "${asg.title}"`);
            setFeedback({
              type: 'success',
              message: `Successfully dispatched drill "${asg.title}"!`
            });
          }}
          defaultRole="SUPER_ADMIN"
          defaultTargetScope={assignTargetScope}
          defaultProgramName={assignProgramName}
          defaultDepartment={assignDepartment}
          studentsList={students}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: STUDENT PROFILE & HISTORY (CLICKING STUDENT NAME) */}
      {/* ========================================================================= */}
      {inspectStudentId && (
        <StudentHistoryModal
          studentId={inspectStudentId}
          onClose={() => setInspectStudentId(null)}
        />
      )}

    </div>
  );
};
