import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { PEP_DOMAINS } from '../../data/mockData';
import { TrainerTenure, InterviewAssignment } from '../../types';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
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
  X
} from 'lucide-react';

export const ProgramAdminPortal: React.FC = () => {
  const { currentUser, assignments, createAssignment, trainerTenures, onboardTrainer, revokeTrainer } = useApp();
  
  const [activeTab, setActiveTab] = useState<'MENTORS' | 'TRAINERS' | 'ASSIGNMENTS' | 'STUDENTS'>('MENTORS');
  const [domains, setDomains] = useState<string[]>(PEP_DOMAINS);
  const [mentors, setMentors] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inspector & Delete Modals
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; role: string; email?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Student Enrollment Modal States
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [stuName, setStuName] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuRollNumber, setStuRollNumber] = useState('');
  const [stuDepartment, setStuDepartment] = useState('Computer Science & Engineering');
  const [stuBatchYear, setStuBatchYear] = useState(2026);
  const [stuTrack, setStuTrack] = useState<'HOPE_ELITE' | 'HOPE_NON_ELITE' | 'PEP' | 'DEPARTMENT'>('HOPE_ELITE');
  const [stuDomain, setStuDomain] = useState('Full Stack Web Architecture');
  const [stuMentorId, setStuMentorId] = useState('');
  const [stuPassword, setStuPassword] = useState('');
  const [stuSubmitting, setStuSubmitting] = useState(false);

  // Modal States
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const [mentorName, setMentorName] = useState('');
  const [mentorEmail, setMentorEmail] = useState('');
  const [mentorPassword, setMentorPassword] = useState('');

  const [trainerModalOpen, setTrainerModalOpen] = useState(false);
  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [trainerDomain, setTrainerDomain] = useState('Full Stack Web Architecture');
  const [trainerCompany, setTrainerCompany] = useState('Industry Expert / Visiting Mentor');
  const [trainerStartDate, setTrainerStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [trainerEndDate, setTrainerEndDate] = useState(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const [asgModalOpen, setAsgModalOpen] = useState(false);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgTarget, setAsgTarget] = useState('HOPE_ELITE');
  const [asgDueDate, setAsgDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const [dList, mList, sList] = await Promise.all([
        api.admin.getPepDomains(),
        api.admin.getFacultyMentors(),
        api.admin.getStudents()
      ]);
      if (dList && dList.length > 0) setDomains(dList);
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

  const handleOnboardTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerName.trim() || !trainerEmail.trim()) return;

    try {
      await onboardTrainer({
        trainerName: trainerName.trim(),
        trainerEmail: trainerEmail.trim(),
        companyOrInstitute: trainerCompany.trim(),
        domain: trainerDomain,
        startDate: trainerStartDate,
        endDate: trainerEndDate
      });
      setFeedback({ type: 'success', message: `Domain Trainer '${trainerName}' onboarded for ${trainerDomain}!` });
      setTrainerName('');
      setTrainerEmail('');
      setTrainerModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to onboard Domain Trainer.' });
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim()) return;

    try {
      await createAssignment({
        title: asgTitle.trim(),
        assignedByRole: 'PROGRAM_ADMIN',
        assignedByName: currentUser?.name || 'Program Administrator',
        targetDomainOrTrack: asgTarget,
        dueDate: asgDueDate,
        isMandatory: true
      });
      setFeedback({ type: 'success', message: `Assignment '${asgTitle}' dispatched successfully!` });
      setAsgTitle('');
      setAsgModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to dispatch assignment.' });
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
      await api.admin.createStudent({
        name: stuName.trim(),
        email: stuEmail.trim(),
        rollNumber: stuRollNumber.trim(),
        department: stuDepartment,
        batchYear: Number(stuBatchYear),
        track: stuTrack,
        domainName: stuTrack === 'PEP' ? stuDomain : undefined,
        mentorId: stuMentorId || undefined,
        password: stuPassword.trim() || 'student123'
      });
      setFeedback({ type: 'success', message: `Student '${stuName}' enrolled in ${stuTrack} successfully!` });
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">Program Administration Portal</h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-900 rounded border border-blue-200 font-mono">
                  PROGRAM LEAD
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Manage Faculty Mentors, onboard visiting Domain Trainers, assign student cohorts, and dispatch practice drills.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => { setStudentModalOpen(true); setFeedback(null); }}
            className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enroll Student</span>
          </button>
          <button 
            onClick={() => { setMentorModalOpen(true); setFeedback(null); }}
            className="flex items-center space-x-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Add Faculty Mentor</span>
          </button>
          <button 
            onClick={() => { setTrainerModalOpen(true); setFeedback(null); }}
            className="flex items-center space-x-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Onboard Trainer</span>
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

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 space-x-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab('MENTORS')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'MENTORS'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Faculty Mentors ({mentors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TRAINERS')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'TRAINERS'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Domain Trainers ({trainerTenures.filter(t => t.isActive).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ASSIGNMENTS')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ASSIGNMENTS'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Practice Assignments ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'STUDENTS'
              ? 'border-neutral-900 text-neutral-900 font-semibold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cohort Candidates ({students.length})</span>
        </button>
      </div>

      {/* TAB 1: FACULTY MENTORS */}
      {activeTab === 'MENTORS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Faculty Mentors Roster</h3>
              <p className="text-xs text-neutral-500">Mentors create student accounts under their guidance and review mock score readiness.</p>
            </div>
            <button
              onClick={() => setAllocModalOpen(true)}
              className="text-xs text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-200 font-medium cursor-pointer"
            >
              Assign Student to Mentor
            </button>
          </div>

          {mentors.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              <GraduationCap className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-medium text-neutral-600">No Faculty Mentors added yet.</p>
              <p className="mt-1">Click "Add Faculty Mentor" above to onboard the department's first mentor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
                  <tr>
                    <th className="py-3 px-4 font-medium">MENTOR NAME</th>
                    <th className="py-3 px-4 font-medium">EMAIL</th>
                    <th className="py-3 px-4 font-medium">ASSIGNED MENTEES</th>
                    <th className="py-3 px-4 font-medium">STATUS</th>
                    <th className="py-3 px-4 font-medium">ONBOARDED ON</th>
                    <th className="py-3 px-4 font-medium text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {mentors.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900 flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                          FM
                        </span>
                        <span>{m.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{m.email}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800">
                          {m.menteeCount || 0} Students
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center text-[11px] font-medium text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDeleteTarget({ id: m.userId || m.id, name: m.name, role: 'FACULTY_MENTOR', email: m.email })}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          title="Remove Faculty Mentor"
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
      )}

      {/* TAB 2: DOMAIN TRAINERS */}
      {activeTab === 'TRAINERS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Visiting Domain Trainers</h3>
              <p className="text-xs text-neutral-500">Industry experts on 10–15 day active tenures. Trainers cannot create student accounts.</p>
            </div>
            <button
              onClick={() => setTrainerModalOpen(true)}
              className="text-xs bg-neutral-900 text-white px-3 py-1.5 rounded-lg hover:bg-black font-medium cursor-pointer"
            >
              + Onboard Visiting Trainer
            </button>
          </div>

          {trainerTenures.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              <Sparkles className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-medium text-neutral-600">No active domain trainer tenures.</p>
              <p className="mt-1">Click "Onboard Visiting Trainer" to assign an industry instructor to a domain.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
                  <tr>
                    <th className="py-3 px-4 font-medium">TRAINER</th>
                    <th className="py-3 px-4 font-medium">DOMAIN TRACK</th>
                    <th className="py-3 px-4 font-medium">ORGANIZATION</th>
                    <th className="py-3 px-4 font-medium">TENURE DATES</th>
                    <th className="py-3 px-4 font-medium">STATUS</th>
                    <th className="py-3 px-4 font-medium text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {trainerTenures.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        <p>{t.trainerName}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">{t.trainerEmail}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800">
                          {t.domain}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{t.companyOrInstitute}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                        {t.startDate} → {t.endDate}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center text-[11px] font-medium ${
                          t.isActive ? 'text-emerald-700' : 'text-neutral-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${t.isActive ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                          {t.isActive ? 'Active Tenure' : 'Revoked / Expired'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {t.isActive && (
                          <button
                            onClick={() => revokeTrainer(t.id)}
                            className="text-[11px] text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget({ id: t.userId || t.id, name: t.trainerName, role: 'DOMAIN_TRAINER', email: t.trainerEmail })}
                          className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline cursor-pointer ml-1.5"
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

      {/* TAB 3: ASSIGNMENTS */}
      {activeTab === 'ASSIGNMENTS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Assigned Practice & Mock Rounds</h3>
              <p className="text-xs text-neutral-500">Mock rounds dispatched to HOPE Elite cohorts, PEP domains, and general departments.</p>
            </div>
            <button
              onClick={() => setAsgModalOpen(true)}
              className="text-xs bg-neutral-900 text-white px-3 py-1.5 rounded-lg hover:bg-black font-medium cursor-pointer"
            >
              + Dispatch New Assignment
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              <Layers className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-medium text-neutral-600">No cohort assignments created yet.</p>
              <p className="mt-1">Click "Dispatch New Assignment" to assign the first practice interview drill.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
                  <tr>
                    <th className="py-3 px-4 font-medium">ASSIGNMENT TITLE</th>
                    <th className="py-3 px-4 font-medium">TARGET COHORT</th>
                    <th className="py-3 px-4 font-medium">ASSIGNED BY</th>
                    <th className="py-3 px-4 font-medium">DUE DATE</th>
                    <th className="py-3 px-4 font-medium">POLICY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {assignments.map((asg) => (
                    <tr key={asg.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">{asg.title}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800">
                          {asg.targetDomainOrTrack}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{asg.assignedByName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">{asg.dueDate}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          asg.isMandatory ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {asg.isMandatory ? 'Mandatory' : 'Optional Practice'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STUDENTS */}
      {activeTab === 'STUDENTS' && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Enrolled Student Candidates</h3>
              <p className="text-xs text-neutral-500">Comprehensive list of candidates across HOPE Elite, PEP Domains, and Departments.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => { setStudentModalOpen(true); setFeedback(null); }}
                className="text-xs bg-neutral-900 text-white px-3 py-1.5 rounded-lg hover:bg-black font-medium cursor-pointer flex items-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Enroll Student</span>
              </button>
              <span className="text-xs font-mono text-neutral-400">{students.length} Candidates</span>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              <Users className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
              <p className="font-medium text-neutral-600">No student accounts registered yet.</p>
              <p className="mt-1">Faculty Mentors and Program Admins create college student accounts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
                  <tr>
                    <th className="py-3 px-4 font-medium">STUDENT</th>
                    <th className="py-3 px-4 font-medium">ROLL NUMBER</th>
                    <th className="py-3 px-4 font-medium">TRACK</th>
                    <th className="py-3 px-4 font-medium">ASSIGNED MENTOR</th>
                    <th className="py-3 px-4 font-medium">MOCK SCORE</th>
                    <th className="py-3 px-4 font-medium text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {s.name}
                        <span className="block text-[11px] font-mono text-neutral-400 font-normal">{s.department}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-neutral-600">{s.rollNumber}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800">
                          {s.track}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-600">{s.mentorName || 'Unassigned'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">{s.score ? `${s.score}%` : '—'}</td>
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

      {/* Modal: Add Faculty Mentor */}
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

      {/* Modal: Onboard Domain Trainer */}
      {trainerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs">
                  T
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Onboard Visiting Domain Trainer</h3>
              </div>
              <button onClick={() => setTrainerModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleOnboardTrainer} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Trainer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Sharma"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Trainer Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. trainer@techinstitute.org"
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Assigned Domain Track *</label>
                <select
                  value={trainerDomain}
                  onChange={(e) => setTrainerDomain(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                >
                  {domains.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={trainerCompany}
                  onChange={(e) => setTrainerCompany(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={trainerStartDate}
                    onChange={(e) => setTrainerStartDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={trainerEndDate}
                    onChange={(e) => setTrainerEndDate(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTrainerModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium"
                >
                  Onboard Trainer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispatch Assignment */}
      {asgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Dispatch Cohort Assignment</h3>
              <button onClick={() => setAsgModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Caching & Concurrency Drill"
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Target Track / Domain</label>
                <select
                  value={asgTarget}
                  onChange={(e) => setAsgTarget(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                >
                  <option value="HOPE_ELITE">★ HOPE Elite</option>
                  <option value="HOPE_NON_ELITE">HOPE General</option>
                  <option value="PEP">PEP (All 21 Domains)</option>
                  <option value="DEPARTMENT">Department Stream</option>
                  {domains.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={asgDueDate}
                  onChange={(e) => setAsgDueDate(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAsgModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium"
                >
                  Dispatch Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Student to Mentor */}
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

      {/* Modal: Enroll Student Account */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Enroll College Candidate</h3>
              <button onClick={() => setStudentModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">✕</button>
            </div>
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
                  <label className="block font-medium text-neutral-700 mb-1">Department</label>
                  <select
                    value={stuDepartment}
                    onChange={(e) => setStuDepartment(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                  >
                    <option value="Computer Science & Engineering">CSE</option>
                    <option value="Information Technology">IT</option>
                    <option value="AI & Data Science">AIDS</option>
                    <option value="Electronics & Communication">ECE</option>
                    <option value="Electrical & Electronics">EEE</option>
                    <option value="Mechanical Engineering">Mechanical</option>
                  </select>
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Track Category</label>
                  <select
                    value={stuTrack}
                    onChange={(e) => setStuTrack(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                  >
                    <option value="HOPE_ELITE">★ HOPE Elite</option>
                    <option value="HOPE_NON_ELITE">HOPE Non-Elite</option>
                    <option value="PEP">PEP Domain</option>
                    <option value="DEPARTMENT">Department General</option>
                  </select>
                </div>
                {stuTrack === 'PEP' ? (
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">PEP Domain</label>
                    <select
                      value={stuDomain}
                      onChange={(e) => setStuDomain(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                    >
                      {domains.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Assigned Mentor</label>
                    <select
                      value={stuMentorId}
                      onChange={(e) => setStuMentorId(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900"
                    >
                      <option value="">-- Optional / Unassigned --</option>
                      {mentors.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}
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

export default ProgramAdminPortal;

