import React, { useState } from 'react';
import { DepartmentClass } from '../../types';
import { MOCK_DEPARTMENT_CLASSES, MOCK_DEPARTMENT_STAFF } from '../../data/mockData';
import { 
  Building2, 
  Users, 
  Upload, 
  Download, 
  Plus, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  X,
  Layers,
  GraduationCap,
  Search,
  Edit2,
  UserCheck
} from 'lucide-react';
import { CustomSelect, CustomSelectOption } from './CustomSelect';

export const normalizeStaffKey = (name?: string): string => {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const SEMESTER_OPTIONS: CustomSelectOption[] = [
  { value: 'Semester 1', label: 'Semester 1' },
  { value: 'Semester 2', label: 'Semester 2' },
  { value: 'Semester 3', label: 'Semester 3' },
  { value: 'Semester 4', label: 'Semester 4' },
  { value: 'Semester 5', label: 'Semester 5' },
  { value: 'Semester 6', label: 'Semester 6' },
  { value: 'Semester 7', label: 'Semester 7' },
  { value: 'Semester 8', label: 'Semester 8' },
];

interface AvailableStaffMember {
  key: string;
  name: string;
  email?: string;
  department?: string;
  role?: string;
}

interface DepartmentClassesManagerProps {
  departmentFilter?: string;
  collegeId?: string;
  onStudentsAssigned?: (assignedCount: number, className: string) => void;
}

export const normalizeDepartment = (dept?: string): string => {
  if (!dept) return '';
  return dept.toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const isStaffInDepartment = (staffDept?: string, targetDept?: string): boolean => {
  if (!staffDept || !targetDept) return false;
  const sNorm = normalizeDepartment(staffDept);
  const tNorm = normalizeDepartment(targetDept);
  if (!sNorm || !tNorm) return false;

  // Direct exact match
  if (sNorm === tNorm) return true;

  // Department Alias mappings
  const deptAliases: Record<string, string[]> = {
    it: ['informationtechnology', 'it', 'infotech', 'informationtech', 'infotechnology', 'cloudcomputingit'],
    cse: ['computerscience', 'computerscienceengineering', 'computerscienceandengineering', 'cse', 'cs'],
    ece: ['electronicscommunication', 'electronicscommunicationengineering', 'electronicsandcommunicationengineering', 'ece'],
    eee: ['electricalelectronics', 'electricalelectronicsengineering', 'electricalandelectronicsengineering', 'eee'],
    aids: ['artificialintelligencedatascience', 'artificialintelligenceanddatascience', 'aids', 'aianddatascience', 'aidatascience'],
    mech: ['mechanicalengineering', 'mechanical', 'mech'],
    civil: ['civilengineering', 'civil'],
  };

  for (const aliases of Object.values(deptAliases)) {
    const sMatches = aliases.some(a => sNorm === a || sNorm.includes(a) || a.includes(sNorm));
    const tMatches = aliases.some(a => tNorm === a || tNorm.includes(a) || a.includes(tNorm));
    if (sMatches && tMatches) {
      return true;
    }
  }

  // Exact substring boundary check if no alias matched
  if (sNorm.includes(tNorm) || tNorm.includes(sNorm)) {
    return true;
  }

  return false;
};

export const DepartmentClassesManager: React.FC<DepartmentClassesManagerProps> = ({
  departmentFilter,
  onStudentsAssigned
}) => {
  // Load saved classes or fallback to mock classes
  const [classes, setClasses] = useState<DepartmentClass[]>(() => {
    try {
      const saved = localStorage.getItem('crp_department_classes');
      if (saved) return JSON.parse(saved);
    } catch {}
    return MOCK_DEPARTMENT_CLASSES;
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Class Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDept, setNewClassDept] = useState(departmentFilter || 'Information Technology');
  const [newClassBatch, setNewClassBatch] = useState<number>(2028);
  const [newClassSemester, setNewClassSemester] = useState('Semester 5');
  const [newClassFaculty, setNewClassFaculty] = useState('');

  // Edit Class Modal state
  const [editClassModalOpen, setEditClassModalOpen] = useState(false);
  const [selectedClassToEdit, setSelectedClassToEdit] = useState<DepartmentClass | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassDept, setEditClassDept] = useState('');
  const [editClassBatch, setEditClassBatch] = useState<number>(2028);
  const [editClassSemester, setEditClassSemester] = useState('Semester 5');
  const [editClassFaculty, setEditClassFaculty] = useState('');

  // Delete Class Confirmation Modal state
  const [deleteConfirmClass, setDeleteConfirmClass] = useState<DepartmentClass | null>(null);

  // Search state across classes
  const [classSearchInput, setClassSearchInput] = useState('');
  const [classSearchQuery, setClassSearchQuery] = useState('');

  // Bulk Create Classes Modal
  const [bulkClassModalOpen, setBulkClassModalOpen] = useState(false);
  const [bulkClassCsvText, setBulkClassCsvText] = useState('');
  const [bulkClassFileName, setBulkClassFileName] = useState('');
  const [bulkClassError, setBulkClassError] = useState<string | null>(null);

  // Bulk CSV Upload Modal
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [csvFileName, setCsvFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<Array<{ rollNumber: string; name: string; email: string; department?: string; className?: string }>>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const saveClasses = (updated: DepartmentClass[]) => {
    setClasses(updated);
    try {
      localStorage.setItem('crp_department_classes', JSON.stringify(updated));
    } catch {}
  };

  // Aggregated institutional staff members available for counselor assignment
  const availableStaff = React.useMemo<AvailableStaffMember[]>(() => {
    const staffMap = new Map<string, AvailableStaffMember>();

    const registerStaff = (
      id: string,
      name?: string,
      email?: string,
      department?: string,
      role?: string
    ) => {
      if (!name || !name.trim()) return;
      const cleanName = name.trim();
      const normKey = normalizeStaffKey(cleanName);
      if (!normKey) return;

      const existing = staffMap.get(normKey);
      // Prefer name with dots/initials (e.g. Dr. B. Vijayalakshmi over Dr B Vijayalakshmi)
      const preferredName = cleanName.includes('.') ? cleanName : (existing?.name || cleanName);

      staffMap.set(normKey, {
        key: existing?.key || id,
        name: preferredName,
        email: email || existing?.email,
        department: department || existing?.department,
        role: role || existing?.role || 'Department Faculty'
      });
    };

    // 1. Standard default institutional faculty & counselors
    const defaultStaff = [
      { key: 'def-1', name: 'Dr. B. Vijayalakshmi', email: 'admin.it@college.edu', department: 'Information Technology', role: 'Associate Professor & Class Counselor' },
      { key: 'def-2', name: 'Prof. K. Venkatesh', email: 'venkatesh.k@college.edu', department: 'Information Technology', role: 'Senior Assistant Professor' },
      { key: 'def-3', name: 'Dr. A. Murugan', email: 'admin.cse@college.edu', department: 'Computer Science & Engineering', role: 'Professor & Counselor' },
      { key: 'def-4', name: 'Dr. S. Ranganathan', email: 'ranganathan.s@college.edu', department: 'Information Technology', role: 'Professor & Research Mentor' },
      { key: 'def-5', name: 'Dr. K. Chandrasekar', email: 'admin.ece@college.edu', department: 'Electronics & Communication', role: 'Associate Professor' },
      { key: 'def-6', name: 'Dr. M. Sangeetha', email: 'admin.aids@college.edu', department: 'Artificial Intelligence & Data Science', role: 'Counselor' },
      { key: 'def-7', name: 'Dr. R. Kannan', email: 'admin.mech@college.edu', department: 'Mechanical Engineering', role: 'Assistant Professor' },
      { key: 'def-8', name: 'Dr. V. Ramanathan', email: 'admin.ies@college.edu', department: 'Information & Electrical Sciences', role: 'Faculty Counselor' },
      { key: 'def-9', name: 'Prof. Hope Administrator', email: 'hope@college.edu', department: 'Academic Coordination', role: 'Program Admin' },
    ];
    defaultStaff.forEach(s => registerStaff(s.key, s.name, s.email, s.department, s.role));

    // 2. MOCK_DEPARTMENT_STAFF from mockData (standard department staff directory)
    if (Array.isArray(MOCK_DEPARTMENT_STAFF)) {
      MOCK_DEPARTMENT_STAFF.forEach((s: any, idx: number) => {
        if (s && s.name) {
          registerStaff(s.id || `mockstaff-${idx}`, s.name, s.email, s.department, s.designation);
        }
      });
    }

    // 3. LocalStorage crp_department_staff (Department Faculty Directory added by Dept Admins)
    try {
      const deptStaff = JSON.parse(localStorage.getItem('crp_department_staff') || '[]');
      if (Array.isArray(deptStaff)) {
        deptStaff.forEach((s: any, idx: number) => {
          if (s && s.name) {
            registerStaff(s.id || `deptstaff-${idx}`, s.name, s.email, s.department, s.designation);
          }
        });
      }
    } catch {}

    // 4. LocalStorage admin_faculty_mentors
    try {
      const mentors = JSON.parse(localStorage.getItem('admin_faculty_mentors') || '[]');
      if (Array.isArray(mentors)) {
        mentors.forEach((m: any, idx: number) => {
          if (m && m.name) {
            registerStaff(m.id || `mentor-${idx}`, m.name, m.email, m.department, 'Faculty Mentor');
          }
        });
      }
    } catch {}

    // 5. LocalStorage college_registered_users (mentors, counsellors, dept admins, program admins)
    try {
      const regUsers = JSON.parse(localStorage.getItem('college_registered_users') || '[]');
      if (Array.isArray(regUsers)) {
        regUsers.forEach((u: any, idx: number) => {
          const role = (u.role || '').toUpperCase();
          if (['FACULTY_MENTOR', 'COUNSELLOR', 'DEPARTMENT_ADMIN', 'PROGRAM_ADMIN', 'SUPER_ADMIN'].includes(role)) {
            if (u.name) {
              registerStaff(u.id || `reguser-${idx}`, u.name, u.email, u.department, role.replace(/_/g, ' '));
            }
          }
        });
      }
    } catch {}

    // 6. Platform departments assigned admins
    try {
      const depts = JSON.parse(localStorage.getItem('platform_departments') || '[]');
      if (Array.isArray(depts)) {
        depts.forEach((d: any, idx: number) => {
          if (d && d.assignedAdminName) {
            registerStaff(`deptadmin-${idx}`, d.assignedAdminName, d.assignedAdminEmail, d.name, 'Department Admin / Counselor');
          }
        });
      }
    } catch {}

    // 7. Existing classes faculty
    classes.forEach((c, idx) => {
      if (c.facultyInCharge && c.facultyInCharge.trim() && c.facultyInCharge.trim().toLowerCase() !== 'assigned counselor') {
        registerStaff(`clsfac-${idx}`, c.facultyInCharge, undefined, c.department, 'Class Counselor');
      }
    });

    return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [classes]);

  // Strict department staff for Create Modal (only staff belonging to newClassDept)
  const newClassMatchingStaff = React.useMemo(() => {
    const dept = (newClassDept || departmentFilter || '').trim();
    if (!dept) return [];
    return availableStaff.filter(s => isStaffInDepartment(s.department, dept));
  }, [availableStaff, newClassDept, departmentFilter]);

  // Strict department staff for Edit Modal (only staff belonging to editClassDept)
  const editClassMatchingStaff = React.useMemo(() => {
    const dept = (editClassDept || selectedClassToEdit?.department || departmentFilter || '').trim();
    if (!dept) return [];
    return availableStaff.filter(s => isStaffInDepartment(s.department, dept));
  }, [availableStaff, editClassDept, selectedClassToEdit, departmentFilter]);

  // CustomSelect options for Create Modal counselor
  const newClassCounselorOptions = React.useMemo<CustomSelectOption[]>(() => {
    return newClassMatchingStaff.map(staff => ({
      value: staff.name,
      label: staff.name,
      badge: staff.role || 'Faculty',
      icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
      description: staff.email || staff.department
    }));
  }, [newClassMatchingStaff]);

  // CustomSelect options for Edit Modal counselor
  const editClassCounselorOptions = React.useMemo<CustomSelectOption[]>(() => {
    return editClassMatchingStaff.map(staff => ({
      value: staff.name,
      label: staff.name,
      badge: staff.role || 'Faculty',
      icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
      description: staff.email || staff.department
    }));
  }, [editClassMatchingStaff]);

  // Selected faculty info for badge display
  const selectedNewFacultyInfo = React.useMemo(() => {
    if (!newClassFaculty) return null;
    const norm = normalizeStaffKey(newClassFaculty);
    return availableStaff.find(s => normalizeStaffKey(s.name) === norm) || null;
  }, [newClassFaculty, availableStaff]);

  const selectedEditFacultyInfo = React.useMemo(() => {
    if (!editClassFaculty) return null;
    const norm = normalizeStaffKey(editClassFaculty);
    return availableStaff.find(s => normalizeStaffKey(s.name) === norm) || null;
  }, [editClassFaculty, availableStaff]);

  // Filter classes by department and search query (including Batch Year)
  const displayClasses = classes.filter(c => {
    if (departmentFilter && departmentFilter !== 'ALL' && !c.department.toLowerCase().includes(departmentFilter.toLowerCase())) {
      return false;
    }
    if (classSearchQuery.trim()) {
      const q = classSearchQuery.trim().toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchFaculty = (c.facultyInCharge || '').toLowerCase().includes(q);
      const matchBatch = String(c.batchYear || '').includes(q);
      const matchDept = c.department.toLowerCase().includes(q);
      const matchSemester = (c.semester || '').toLowerCase().includes(q);
      if (!matchName && !matchFaculty && !matchBatch && !matchDept && !matchSemester) return false;
    }
    return true;
  });

  // Open Create Class Modal
  const handleOpenCreateClassModal = () => {
    const dept = departmentFilter && departmentFilter !== 'ALL' ? departmentFilter : 'Information Technology';
    setNewClassName('');
    setNewClassDept(dept);
    setNewClassBatch(2028);
    setNewClassSemester('Semester 5');
    const matching = availableStaff.filter(s => isStaffInDepartment(s.department, dept));
    setNewClassFaculty(matching[0]?.name || '');
    setCreateModalOpen(true);
  };

  const handleNewClassDeptChange = (dept: string) => {
    setNewClassDept(dept);
    const matching = availableStaff.filter(s => isStaffInDepartment(s.department, dept));
    if (!matching.some(s => s.name === newClassFaculty)) {
      setNewClassFaculty(matching[0]?.name || '');
    }
  };

  // Handle Create Class
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      setFeedback({ type: 'error', message: 'Class or Section name is required (e.g. 2nd Year IT - Section A).' });
      return;
    }

    const dept = newClassDept.trim() || (departmentFilter && departmentFilter !== 'ALL' ? departmentFilter : 'General Engineering');

    if (!newClassFaculty || !newClassFaculty.trim()) {
      setFeedback({ type: 'error', message: `Please select a Counselor from ${dept}.` });
      return;
    }

    // Verify counselor belongs to this department
    const facultyMember = availableStaff.find(s => s.name.toLowerCase().trim() === newClassFaculty.toLowerCase().trim());
    if (facultyMember && facultyMember.department && !isStaffInDepartment(facultyMember.department, dept)) {
      setFeedback({ 
        type: 'error', 
        message: `Counselor "${newClassFaculty}" belongs to "${facultyMember.department}" and cannot be assigned to "${dept}".` 
      });
      return;
    }

    const newClass: DepartmentClass = {
      id: `cls-${Date.now()}`,
      name: newClassName.trim(),
      department: dept,
      batchYear: Number(newClassBatch) || 2026,
      semester: newClassSemester.trim() || undefined,
      facultyInCharge: newClassFaculty.trim(),
      enrolledStudentCount: 0,
      studentIds: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newClass, ...classes];
    saveClasses(updated);
    setCreateModalOpen(false);
    setNewClassName('');
    setNewClassFaculty('');
    setFeedback({ type: 'success', message: `Class "${newClass.name}" created successfully with counselor ${newClass.facultyInCharge}!` });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Open Edit Class Modal
  const handleOpenEditClass = (cls: DepartmentClass) => {
    setSelectedClassToEdit(cls);
    setEditClassName(cls.name);
    const dept = cls.department || (departmentFilter && departmentFilter !== 'ALL' ? departmentFilter : 'Information Technology');
    setEditClassDept(dept);
    setEditClassBatch(cls.batchYear || 2028);
    setEditClassSemester(cls.semester || 'Semester 5');
    const matching = availableStaff.filter(s => isStaffInDepartment(s.department, dept));
    const currentMatches = matching.some(s => s.name.toLowerCase().trim() === (cls.facultyInCharge || '').toLowerCase().trim());
    if (currentMatches) {
      setEditClassFaculty(cls.facultyInCharge || '');
    } else {
      setEditClassFaculty(matching[0]?.name || '');
    }
    setEditClassModalOpen(true);
  };

  const handleEditClassDeptChange = (dept: string) => {
    setEditClassDept(dept);
    const matching = availableStaff.filter(s => isStaffInDepartment(s.department, dept));
    if (!matching.some(s => s.name === editClassFaculty)) {
      setEditClassFaculty(matching[0]?.name || '');
    }
  };

  // Save Edited Class
  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassToEdit) return;
    if (!editClassName.trim()) {
      setFeedback({ type: 'error', message: 'Class or Section name cannot be empty.' });
      return;
    }

    const dept = editClassDept.trim() || selectedClassToEdit.department;

    if (!editClassFaculty || !editClassFaculty.trim()) {
      setFeedback({ type: 'error', message: `Please select a Counselor from ${dept}.` });
      return;
    }

    // Verify counselor belongs to this department
    const facultyMember = availableStaff.find(s => s.name.toLowerCase().trim() === editClassFaculty.toLowerCase().trim());
    if (facultyMember && facultyMember.department && !isStaffInDepartment(facultyMember.department, dept)) {
      setFeedback({ 
        type: 'error', 
        message: `Counselor "${editClassFaculty}" belongs to "${facultyMember.department}" and cannot be assigned to "${dept}".` 
      });
      return;
    }

    const updated = classes.map(c => {
      if (c.id === selectedClassToEdit.id) {
        return {
          ...c,
          name: editClassName.trim(),
          department: dept,
          batchYear: Number(editClassBatch) || c.batchYear,
          semester: editClassSemester.trim() || c.semester,
          facultyInCharge: editClassFaculty.trim()
        };
      }
      return c;
    });

    saveClasses(updated);
    setEditClassModalOpen(false);
    setSelectedClassToEdit(null);
    setFeedback({ type: 'success', message: `Class "${editClassName.trim()}" updated successfully!` });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Delete Class with Modal or Confirmation
  const handleDeleteClass = (id: string, name: string) => {
    const target = classes.find(c => c.id === id);
    if (target) {
      setDeleteConfirmClass(target);
    } else {
      const updated = classes.filter(c => c.id !== id);
      saveClasses(updated);
      setFeedback({ type: 'success', message: `Class "${name}" removed.` });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleConfirmDeleteClass = () => {
    if (!deleteConfirmClass) return;
    const target = deleteConfirmClass;
    const updated = classes.filter(c => c.id !== target.id);
    saveClasses(updated);
    setDeleteConfirmClass(null);
    setFeedback({ type: 'success', message: `Class "${target.name}" removed successfully.` });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Download sample CSV template for bulk creating classes and counselors
  const handleDownloadSampleBulkClassCsv = () => {
    const csvContent = 
`Class Name,Batch Year,Counselor Name,Counselor Email,Semester
3rd Year IT - Section A,2028,Dr. B. Vijayalakshmi,vijayalakshmi.v@college.edu,Semester 5
3rd Year IT - Section B,2028,Prof. R. Venkatesh,venkatesh.r@college.edu,Semester 5
2nd Year IT - Section A,2029,Dr. K. Swaminathan,swaminathan.k@college.edu,Semester 3
2nd Year IT - Section B,2029,Dr. Ananya Sharma,ananya.s@college.edu,Semester 3`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bulk_classes_and_counselors_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkClassFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkClassFileName(file.name);
    setBulkClassError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkClassCsvText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmBulkClassCreation = () => {
    if (!bulkClassCsvText.trim()) {
      setBulkClassError('Please provide CSV content or upload a file.');
      return;
    }

    const lines = bulkClassCsvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setBulkClassError('CSV must include a header row and at least 1 class row.');
      return;
    }

    let startIdx = 0;
    let headerCols: string[] = [];
    const firstLower = lines[0].toLowerCase();
    if (firstLower.includes('class') || firstLower.includes('section') || firstLower.includes('batch') || firstLower.includes('counselor') || firstLower.includes('faculty')) {
      headerCols = lines[0].split(',').map(c => c.trim().toLowerCase().replace(/["']/g, ''));
      startIdx = 1;
    }

    const createdClasses: DepartmentClass[] = [];
    const errors: string[] = [];

    let mentors: any[] = [];
    try {
      mentors = JSON.parse(localStorage.getItem('admin_faculty_mentors') || '[]');
    } catch {}

    let registeredUsers: any[] = [];
    try {
      registeredUsers = JSON.parse(localStorage.getItem('college_registered_users') || '[]');
    } catch {}

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 1) continue;

      let cName = '';
      let bYear = 2028;
      let cFaculty = '';
      let cEmail = '';
      let cSem = 'Semester 5';

      if (headerCols.length > 0) {
        headerCols.forEach((colName, idx) => {
          const val = cols[idx] || '';
          if (colName.includes('class') || colName.includes('section')) cName = val;
          else if (colName.includes('batch')) {
            const num = parseInt(val, 10);
            if (!isNaN(num) && num >= 2000) bYear = num;
          }
          else if ((colName.includes('counselor') || colName.includes('faculty')) && !colName.includes('email') && !colName.includes('mail')) cFaculty = val;
          else if (colName.includes('email') || colName.includes('mail')) cEmail = val;
          else if (colName.includes('sem')) cSem = val;
        });
      }

      // Positional fallbacks
      if (!cName) cName = cols[0] || '';
      if (cols.length >= 2 && !headerCols.length) {
        const num = parseInt(cols[1], 10);
        if (!isNaN(num) && num >= 2000) bYear = num;
      }
      if (cols.length >= 3 && !headerCols.length) cFaculty = cols[2];
      if (cols.length >= 4 && !headerCols.length) {
        if (cols[3].includes('@')) cEmail = cols[3];
        else cSem = cols[3];
      }
      if (cols.length >= 5 && !headerCols.length) {
        if (cols[4].includes('@')) cEmail = cols[4];
        else cSem = cols[4];
      }

      if (!cName.trim()) {
        errors.push(`Row ${i + 1}: Class Name is required.`);
        continue;
      }

      const newCls: DepartmentClass = {
        id: `cls-${Date.now()}-${i}`,
        name: cName.trim(),
        department: departmentFilter || 'Information Technology',
        batchYear: bYear,
        semester: cSem.trim() || undefined,
        facultyInCharge: cFaculty.trim() || 'Assigned Counselor',
        enrolledStudentCount: 0,
        studentIds: [],
        createdAt: new Date().toISOString().split('T')[0]
      };
      createdClasses.push(newCls);

      // Register counselor if email provided
      if (cEmail && cEmail.includes('@')) {
        const counselorName = cFaculty.trim() || 'Faculty Counselor';
        const mIdx = mentors.findIndex(m => m.email?.toLowerCase() === cEmail.toLowerCase());
        if (mIdx === -1) {
          mentors.push({
            id: `fm_${Date.now()}_${i}`,
            name: counselorName,
            email: cEmail.toLowerCase(),
            department: departmentFilter || 'Information Technology',
            assignedMenteesCount: 0
          });
        }

        const uIdx = registeredUsers.findIndex(u => u.email?.toLowerCase() === cEmail.toLowerCase());
        if (uIdx === -1) {
          registeredUsers.push({
            id: `usr_fm_${Date.now()}_${i}`,
            name: counselorName,
            email: cEmail.toLowerCase(),
            password: 'welcome@2026',
            role: 'PROGRAM_ADMIN',
            department: departmentFilter || 'Information Technology',
            permissions: ['CAN_VIEW_STUDENT_PROGRESS', 'CAN_ASSIGN_INTERVIEWS', 'CAN_MANAGE_STUDENTS']
          });
        }
      }
    }

    if (createdClasses.length === 0) {
      setBulkClassError('No valid class rows found in CSV.');
      return;
    }

    try {
      localStorage.setItem('admin_faculty_mentors', JSON.stringify(mentors));
      localStorage.setItem('college_registered_users', JSON.stringify(registeredUsers));
    } catch {}

    const updated = [...createdClasses, ...classes];
    saveClasses(updated);

    setBulkClassModalOpen(false);
    setBulkClassCsvText('');
    setBulkClassFileName('');
    setBulkClassError(null);

    setFeedback({
      type: 'success',
      message: `Successfully created ${createdClasses.length} classes and assigned counselors in bulk!`
    });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Generate and download sample CSV template
  const handleDownloadSampleCsv = () => {
    const csvContent = 
`Roll Number,Student Name,Email,Department,Class Name
21IT1001,Priya Sundaram,priya.s@institution.edu,Information Technology,2nd Year IT - Section A
21IT1002,Rahul Menon,rahul.m@institution.edu,Information Technology,2nd Year IT - Section A
21IT1003,Deepa Krishnan,deepa.k@institution.edu,Information Technology,2nd Year IT - Section A
21IT1004,Venkatesh Rao,venkatesh.r@institution.edu,Information Technology,2nd Year IT - Section A
21IT1005,Ananya Sharma,ananya.s@institution.edu,Information Technology,2nd Year IT - Section A`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'class_students_assignment_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse Uploaded CSV File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setParseError('The uploaded file appears to be empty.');
          return;
        }

        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          setParseError('CSV must include a header row and at least 1 student row.');
          return;
        }

        const parsed: Array<{ rollNumber: string; name: string; email: string; department?: string; className?: string }> = [];

        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          const columns = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (columns.length >= 3) {
            const roll = columns[0];
            const name = columns[1];
            const email = columns[2];
            const dept = columns[3] || undefined;
            const targetClassName = columns[4] || undefined;
            if (roll && name && email) {
              parsed.push({ rollNumber: roll, name, email, department: dept, className: targetClassName });
            }
          }
        }

        if (parsed.length === 0) {
          setParseError('Could not find valid student rows with Roll Number, Name, and Email.');
          return;
        }

        setParsedRows(parsed);
      } catch (err: any) {
        setParseError(`Failed to parse CSV file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Confirm CSV bulk student assignment across classes (e.g. IT A and IT B)
  const handleConfirmCsvAssignment = () => {
    if (parsedRows.length === 0) {
      setParseError('No student rows loaded from CSV.');
      return;
    }

    const hasRowClassNames = parsedRows.some(r => r.className && r.className.trim().length > 0);
    if (!hasRowClassNames && !targetClassId) {
      setParseError('Please select a target class or provide class names in your CSV.');
      return;
    }

    let updated = [...classes];
    const classBreakdown: string[] = [];

    if (hasRowClassNames) {
      const groupCounts: Record<string, number> = {};
      parsedRows.forEach(r => {
        const cName = r.className?.trim() || classes.find(c => c.id === targetClassId)?.name || 'Default Section';
        groupCounts[cName] = (groupCounts[cName] || 0) + 1;
      });

      Object.entries(groupCounts).forEach(([clsName, count]) => {
        const existingClass = updated.find(c => 
          c.name.toLowerCase() === clsName.toLowerCase() ||
          c.name.toLowerCase().includes(clsName.toLowerCase()) ||
          clsName.toLowerCase().includes(c.name.toLowerCase())
        );
        if (existingClass) {
          existingClass.enrolledStudentCount += count;
          classBreakdown.push(`${count} to "${existingClass.name}"`);
        } else {
          const newCls: DepartmentClass = {
            id: `cls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: clsName,
            department: departmentFilter || 'Information Technology',
            batchYear: 2026,
            semester: 'Semester 5',
            facultyInCharge: 'Assigned Counselor',
            enrolledStudentCount: count,
            studentIds: [],
            createdAt: new Date().toISOString().split('T')[0]
          };
          updated.push(newCls);
          classBreakdown.push(`${count} to "${newCls.name}"`);
        }
      });
    } else {
      const targetClass = classes.find(c => c.id === targetClassId);
      if (!targetClass) return;

      const newStudentCount = targetClass.enrolledStudentCount + parsedRows.length;
      updated = classes.map(c => 
        c.id === targetClassId 
          ? { ...c, enrolledStudentCount: newStudentCount }
          : c
      );
      classBreakdown.push(`${parsedRows.length} to "${targetClass.name}"`);
    }

    saveClasses(updated);

    if (onStudentsAssigned) {
      onStudentsAssigned(parsedRows.length, classBreakdown.join(', '));
    }

    setFeedback({
      type: 'success',
      message: `Successfully allocated ${parsedRows.length} students across classes: ${classBreakdown.join(', ')}!`
    });
    setTimeout(() => setFeedback(null), 5000);

    // Reset CSV modal
    setCsvModalOpen(false);
    setParsedRows([]);
    setCsvFileName('');
    setTargetClassId('');
  };

  const openCsvModalForClass = (clsId: string) => {
    setTargetClassId(clsId);
    setParsedRows([]);
    setCsvFileName('');
    setParseError(null);
    setCsvModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Alert banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl flex items-center space-x-3 text-xs font-medium animate-in fade-in duration-200 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Header & Actions */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-neutral-900">
                Department Classes &amp; Sections
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 rounded border border-neutral-200">
                {displayClasses.length} {displayClasses.length === 1 ? 'SECTION' : 'SECTIONS'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBulkClassCsvText('');
                setBulkClassFileName('');
                setBulkClassError(null);
                setBulkClassModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Bulk create classes and assign faculty counselors via CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
              <span>Bulk Create Classes &amp; Counselors (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetClassId(classes[0]?.id || '');
                setParsedRows([]);
                setCsvFileName('');
                setParseError(null);
                setCsvModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Bulk assign department students to classes/sections (e.g. IT A, IT B)"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-600" />
              <span>Bulk Assign Students (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateClassModal}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Class</span>
            </button>
          </div>
        </div>

        {/* Search Bar with dedicated Search Button */}
        <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setClassSearchQuery(classSearchInput);
            }} 
            className="flex items-center gap-2 max-w-md w-full"
          >
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search class, counselor, batch (e.g. 2028)..."
                value={classSearchInput}
                onChange={(e) => {
                  setClassSearchInput(e.target.value);
                  setClassSearchQuery(e.target.value);
                }}
                className="w-full pl-8 pr-7 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
              />
              {classSearchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setClassSearchInput('');
                    setClassSearchQuery('');
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
              title="Search classes and sections"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>

          {classSearchQuery && (
            <div className="text-xs text-neutral-500 flex items-center space-x-2">
              <span>Showing results for &ldquo;<strong>{classSearchQuery}</strong>&rdquo;</span>
              <button
                type="button"
                onClick={() => {
                  setClassSearchInput('');
                  setClassSearchQuery('');
                }}
                className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
        {displayClasses.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-800">
                {classSearchQuery ? 'No matching classes or sections found' : 'No classes or sections configured yet'}
              </h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                {classSearchQuery 
                  ? `No sections matched "${classSearchQuery}". Try adjusting your keywords or clearing the search.`
                  : 'Create sections such as "2nd Year IT - Section A" and assign students in bulk using CSV files.'}
              </p>
            </div>
            {classSearchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setClassSearchInput('');
                  setClassSearchQuery('');
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Search</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreateClassModal}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-black transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Class</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-neutral-500 font-medium">
                  <th className="py-3 px-5">Class / Section</th>
                  <th className="py-3 px-5">Academic Department</th>
                  <th className="py-3 px-5">Batch &amp; Semester</th>
                  <th className="py-3 px-5">Faculty / Counselor</th>
                  <th className="py-3 px-5">Enrolled Students</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {displayClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-neutral-900 text-sm">
                        {cls.name}
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400">Created: {cls.createdAt}</span>
                    </td>
                    <td className="py-3.5 px-5 text-neutral-700 font-medium">
                      {cls.department}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="text-neutral-900 font-medium">Batch of {cls.batchYear}</div>
                      <span className="text-[10px] text-neutral-500">{cls.semester || 'N/A'}</span>
                    </td>
                    <td className="py-3.5 px-5 text-neutral-700">
                      {cls.facultyInCharge || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                        <Users className="w-3 h-3 text-neutral-500" />
                        <span>{cls.enrolledStudentCount} Students</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-1 sm:space-x-2">
                      <button
                        type="button"
                        onClick={() => openCsvModalForClass(cls.id)}
                        className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                        title="Upload CSV to assign students to this class"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Import CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditClass(cls)}
                        className="text-neutral-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer inline-flex items-center"
                        title="Edit Class / Section Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClass(cls.id, cls.name)}
                        className="text-neutral-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center"
                        title="Remove Class / Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE CLASS MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Create Academic Class / Section</h3>
                  <p className="text-xs text-neutral-500">e.g., 2nd Year IT - Section A, 3rd Year CSE</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Class / Section Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2nd Year IT - Section A"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Academic Department
                </label>
                <input
                  type="text"
                  readOnly={Boolean(departmentFilter && departmentFilter !== 'ALL')}
                  disabled={Boolean(departmentFilter && departmentFilter !== 'ALL')}
                  placeholder="e.g. Information Technology"
                  value={newClassDept}
                  onChange={(e) => handleNewClassDeptChange(e.target.value)}
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                    departmentFilter && departmentFilter !== 'ALL' ? 'bg-neutral-100 text-neutral-600 cursor-not-allowed' : ''
                  }`}
                />
                {departmentFilter && departmentFilter !== 'ALL' && (
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Locked to administrative department: <span className="font-semibold text-neutral-600">{departmentFilter}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Batch Year
                  </label>
                  <input
                    type="number"
                    value={newClassBatch}
                    onChange={(e) => setNewClassBatch(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                </div>
                <div className="relative z-30">
                  <CustomSelect
                    label="Semester"
                    value={newClassSemester}
                    onChange={setNewClassSemester}
                    placeholder="Select Semester..."
                    options={SEMESTER_OPTIONS}
                  />
                </div>
              </div>

              <div className="relative z-20">
                <CustomSelect
                  label={`Faculty In-Charge / Counselor (${newClassDept || 'Department'})`}
                  required
                  searchable
                  direction="up"
                  value={newClassFaculty}
                  onChange={setNewClassFaculty}
                  placeholder={`Select ${newClassDept || 'Department'} Counselor (${newClassCounselorOptions.length} Available)...`}
                  icon={<UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  options={newClassCounselorOptions}
                />

                {newClassMatchingStaff.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    No faculty currently registered for <span className="font-semibold">{newClassDept}</span>. 
                    Counselors must belong to this department. Please add faculty in the Staff Directory first.
                  </p>
                )}

                {selectedNewFacultyInfo && (
                  <div className="mt-2 px-3 py-1.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-neutral-800 truncate">{selectedNewFacultyInfo.name}</span>
                      {selectedNewFacultyInfo.role && (
                        <span className="text-neutral-500 font-medium truncate">({selectedNewFacultyInfo.role})</span>
                      )}
                    </div>
                    {selectedNewFacultyInfo.email && (
                      <span className="text-neutral-400 font-mono text-[10px] shrink-0 ml-2">{selectedNewFacultyInfo.email}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-black rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV BULK ASSIGNMENT MODAL */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Assign Students via CSV</h3>
                  <p className="text-xs text-neutral-500">Bulk enroll student records into an academic class</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCsvModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Target Class Selection */}
              <div>
                <CustomSelect
                  label="Target Class / Section"
                  required
                  value={targetClassId}
                  onChange={setTargetClassId}
                  placeholder="Select Target Class..."
                  icon={<GraduationCap className="w-3.5 h-3.5 text-neutral-500" />}
                  options={classes.map(c => ({
                    value: c.id,
                    label: `${c.name} (${c.department})`,
                    badge: `${c.enrolledStudentCount} enrolled`,
                    icon: <GraduationCap className="w-3.5 h-3.5 text-neutral-400" />,
                    description: `Faculty Advisor: ${c.facultyInCharge || 'Assigned'}`
                  }))}
                />
              </div>

              {/* Sample Template Download */}
              <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-neutral-800">CSV Template Format</p>
                  <p className="text-[11px] text-neutral-500">Roll Number, Student Name, Email, Department</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Download Sample</span>
                </button>
              </div>

              {/* File Upload Box */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Upload Student CSV File (.csv) *
                </label>
                <label className="border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-neutral-50">
                  <Upload className="w-6 h-6 text-neutral-400 mb-1.5" />
                  <span className="text-xs font-medium text-neutral-700">
                    {csvFileName ? csvFileName : 'Click to select CSV file from your computer'}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">Supports comma-separated UTF-8 .csv files</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Error Message */}
              {parseError && (
                <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Parsed Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-800">
                      Preview: {parsedRows.length} students found in CSV
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                      Ready to Assign
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100 text-xs">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900">{row.name}</p>
                          <p className="text-[10px] text-neutral-500 font-mono">{row.email}</p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-100 rounded text-neutral-700">
                          {row.rollNumber}
                        </span>
                      </div>
                    ))}
                    {parsedRows.length > 5 && (
                      <div className="p-2 text-center text-[11px] text-neutral-400 bg-neutral-50">
                        + {parsedRows.length - 5} more students...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCsvModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!targetClassId || parsedRows.length === 0}
                  onClick={handleConfirmCsvAssignment}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-black rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Assign {parsedRows.length > 0 ? `${parsedRows.length} Students` : 'to Class'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK CREATE CLASSES & COUNSELORS MODAL */}
      {bulkClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Bulk Create Classes &amp; Assign Counselors</h3>
                  <p className="text-xs text-neutral-500">Provision multiple class sections and link counselors via CSV</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkClassModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkClassError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bulkClassError}</span>
              </div>
            )}

            <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 text-xs">
              <span className="font-mono text-[11px] text-neutral-600">
                Format: Class Name, Batch Year, Counselor Name, Counselor Email, Semester
              </span>
              <button
                type="button"
                onClick={handleDownloadSampleBulkClassCsv}
                className="px-2.5 py-1 text-xs bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 flex items-center space-x-1 cursor-pointer text-neutral-700 shadow-2xs font-medium"
              >
                <Download className="w-3 h-3" />
                <span>Sample CSV</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-center space-x-2 px-4 py-3 bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-xl hover:bg-neutral-100/70 cursor-pointer transition-colors text-xs text-neutral-700 font-medium">
                <Upload className="w-4 h-4 text-neutral-500" />
                <span>{bulkClassFileName ? `File selected: ${bulkClassFileName}` : 'Upload CSV File'}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleBulkClassFileUpload}
                  className="hidden"
                />
              </label>

              <div className="text-[11px] text-neutral-500 text-center">or paste CSV content directly below:</div>

              <textarea
                rows={6}
                value={bulkClassCsvText}
                onChange={(e) => setBulkClassCsvText(e.target.value)}
                placeholder="Class Name,Batch Year,Counselor Name,Counselor Email,Semester&#10;3rd Year IT - Section A,2028,Dr. B. Vijayalakshmi,vijayalakshmi.v@college.edu,Semester 5&#10;3rd Year IT - Section B,2028,Prof. R. Venkatesh,venkatesh.r@college.edu,Semester 5&#10;2nd Year IT - Section A,2029,Dr. K. Swaminathan,swaminathan.k@college.edu,Semester 3&#10;2nd Year IT - Section B,2029,Dr. Ananya Sharma,ananya.s@college.edu,Semester 3"
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono text-[11px] focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setBulkClassModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!bulkClassCsvText.trim()}
                onClick={handleConfirmBulkClassCreation}
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-black rounded-xl transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Create Classes &amp; Assign Counselors</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CLASS MODAL */}
      {editClassModalOpen && selectedClassToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Edit Class / Section Details</h3>
                  <p className="text-xs text-neutral-500">Update section name, counselor, or batch info</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditClassModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditClass} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Class / Section Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2nd Year IT - Section A"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Academic Department
                </label>
                <input
                  type="text"
                  readOnly={Boolean(departmentFilter && departmentFilter !== 'ALL')}
                  disabled={Boolean(departmentFilter && departmentFilter !== 'ALL')}
                  placeholder="e.g. Information Technology"
                  value={editClassDept}
                  onChange={(e) => handleEditClassDeptChange(e.target.value)}
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                    departmentFilter && departmentFilter !== 'ALL' ? 'bg-neutral-100 text-neutral-600 cursor-not-allowed' : ''
                  }`}
                />
                {departmentFilter && departmentFilter !== 'ALL' && (
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Locked to administrative department: <span className="font-semibold text-neutral-600">{departmentFilter}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Graduating Batch Year *
                  </label>
                  <input
                    type="number"
                    min="2024"
                    max="2032"
                    value={editClassBatch}
                    onChange={(e) => setEditClassBatch(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                  />
                </div>
                <div className="relative z-30">
                  <CustomSelect
                    label="Current Semester"
                    value={editClassSemester}
                    onChange={setEditClassSemester}
                    placeholder="Select Semester..."
                    options={SEMESTER_OPTIONS}
                  />
                </div>
              </div>

              <div className="relative z-20">
                <CustomSelect
                  label={`Faculty / Counselor in Charge (${editClassDept || 'Department'})`}
                  required
                  searchable
                  direction="up"
                  value={editClassFaculty}
                  onChange={setEditClassFaculty}
                  placeholder={`Select ${editClassDept || 'Department'} Counselor (${editClassCounselorOptions.length} Available)...`}
                  icon={<UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  options={editClassCounselorOptions}
                />

                {editClassMatchingStaff.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    No faculty currently registered for <span className="font-semibold">{editClassDept}</span>. 
                    Counselors must belong to this department. Please add faculty in the Staff Directory first.
                  </p>
                )}

                {selectedEditFacultyInfo && (
                  <div className="mt-2 px-3 py-1.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-neutral-800 truncate">{selectedEditFacultyInfo.name}</span>
                      {selectedEditFacultyInfo.role && (
                        <span className="text-neutral-500 font-medium truncate">({selectedEditFacultyInfo.role})</span>
                      )}
                    </div>
                    {selectedEditFacultyInfo.email && (
                      <span className="text-neutral-400 font-mono text-[10px] shrink-0 ml-2">{selectedEditFacultyInfo.email}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditClassModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-black rounded-xl transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CLASS CONFIRMATION MODAL */}
      {deleteConfirmClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Remove Class / Section</h3>
                <p className="text-xs text-neutral-500">Confirm section removal</p>
              </div>
            </div>

            <p className="text-xs text-neutral-700 leading-relaxed">
              Are you sure you want to remove <strong>&quot;{deleteConfirmClass.name}&quot;</strong>? This section has{' '}
              <strong className="text-neutral-900">{deleteConfirmClass.enrolledStudentCount}</strong> enrolled student{deleteConfirmClass.enrolledStudentCount === 1 ? '' : 's'}. Student records will remain intact, but this section designation will be unlinked.
            </p>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmClass(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Class</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
