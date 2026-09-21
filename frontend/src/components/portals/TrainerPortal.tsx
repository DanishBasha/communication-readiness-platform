import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { 
  Sparkles, 
  Calendar, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Eye, 
  X 
} from 'lucide-react';

export const TrainerPortal: React.FC = () => {
  const { currentUser, assignments, createAssignment, trainerTenures } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [cohort, setCohort] = useState('Cloud Computing & DevOps');
  const [dueDate, setDueDate] = useState('2026-09-24');
  const [success, setSuccess] = useState(false);

  // Dynamic domain students
  const [domainStudents, setDomainStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);

  // Active tenure for current user
  const activeTenure = trainerTenures.find(
    t => (t.trainerEmail?.toLowerCase() === currentUser?.email?.toLowerCase()) && t.isActive
  ) || trainerTenures.find(t => t.isActive);

  useEffect(() => {
    if (activeTenure?.domain) {
      setCohort(activeTenure.domain);
    }
  }, [activeTenure]);

  const loadDomainStudents = async () => {
    try {
      setLoadingStudents(true);
      const list = await api.admin.getStudents();
      if (list) {
        setDomainStudents(list);
      }
    } catch (err) {
      console.warn('Error loading domain students for trainer:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    loadDomainStudents();
  }, []);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await createAssignment({
      title: title.trim(),
      assignedByRole: 'TRAINER',
      assignedByName: currentUser?.name || 'Visiting Domain Trainer',
      targetDomainOrTrack: cohort,
      dueDate,
      isMandatory: false
    });

    setTitle('');
    setModalOpen(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Visiting Domain Trainer Workspace</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-900 text-white rounded font-mono">10-15 DAY TENURE</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Active industry expert tenure: Conduct specialized mock rounds and submit domain rubrics.
          </p>
        </div>

        <button 
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Assign Specialized Domain Mock</span>
        </button>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Specialized domain mock drill assigned to students successfully!</span>
        </div>
      )}

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs text-neutral-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Active Contract: {activeTenure ? `${activeTenure.startDate} → ${activeTenure.endDate}` : 'Sept 15 – Sept 30, 2026'}</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">{activeTenure?.isActive ? 'Active Tenure' : 'Visiting Expert'}</span>
          </div>
          <h3 className="text-base font-semibold text-neutral-900">
            Domain: {activeTenure?.domain || 'Cloud DevOps & Distributed Systems'}
          </h3>
          <p className="text-xs text-neutral-500 font-mono">
            Trainer: {currentUser?.name} ({currentUser?.email})
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
            <p className="text-[10px] text-neutral-400 font-mono">ENROLLED CANDIDATES</p>
            <p className="text-sm font-bold text-neutral-900">{domainStudents.length} Students</p>
          </div>
          <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
            <p className="text-[10px] text-neutral-400 font-mono">EVALUATED MOCKS</p>
            <p className="text-sm font-bold text-neutral-900">{domainStudents.filter(s => s.score).length} Completed</p>
          </div>
        </div>
      </div>

      {/* Domain Candidates & Evaluated Mocks Roster */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
              Domain Candidates & Evaluated Practice Rounds
            </h3>
            <p className="text-xs text-neutral-500">
              Inspect candidate scorecards, turn-by-turn conversational transcripts, and speech delivery metrics for your assigned track.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-400">{domainStudents.length} Candidates</span>
        </div>

        {domainStudents.length === 0 ? (
          <div className="text-center py-10 text-neutral-400 text-xs">
            <Users className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
            <p className="font-medium text-neutral-600">No candidates enrolled in this domain yet.</p>
            <p className="mt-1">Candidates assigned to this domain track will appear here automatically for rubric scoring and evaluation.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
                <tr>
                  <th className="py-3 px-4 font-medium">STUDENT</th>
                  <th className="py-3 px-4 font-medium">ROLL NUMBER</th>
                  <th className="py-3 px-4 font-medium">DOMAIN TRACK</th>
                  <th className="py-3 px-4 font-medium">LATEST SCORE</th>
                  <th className="py-3 px-4 font-medium">CHECKLIST</th>
                  <th className="py-3 px-4 font-medium text-right">EVALUATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {domainStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {s.name}
                      <span className="block text-[11px] font-mono text-neutral-400 font-normal">{s.department}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-600">{s.rollNumber}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800">
                        {s.domain || s.track}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      {s.score ? `${s.score}%` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-500">
                      {s.checklist || '0/15'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectStudentId(s.id)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Scores & Turns</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-neutral-100 pb-3">
          <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Assigned Specialized Mock Rounds</h3>
          <p className="text-xs text-neutral-500">Evaluate candidates on microservice resiliency, Docker orchestration, and Kubernetes pod scaling</p>
        </div>

        <div className="space-y-3 pt-2">
          {[
            { title: 'Docker & Kubernetes Ingress Controllers', cohort: 'PEP Track #04', completed: '12 / 15 Evaluated' },
            { title: 'Kafka Partition Lag & High Concurrency Resiliency', cohort: 'HOPE Elite', completed: '16 / 18 Evaluated' },
            { title: 'AWS Cloud Architecture & Terraform State Management', cohort: 'PEP Track #07', completed: 'Scheduled for Tomorrow' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center justify-between hover:bg-neutral-100/70 transition-colors">
              <div>
                <p className="text-xs font-semibold text-neutral-900">{item.title}</p>
                <div className="flex items-center space-x-2 text-[11px] text-neutral-400 mt-1">
                  <span className="px-1.5 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600 font-mono">{item.cohort}</span>
                  <span>•</span>
                  <span>{item.completed}</span>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(true)}
                className="flex items-center space-x-1 text-xs font-medium text-neutral-800 hover:text-black cursor-pointer"
              >
                <span>Dispatch drill</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg p-6 shadow-xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-semibold text-neutral-900">Assign Specialized Domain Mock</h3>
              <button onClick={() => setModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Drill Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kubernetes Pod Autoscaling & Ingress Drill"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Target Cohort / Domain</label>
                <input
                  type="text"
                  required
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-neutral-900 focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium cursor-pointer"
                >
                  Dispatch Domain Drill
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

    </div>
  );
};
