import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { StudentHistoryModal } from '../common/StudentHistoryModal';
import { AssignSessionModal } from '../common/AssignSessionModal';
import { InterviewAssignment } from '../../types';
import { 
  Sparkles, 
  Calendar, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  Eye, 
  X,
  Mic,
  Headphones,
  Layers,
  Clock,
  Check
} from 'lucide-react';

export const TrainerPortal: React.FC = () => {
  const { currentUser, assignments, trainerTenures } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [targetStudentForAssign, setTargetStudentForAssign] = useState<any | null>(null);
  const [success, setSuccess] = useState(false);
  const [domainStudents, setDomainStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [inspectStudentId, setInspectStudentId] = useState<string | null>(null);

  const activeTenure = trainerTenures.find(
    t => (t.trainerEmail?.toLowerCase() === currentUser?.email?.toLowerCase()) && t.isActive
  ) || trainerTenures.find(t => t.isActive);

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

  const trainerAssignments = (assignments || []).filter(a => 
    a.assignedByRole === 'TRAINER' || 
    (currentUser?.name && a.assignedByName?.toLowerCase().includes(currentUser.name.toLowerCase())) ||
    (activeTenure?.domain && a.targetDomainOrTrack?.toLowerCase().includes(activeTenure.domain.toLowerCase()))
  );

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
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Assign Assessment</span>
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
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setTargetStudentForAssign(s);
                          setModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        title="Assign verbal mock or listening test to this student"
                      >
                        <Plus className="w-3 h-3 text-emerald-600" />
                        <span>Assign</span>
                      </button>
                      <button
                        onClick={() => setInspectStudentId(s.id)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Scores &amp; Turns</span>
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
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Assigned Domain Drills &amp; Practice Sessions</h3>
            <p className="text-xs text-neutral-500">Industry expert interview and listening comprehension drills assigned to this domain cohort.</p>
          </div>
          <button
            onClick={() => {
              setTargetStudentForAssign(null);
              setModalOpen(true);
            }}
            className="text-xs bg-neutral-900 text-white px-3 py-1.5 rounded-lg hover:bg-black font-medium cursor-pointer flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Dispatch New Drill</span>
          </button>
        </div>

        {trainerAssignments.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">
            <Layers className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
            <p className="font-semibold text-neutral-700">No domain drills assigned yet.</p>
            <p className="mt-0.5">Click "Dispatch New Drill" to create a specialized mock or listening drill for your candidates.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {trainerAssignments.map((asg) => {
              const isInterview = asg.sessionType === 'MOCK_INTERVIEW';
              const subsCount = asg.submissions?.length || 0;
              return (
                <div key={asg.id} className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-neutral-100/70 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isInterview ? 'bg-neutral-900 text-white' : 'bg-emerald-900 text-emerald-100'
                      }`}>
                        {isInterview ? <Mic className="w-2.5 h-2.5 text-emerald-400" /> : <Headphones className="w-2.5 h-2.5 text-emerald-300" />}
                        <span>{isInterview ? 'Mock Interview' : 'Listening Lab'}</span>
                      </span>
                      <span className="text-xs font-semibold text-neutral-900">{asg.title}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                      <span className="px-1.5 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600 font-mono">
                        {asg.targetProgramName || asg.targetDomainOrTrack || asg.targetScope}
                      </span>
                      <span>•</span>
                      <span>Due {asg.dueDate}</span>
                      {asg.difficulty && <span>• Difficulty: {asg.difficulty}</span>}
                      {asg.listeningPassageId && <span>• Audio: {asg.listeningPassageId}</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-neutral-900 block font-mono">{subsCount} / {domainStudents.length}</span>
                      <span className="text-[10px] text-neutral-400">Submissions</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <AssignSessionModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setTargetStudentForAssign(null);
          }}
          onSuccess={(asg) => {
            setModalOpen(false);
            setTargetStudentForAssign(null);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
          }}
          defaultRole="TRAINER"
          defaultDomain={activeTenure?.domain || 'Cloud DevOps & Distributed Systems'}
          defaultTargetScope={targetStudentForAssign ? 'SPECIFIC_STUDENT' : 'ALL_STUDENTS'}
          studentsList={domainStudents}
        />
      )}

      {inspectStudentId && (
        <StudentHistoryModal
          studentIdOrUserId={inspectStudentId}
          onClose={() => setInspectStudentId(null)}
        />
      )}

    </div>
  );
};
