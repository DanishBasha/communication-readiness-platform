import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { PEP_DOMAINS } from '../../data/mockData';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import { 
  GraduationCap, 
  Search, 
  ShieldCheck, 
  Check, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Trash2, 
  X 
} from 'lucide-react';

export const FacultyMentorPortal: React.FC = () => {
  const { currentUser, verifyCriteriaTask } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [mentees, setMentees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOffMap, setSignedOffMap] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Inspector & Delete Modals
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; role: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Student Creation Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [stuName, setStuName] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuRollNumber, setStuRollNumber] = useState('');
  const [stuDepartment, setStuDepartment] = useState('Computer Science & Engineering');
  const [stuBatchYear, setStuBatchYear] = useState(2026);
  const [stuTrack, setStuTrack] = useState<'HOPE_ELITE' | 'HOPE_NON_ELITE' | 'PEP' | 'DEPARTMENT'>('HOPE_ELITE');
  const [stuDomain, setStuDomain] = useState('Full Stack Web Architecture');
  const [stuPassword, setStuPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMentees = async () => {
    try {
      setLoading(true);
      // Use the real mentor endpoint — returns students assigned to the logged-in FACULTY_MENTOR
      const list = await api.mentors.getMyStudents();
      if (list) {
        setMentees(list);
      }
    } catch (err: any) {
      console.warn('Error loading mentees from real API, falling back to mock:', err);
      // Fallback to local mock data if the backend is unreachable
      const fallback = await api.admin.getMentorMentees();
      if (fallback) setMentees(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentees();
  }, []);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stuName.trim() || !stuEmail.trim() || !stuRollNumber.trim()) {
      setFeedback({ type: 'error', message: 'Name, Email, and Roll Number are required.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await api.admin.createStudentByMentor({
        name: stuName.trim(),
        email: stuEmail.trim(),
        rollNumber: stuRollNumber.trim(),
        department: stuDepartment,
        batchYear: Number(stuBatchYear),
        track: stuTrack,
        domainName: stuTrack === 'PEP' ? stuDomain : undefined,
        password: stuPassword.trim() || 'student123'
      });
      setFeedback({ type: 'success', message: `Student '${stuName}' enrolled in ${stuTrack} successfully!` });
      setStuName('');
      setStuEmail('');
      setStuRollNumber('');
      setStuPassword('');
      setCreateModalOpen(false);
      await fetchMentees();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to create student account.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOff = async (menteeId: string) => {
    setSignedOffMap(prev => ({ ...prev, [menteeId]: true }));
    try {
      await verifyCriteriaTask('crit-3');
    } catch {
      // Handled
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.admin.deleteUser(deleteTarget.id);
      setFeedback({ type: 'success', message: res.message || `${deleteTarget.name} removed successfully.` });
      setDeleteTarget(null);
      await fetchMentees();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to remove student.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMentees = mentees.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Mentor Profile Header */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                  {currentUser?.name || 'Faculty Mentor'}
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 rounded border border-emerald-200 font-mono">
                  FACULTY MENTOR
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {currentUser?.email} · Assigned Mentee Roster ({mentees.length} Students)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-700">
            <span className="font-semibold text-neutral-900">{mentees.length}</span> Assigned Mentees
          </div>
          <button 
            onClick={() => { setCreateModalOpen(true); setFeedback(null); }}
            className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Student Account</span>
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

      {/* Mentees Table */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:px-6 border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search mentee by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <span className="text-xs text-neutral-500">
            You only see students assigned directly under your mentorship
          </span>
        </div>

        {mentees.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-xs">
            <GraduationCap className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
            <p className="font-semibold text-neutral-700 text-sm">No mentees assigned yet.</p>
            <p className="mt-1 max-w-sm mx-auto text-neutral-500">
              Click "Create Student Account" above to enroll your first student, or wait for Program Admin to assign cohort students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
                <tr>
                  <th className="py-3 px-6 font-medium">MENTEE</th>
                  <th className="py-3 px-6 font-medium">COHORT TRACK</th>
                  <th className="py-3 px-6 font-medium">DOMAIN</th>
                  <th className="py-3 px-6 font-medium">LATEST MOCK</th>
                  <th className="py-3 px-6 font-medium">CHECKLIST</th>
                  <th className="py-3 px-6 font-medium text-right">MENTOR ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredMentees.map((s) => {
                  const isSigned = signedOffMap[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-neutral-900">
                        <div>{s.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{s.rollNumber}</div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
                          {s.track}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-neutral-600">
                        {s.domain || 'Department General'}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-neutral-900 text-white">
                          {s.score ? `${s.score}%` : 'Not Taken'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-neutral-700">
                        {isSigned ? 'Verified' : s.checklist || '0/5 Verified'}
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        <button
                          onClick={() => setInspectStudentId(s.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          title="View Interview History & Turns"
                        >
                          <Eye className="w-3 h-3" />
                          <span>History</span>
                        </button>
                        {isSigned ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 mr-1" /> Verified
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSignOff(s.id)}
                            className="bg-neutral-900 hover:bg-black text-white px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                          >
                            Sign Off
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget({ id: s.userId || s.id, name: s.name, role: 'STUDENT' })}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center"
                          title="Remove Mentee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal: Create Student Account */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
                  S
                </div>
                <h3 className="text-sm font-semibold text-neutral-900">Enroll College Student Account</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aravind Kumar"
                  value={stuName}
                  onChange={(e) => setStuName(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={stuEmail}
                    onChange={(e) => setStuEmail(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 22CS1001"
                    value={stuRollNumber}
                    onChange={(e) => setStuRollNumber(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Department</label>
                  <select
                    value={stuDepartment}
                    onChange={(e) => setStuDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:border-neutral-900"
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
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Placement Cohort Track *</label>
                <select
                  value={stuTrack}
                  onChange={(e) => setStuTrack(e.target.value as any)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:border-neutral-900"
                >
                  <option value="HOPE_ELITE">★ HOPE Elite (Top Competitive Coders)</option>
                  <option value="HOPE_NON_ELITE">HOPE Non-Elite (Standard Coding Accelerator)</option>
                  <option value="PEP">PEP (Specialized Domain Tracks)</option>
                  <option value="DEPARTMENT">Department General Stream</option>
                </select>
              </div>

              {stuTrack === 'PEP' && (
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">PEP Specialized Domain</label>
                  <select
                    value={stuDomain}
                    onChange={(e) => setStuDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:border-neutral-900"
                  >
                    {PEP_DOMAINS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  placeholder="Default: student123"
                  value={stuPassword}
                  onChange={(e) => setStuPassword(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Enroll Student Account'}
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
          title="Remove Mentee"
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

export default FacultyMentorPortal;

