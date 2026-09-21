import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { PEP_DOMAINS } from '../../data/mockData';
import { 
  ShieldCheck, 
  UserPlus, 
  Users, 
  GraduationCap, 
  Briefcase, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles,
  Trash2,
  Eye,
  Search,
  Plus,
  X
} from 'lucide-react';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface ProgramAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export const SuperAdminPortal: React.FC = () => {
  const { currentUser } = useApp();
  
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PROGRAM_ADMINS' | 'FACULTY_MENTORS' | 'TRAINERS' | 'STUDENTS'>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data states
  const [systemStats, setSystemStats] = useState({
    programAdminsCount: 0,
    facultyMentorsCount: 0,
    trainersCount: 0,
    studentsCount: 0
  });
  const [programAdmins, setProgramAdmins] = useState<ProgramAdminUser[]>([]);
  const [facultyMentors, setFacultyMentors] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  // Modals
  const [paModalOpen, setPaModalOpen] = useState(false);
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const [trainerModalOpen, setTrainerModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  // Inspector & Delete Modals
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; role: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRollNumber, setFormRollNumber] = useState('');
  const [formDepartment, setFormDepartment] = useState('Computer Science');
  const [formBatchYear, setFormBatchYear] = useState(2026);
  const [formTrack, setFormTrack] = useState<'HOPE_ELITE' | 'HOPE_NON_ELITE' | 'PEP' | 'DEPARTMENT'>('HOPE_ELITE');
  const [formDomain, setFormDomain] = useState('Full Stack Web Architecture');
  const [formMentorId, setFormMentorId] = useState('');
  const [trainerCompany, setTrainerCompany] = useState('Visiting Industry Expert');
  const [trainerStartDate, setTrainerStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [trainerEndDate, setTrainerEndDate] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [stats, pAdmins, fMentors, tList, sList] = await Promise.all([
        api.admin.getSystemStats(),
        api.admin.getProgramAdmins(),
        api.admin.getFacultyMentors(),
        api.admin.getTrainerTenures(),
        api.admin.getStudents()
      ]);
      if (stats) setSystemStats(stats);
      if (pAdmins) setProgramAdmins(pAdmins);
      if (fMentors) setFacultyMentors(fMentors);
      if (tList) setTrainers(tList);
      if (sList) setStudents(sList);
    } catch (err: any) {
      console.error('Error loading Super Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRollNumber('');
    setFormMentorId('');
    setSubmitting(false);
  };

  // 1. Create Program Admin
  const handleCreateProgramAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setSubmitting(true);
    try {
      await api.admin.createProgramAdmin({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword.trim() || 'admin123'
      });
      setFeedback({ type: 'success', message: `Program Admin '${formName}' provisioned successfully!` });
      setPaModalOpen(false);
      resetForm();
      await loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to provision Program Admin.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Create Faculty Mentor
  const handleCreateFacultyMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setSubmitting(true);
    try {
      await api.admin.createFacultyMentor({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword.trim() || 'mentor123'
      });
      setFeedback({ type: 'success', message: `Faculty Mentor '${formName}' onboarded successfully!` });
      setMentorModalOpen(false);
      resetForm();
      await loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to onboard Faculty Mentor.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Onboard Trainer
  const handleOnboardTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;
    setSubmitting(true);
    try {
      await api.admin.onboardTrainer({
        trainerName: formName.trim(),
        trainerEmail: formEmail.trim(),
        companyOrInstitute: trainerCompany.trim(),
        domain: formDomain,
        startDate: trainerStartDate,
        endDate: trainerEndDate
      });
      setFeedback({ type: 'success', message: `Domain Trainer '${formName}' onboarded for ${formDomain}!` });
      setTrainerModalOpen(false);
      resetForm();
      await loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to onboard Domain Trainer.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Enroll Student
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formRollNumber.trim()) return;
    setSubmitting(true);
    try {
      await api.admin.createStudent({
        name: formName.trim(),
        email: formEmail.trim(),
        rollNumber: formRollNumber.trim(),
        department: formDepartment,
        batchYear: Number(formBatchYear),
        track: formTrack,
        domainName: formTrack === 'PEP' ? formDomain : undefined,
        mentorId: formMentorId || undefined,
        password: formPassword.trim() || 'student123'
      });
      setFeedback({ type: 'success', message: `Student '${formName}' enrolled in ${formTrack} successfully!` });
      setStudentModalOpen(false);
      resetForm();
      await loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to enroll student.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Execute Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.admin.deleteUser(deleteTarget.id);
      setFeedback({ type: 'success', message: res.message || `${deleteTarget.name} removed successfully.` });
      setDeleteTarget(null);
      await loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to remove user.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.department?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Portal Header */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              👑
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">Institutional Super Admin Portal</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-md border border-amber-200 font-mono">
                  ROOT SYSTEM GOVERNANCE
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Logged in as: <span className="font-semibold text-neutral-800">{currentUser?.name || 'Super Administrator'}</span> ({currentUser?.email})
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => { setPaModalOpen(true); setFeedback(null); }}
            className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Provision Program Admin</span>
          </button>
          <button 
            onClick={() => { setMentorModalOpen(true); setFeedback(null); }}
            className="flex items-center space-x-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Onboard Faculty Mentor</span>
          </button>
          <button 
            onClick={() => { setTrainerModalOpen(true); setFeedback(null); }}
            className="flex items-center space-x-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Onboard Trainer</span>
          </button>
          <button 
            onClick={() => { setStudentModalOpen(true); setFeedback(null); }}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll Student</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs border flex items-center justify-between ${
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
          <button onClick={() => setFeedback(null)} className="text-xs hover:opacity-70">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 space-x-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-3 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'border-neutral-900 text-neutral-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>System Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('PROGRAM_ADMINS')}
          className={`pb-3 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeTab === 'PROGRAM_ADMINS'
              ? 'border-neutral-900 text-neutral-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Program Admins ({programAdmins.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('FACULTY_MENTORS')}
          className={`pb-3 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeTab === 'FACULTY_MENTORS'
              ? 'border-neutral-900 text-neutral-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Faculty Mentors ({facultyMentors.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('TRAINERS')}
          className={`pb-3 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeTab === 'TRAINERS'
              ? 'border-neutral-900 text-neutral-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Domain Trainers ({trainers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`pb-3 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeTab === 'STUDENTS'
              ? 'border-neutral-900 text-neutral-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>All College Students ({students.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500">Program Admins</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-neutral-900 mt-2">{systemStats.programAdminsCount}</p>
              <p className="text-[10px] text-neutral-400 mt-1">Super Admin Authority</p>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500">Faculty Mentors</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-neutral-900 mt-2">{systemStats.facultyMentorsCount}</p>
              <p className="text-[10px] text-neutral-400 mt-1">Mentee Enrollers</p>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500">Domain Trainers</span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-neutral-900 mt-2">{systemStats.trainersCount}</p>
              <p className="text-[10px] text-neutral-400 mt-1">10–15 Day Active Tenures</p>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-500">Total Students</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-neutral-900 mt-2">{systemStats.studentsCount}</p>
              <p className="text-[10px] text-neutral-400 mt-1">Institutional &amp; External</p>
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center">
              <ShieldCheck className="w-4 h-4 mr-1.5 text-amber-700" />
              Institutional Super Admin Security Policy Active
            </p>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              As the Super Administrator, you hold unrestricted administrative oversight over all 4 subordinate roles. You can view student activity, turn-by-turn speech telemetry, and interview session histories across every track. The root Super Administrator account is permanently protected against deletion.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: PROGRAM ADMINS */}
      {activeTab === 'PROGRAM_ADMINS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Program Administrators</h3>
              <p className="text-xs text-neutral-500">Deans and track leaders provisioned directly by the Super Admin</p>
            </div>
            <button
              onClick={() => setPaModalOpen(true)}
              className="px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-medium hover:bg-black"
            >
              Provision Program Admin
            </button>
          </div>

          {programAdmins.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              <ShieldCheck className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-medium text-neutral-600">No Program Admins provisioned yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-mono text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">ADMINISTRATOR</th>
                    <th className="py-3 px-4">EMAIL</th>
                    <th className="py-3 px-4">ROLE</th>
                    <th className="py-3 px-4">PROVISIONED</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {programAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">{admin.name}</td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{admin.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 font-mono">
                          {admin.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteTarget({ id: admin.id, name: admin.name, role: admin.role })}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FACULTY MENTORS */}
      {activeTab === 'FACULTY_MENTORS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Faculty Mentors</h3>
              <p className="text-xs text-neutral-500">Academic mentors across all engineering departments</p>
            </div>
            <button
              onClick={() => setMentorModalOpen(true)}
              className="px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-medium hover:bg-black"
            >
              Onboard Faculty Mentor
            </button>
          </div>

          {facultyMentors.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              <GraduationCap className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-medium text-neutral-600">No Faculty Mentors onboarded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-mono text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">MENTOR</th>
                    <th className="py-3 px-4">EMAIL</th>
                    <th className="py-3 px-4">ASSIGNED MENTEES</th>
                    <th className="py-3 px-4">JOINED</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {facultyMentors.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">{m.name}</td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{m.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 font-mono">
                          {m.menteeCount || 0} Students
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteTarget({ id: m.id, name: m.name, role: m.role })}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DOMAIN TRAINERS */}
      {activeTab === 'TRAINERS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Visiting Domain Trainers</h3>
              <p className="text-xs text-neutral-500">Industry experts on 10–15 day active tenures (Cannot create students)</p>
            </div>
            <button
              onClick={() => setTrainerModalOpen(true)}
              className="px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-medium hover:bg-black"
            >
              Onboard Trainer
            </button>
          </div>

          {trainers.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              <Sparkles className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-medium text-neutral-600">No Domain Trainers onboarded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-mono text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">TRAINER</th>
                    <th className="py-3 px-4">ORGANIZATION</th>
                    <th className="py-3 px-4">DOMAIN</th>
                    <th className="py-3 px-4">TENURE DATES</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {trainers.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {t.trainerName}
                        <span className="block text-[11px] font-mono text-neutral-400 font-normal">{t.trainerEmail}</span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{t.companyOrInstitute}</td>
                      <td className="py-3 px-4 font-mono font-medium text-purple-700">{t.domain}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                        {t.startDate} → {t.endDate}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {t.isActive ? 'ACTIVE TENURE' : 'EXPIRED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteTarget({ id: t.trainerUserId || t.id, name: t.trainerName, role: 'TRAINER' })}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ALL STUDENTS */}
      {activeTab === 'STUDENTS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">All College Students</h3>
              <p className="text-xs text-neutral-500">Complete student roster with activity inspector and report viewer</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs w-48 focus:outline-none focus:border-neutral-900"
                />
              </div>
              <button
                onClick={() => setStudentModalOpen(true)}
                className="px-3 py-1.5 bg-neutral-900 text-white rounded-xl text-xs font-medium hover:bg-black whitespace-nowrap"
              >
                Enroll Student
              </button>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              <Users className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-medium text-neutral-600">No students found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500 font-mono text-[11px] border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">STUDENT</th>
                    <th className="py-3 px-4">ROLL NUMBER</th>
                    <th className="py-3 px-4">TRACK</th>
                    <th className="py-3 px-4">MENTOR</th>
                    <th className="py-3 px-4">SCORE</th>
                    <th className="py-3 px-4">CHECKLIST</th>
                    <th className="py-3 px-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {s.name}
                        <span className="block text-[11px] font-mono text-neutral-400 font-normal">{s.department}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{s.rollNumber}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-800 font-mono">
                          {s.track}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{s.mentorName || 'Unassigned'}</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        {s.score ? `${s.score}%` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                        {s.checklist || '0/15'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setInspectStudentId(s.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View History</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: s.userId || s.id, name: s.name, role: 'STUDENT' })}
                          className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: PROVISION PROGRAM ADMIN */}
      {paModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Provision Program Administrator</h3>
              <button onClick={() => setPaModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">✕</button>
            </div>
            <form onSubmit={handleCreateProgramAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Rajesh Kumar (Dean)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Institutional Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dean.placement@college.edu"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  placeholder="Default: admin123"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setPaModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium">
                  {submitting ? 'Provisioning...' : 'Provision Program Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ONBOARD FACULTY MENTOR */}
      {mentorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Onboard Faculty Mentor</h3>
              <button onClick={() => setMentorModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">✕</button>
            </div>
            <form onSubmit={handleCreateFacultyMentor} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Faculty Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. S. Ranganathan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ranganathan@college.edu"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Default: mentor123"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setMentorModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium">
                  {submitting ? 'Onboarding...' : 'Onboard Mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ONBOARD TRAINER */}
      {trainerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Onboard Visiting Domain Trainer</h3>
              <button onClick={() => setTrainerModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">✕</button>
            </div>
            <form onSubmit={handleOnboardTrainer} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Trainer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Trainer Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. trainer@techcorp.org"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Assigned Domain *</label>
                <select
                  value={formDomain}
                  onChange={(e) => setFormDomain(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                >
                  {PEP_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={trainerCompany}
                  onChange={(e) => setTrainerCompany(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={trainerStartDate}
                    onChange={(e) => setTrainerStartDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={trainerEndDate}
                    onChange={(e) => setTrainerEndDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setTrainerModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium">
                  {submitting ? 'Onboarding...' : 'Onboard Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ENROLL STUDENT */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Enroll Student Candidate</h3>
              <button onClick={() => setStudentModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">✕</button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Candidate Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bavan Balaji"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. bavan.student@college.edu"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 22CS1001"
                    value={formRollNumber}
                    onChange={(e) => setFormRollNumber(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Batch Year *</label>
                  <input
                    type="number"
                    required
                    value={formBatchYear}
                    onChange={(e) => setFormBatchYear(Number(e.target.value))}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Department *</label>
                <input
                  type="text"
                  required
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Target Track *</label>
                <select
                  value={formTrack}
                  onChange={(e) => setFormTrack(e.target.value as any)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-semibold"
                >
                  <option value="HOPE_ELITE">HOPE ELITE (Tier 1 Accelerator)</option>
                  <option value="HOPE_NON_ELITE">HOPE NON-ELITE (Core Competency)</option>
                  <option value="PEP">PEP (Professional Enhancement Program)</option>
                  <option value="DEPARTMENT">DEPARTMENT STREAM</option>
                </select>
              </div>
              {formTrack === 'PEP' && (
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">PEP Domain</label>
                  <select
                    value={formDomain}
                    onChange={(e) => setFormDomain(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                  >
                    {PEP_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Assign Faculty Mentor</label>
                <select
                  value={formMentorId}
                  onChange={(e) => setFormMentorId(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                >
                  <option value="">Unassigned</option>
                  {facultyMentors.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  placeholder="Default: student123"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 font-mono"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setStudentModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-neutral-50">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium">
                  {submitting ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT FULL HISTORY INSPECTOR MODAL */}
      {inspectStudentId && (
        <StudentHistoryModal
          studentIdOrUserId={inspectStudentId}
          onClose={() => setInspectStudentId(null)}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
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

export default SuperAdminPortal;
