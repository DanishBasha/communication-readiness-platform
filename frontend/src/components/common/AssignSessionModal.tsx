import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { LISTENING_PASSAGES } from '../../data/mockData';
import { InterviewAssignment, DynamicProgram } from '../../types';
import { 
  Mic, 
  Headphones, 
  X, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  UserCheck, 
  Sparkles, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

export interface AssignSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (asg: InterviewAssignment) => void;
  defaultRole?: 'SUPER_ADMIN' | 'PLACEMENT_COORDINATOR' | 'PROGRAM_ADMIN' | 'FACULTY_MENTOR' | 'TRAINER';
  defaultTargetScope?: 'ALL_STUDENTS' | 'PROGRAM' | 'DEPARTMENT' | 'MY_MENTEES' | 'SPECIFIC_STUDENT';
  defaultProgramName?: string;
  defaultDepartment?: string;
  defaultDomain?: string;
  menteesList?: any[];
  studentsList?: any[];
}

export const AssignSessionModal: React.FC<AssignSessionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultRole,
  defaultTargetScope,
  defaultProgramName,
  defaultDepartment,
  defaultDomain,
  menteesList = [],
  studentsList = []
}) => {
  const { currentUser, createAssignment } = useApp();

  const activeRole = defaultRole || (currentUser?.role as any) || 'SUPER_ADMIN';

  const [sessionType, setSessionType] = useState<'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION'>('MOCK_INTERVIEW');
  const [title, setTitle] = useState('');
  const [targetScope, setTargetScope] = useState<'ALL_STUDENTS' | 'PROGRAM' | 'DEPARTMENT' | 'MY_MENTEES' | 'SPECIFIC_STUDENT'>(
    defaultTargetScope || (defaultDepartment ? 'DEPARTMENT' : defaultProgramName ? 'PROGRAM' : activeRole === 'FACULTY_MENTOR' ? 'MY_MENTEES' : 'ALL_STUDENTS')
  );

  const [programs, setPrograms] = useState<DynamicProgram[]>([]);
  const [selectedProgName, setSelectedProgName] = useState(defaultProgramName || '');
  const [selectedSubProgram, setSelectedSubProgram] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(defaultDepartment || 'Computer Science & Engineering');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [domainOrTopic, setDomainOrTopic] = useState(defaultDomain || 'Full Stack & Web Systems');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'ADVANCED' | 'FAANG'>('MEDIUM');
  const [listeningPassageId, setListeningPassageId] = useState(LISTENING_PASSAGES[0]?.id || 'pass-finpay');
  const [customInstructions, setCustomInstructions] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [isMandatory, setIsMandatory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (defaultTargetScope) {
        setTargetScope(defaultTargetScope);
      } else if (defaultDepartment) {
        setTargetScope('DEPARTMENT');
      } else if (defaultProgramName) {
        setTargetScope('PROGRAM');
      }
      if (defaultProgramName) {
        setSelectedProgName(defaultProgramName);
      }
      if (defaultDepartment) {
        setSelectedDepartment(defaultDepartment);
      }
      api.college.getPrograms(currentUser?.collegeId || 'col-1').then(progs => {
        if (progs && progs.length > 0) {
          setPrograms(progs);
          if (!defaultProgramName && !selectedProgName) {
            setSelectedProgName(progs[0].name);
            if (progs[0].hasSubPrograms && progs[0].subPrograms?.length > 0) {
              setSelectedSubProgram(progs[0].subPrograms[0]);
            }
          }
        }
      }).catch(() => {});
    }
  }, [isOpen, defaultTargetScope, defaultProgramName, defaultDepartment, currentUser?.collegeId]);

  if (!isOpen) return null;

  const currentProgram = programs.find(p => p.name === selectedProgName);

  const handleTitleSuggestion = (suggestedTitle: string) => {
    setTitle(suggestedTitle);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide an assignment title.');
      return;
    }

    setSubmitting(true);
    setError(null);

    let targetDomainOrTrack = 'All Batches (2026)';
    let studentTargetName = '';

    if (targetScope === 'MY_MENTEES') {
      targetDomainOrTrack = `${currentUser?.name || 'Faculty Mentor'}'s Mentees`;
    } else if (targetScope === 'PROGRAM') {
      targetDomainOrTrack = selectedSubProgram ? `${selectedProgName} (${selectedSubProgram})` : selectedProgName;
    } else if (targetScope === 'DEPARTMENT') {
      targetDomainOrTrack = selectedDepartment;
    } else if (targetScope === 'SPECIFIC_STUDENT') {
      const allCandidates = [...menteesList, ...studentsList];
      const found = allCandidates.find(s => s.id === selectedStudentId);
      studentTargetName = found?.name || 'Candidate';
      targetDomainOrTrack = `${studentTargetName} (${found?.rollNumber || 'Direct'})`;
    }

    try {
      const created = await createAssignment({
        title: title.trim(),
        sessionType,
        assignedByRole: activeRole,
        assignedByName: currentUser?.name || 'Placement Cell Officer',
        assignedByEmail: currentUser?.email,
        assignedById: currentUser?.id,
        collegeId: currentUser?.collegeId || 'col-1',
        targetScope,
        targetDomainOrTrack,
        targetProgramName: targetScope === 'PROGRAM' ? selectedProgName : undefined,
        targetSubProgram: targetScope === 'PROGRAM' && selectedSubProgram ? selectedSubProgram : undefined,
        targetDepartment: targetScope === 'DEPARTMENT' ? selectedDepartment : undefined,
        targetStudentId: targetScope === 'SPECIFIC_STUDENT' ? selectedStudentId : undefined,
        targetStudentName: targetScope === 'SPECIFIC_STUDENT' ? studentTargetName : undefined,
        domainOrTopic: sessionType === 'MOCK_INTERVIEW' ? domainOrTopic : undefined,
        difficulty,
        listeningPassageId: sessionType === 'LISTENING_COMPREHENSION' ? listeningPassageId : undefined,
        customInstructions: customInstructions.trim() || undefined,
        dueDate,
        isMandatory
      });

      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch session assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 my-6">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              {sessionType === 'MOCK_INTERVIEW' ? <Mic className="w-5 h-5 text-emerald-400" /> : <Headphones className="w-5 h-5 text-purple-400" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Assign Assessment / Practice Session</h2>
              <p className="text-xs text-neutral-500">
                Assign a voice mock interview or auditory comprehension assessment to candidates
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Session Type Selection */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-neutral-800 uppercase tracking-wider text-[10px]">
              1. Select Session Format *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSessionType('MOCK_INTERVIEW')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  sessionType === 'MOCK_INTERVIEW'
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    sessionType === 'MOCK_INTERVIEW' ? 'bg-neutral-800 text-emerald-400' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    <Mic className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    sessionType === 'MOCK_INTERVIEW' ? 'bg-neutral-800 text-emerald-300' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    VOICE AI
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs">Technical Mock Interview</h4>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${
                    sessionType === 'MOCK_INTERVIEW' ? 'text-neutral-300' : 'text-neutral-500'
                  }`}>
                    Adaptive turn-by-turn verbal questions evaluating architecture, code logic, and speaking pace.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSessionType('LISTENING_COMPREHENSION')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  sessionType === 'LISTENING_COMPREHENSION'
                    ? 'border-purple-900 bg-purple-950 text-white shadow-xs'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    sessionType === 'LISTENING_COMPREHENSION' ? 'bg-purple-900 text-purple-300' : 'bg-neutral-100 text-neutral-700'
                  }`}>
                    <Headphones className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    sessionType === 'LISTENING_COMPREHENSION' ? 'bg-purple-900 text-purple-300' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    AUDIO ONLY
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs">Listening Comprehension Lab</h4>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${
                    sessionType === 'LISTENING_COMPREHENSION' ? 'text-purple-200' : 'text-neutral-500'
                  }`}>
                    Spoken requirements passage without text subtitles, followed by precision oral recall checks.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Assignment Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-neutral-800 uppercase tracking-wider text-[10px]">
                2. Assignment Title *
              </label>
              <span className="text-[10px] text-neutral-400">Quick suggestions:</span>
            </div>
            <input
              type="text"
              required
              placeholder={sessionType === 'MOCK_INTERVIEW' ? 'e.g. Distributed Systems & High Concurrency Mock Drill' : 'e.g. Client Architecture Audio Retention Drill'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-neutral-900 text-xs focus:outline-none focus:border-neutral-900"
            />
            {/* Quick Title Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(sessionType === 'MOCK_INTERVIEW' ? [
                'Weekly Technical Readiness Drill',
                'System Concurrency & Microservices Mock',
                'Frontend Architecture & State Review',
                'Algorithm & Space Complexity Scrutiny'
              ] : [
                'FinPay Gateway Distributed Idempotency Drill',
                'Zero-Trust Security Incident Briefing',
                'CloudPulse High-Throughput Audio Lab',
                'Sprint Retrospective Architecture Retention'
              ]).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleTitleSuggestion(sug)}
                  className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Target Scope */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-neutral-800 uppercase tracking-wider text-[10px]">
                3. Target Audience / Cohort *
              </label>
              <span className="text-[10px] text-neutral-400">Choose who should take this session</span>
            </div>

            {/* Scope Selection Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTargetScope('PROGRAM')}
                className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                  targetScope === 'PROGRAM' ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                }`}
              >
                <span className="text-xs font-semibold">🎓 Program Students</span>
                <span className={`text-[10px] ${targetScope === 'PROGRAM' ? 'text-neutral-300' : 'text-neutral-400'}`}>Assigned to institutional track</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('DEPARTMENT')}
                className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                  targetScope === 'DEPARTMENT' ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                }`}
              >
                <span className="text-xs font-semibold">🏛️ Department</span>
                <span className={`text-[10px] ${targetScope === 'DEPARTMENT' ? 'text-neutral-300' : 'text-neutral-400'}`}>CSE, IT, AI&DS, ECE, Mech...</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetScope('ALL_STUDENTS')}
                className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                  targetScope === 'ALL_STUDENTS' ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                }`}
              >
                <span className="text-xs font-semibold">🌐 College-Wide</span>
                <span className={`text-[10px] ${targetScope === 'ALL_STUDENTS' ? 'text-neutral-300' : 'text-neutral-400'}`}>All batches & enrolled</span>
              </button>

              {activeRole === 'FACULTY_MENTOR' ? (
                <button
                  type="button"
                  onClick={() => setTargetScope('MY_MENTEES')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                    targetScope === 'MY_MENTEES' ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}
                >
                  <span className="text-xs font-semibold">★ My Mentees</span>
                  <span className={`text-[10px] ${targetScope === 'MY_MENTEES' ? 'text-neutral-300' : 'text-neutral-400'}`}>Assigned to my counsel</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setTargetScope('SPECIFIC_STUDENT')}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                    targetScope === 'SPECIFIC_STUDENT' ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                  }`}
                >
                  <span className="text-xs font-semibold">👤 Single Candidate</span>
                  <span className={`text-[10px] ${targetScope === 'SPECIFIC_STUDENT' ? 'text-neutral-300' : 'text-neutral-400'}`}>1-on-1 remediation</span>
                </button>
              )}
            </div>

            {/* Scope Specific Selectors */}
            {targetScope === 'PROGRAM' && (
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Select Program
                  </label>
                  <span className="text-[10px] text-neutral-500 font-mono">Dynamic institutional programs</span>
                </div>
                {programs.length === 0 ? (
                  <p className="text-amber-800 text-xs bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    No institutional programs configured yet. Define programs in the Super Admin portal first.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Program Pill Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {programs.map(p => {
                        const isSelected = selectedProgName === p.name;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedProgName(p.name);
                              if (p.hasSubPrograms && p.subPrograms?.length > 0) {
                                setSelectedSubProgram(p.subPrograms[0]);
                              } else {
                                setSelectedSubProgram('');
                              }
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border text-left flex items-center space-x-2 ${
                              isSelected
                                ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                                : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>{p.name}</span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-500'}`}>
                              {p.code}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Sub Program / Track Pills */}
                    {currentProgram?.hasSubPrograms && currentProgram.subPrograms?.length > 0 && (
                      <div className="pt-2 border-t border-neutral-200/70 space-y-1.5">
                        <label className="block text-[11px] font-medium text-neutral-600">
                          Target Specific Sub-Tier / Cohort:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSubProgram('')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                              selectedSubProgram === ''
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            ✓ All Tiers in {currentProgram.name}
                          </button>
                          {currentProgram.subPrograms.map(sub => (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => setSelectedSubProgram(sub)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                selectedSubProgram === sub
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-white border-neutral-200 hover:bg-neutral-100 text-neutral-600'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {targetScope === 'DEPARTMENT' && (
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Select Academic Department
                  </label>
                  <span className="text-[10px] text-neutral-500 font-mono">Direct department dispatch</span>
                </div>
                {/* Department quick clickable buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Computer Science & Engineering',
                    'Information Technology',
                    'AI & Data Science',
                    'Electronics & Communication',
                    'Electrical & Electronics',
                    'Mechanical Engineering'
                  ].map((dept) => {
                    const isSelected = selectedDepartment === dept;
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDepartment(dept)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                            : 'bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700'
                        }`}
                      >
                        <span>{dept}</span>
                        {isSelected && <span className="text-emerald-400 font-bold text-xs">✓ Active</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {targetScope === 'SPECIFIC_STUDENT' && (
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1 mt-2">
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">Select Candidate</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900"
                >
                  <option value="">-- Choose Candidate --</option>
                  {[...menteesList, ...studentsList].map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.rollNumber || 'No Roll No'}) · {s.department || 'Student'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 4. Session Configuration (Type-specific) */}
          <div className="space-y-3 p-4 bg-neutral-50/80 rounded-2xl border border-neutral-200/80">
            <span className="block font-semibold text-neutral-800 uppercase tracking-wider text-[10px]">
              4. Session Configuration &amp; Rubric
            </span>

            {sessionType === 'MOCK_INTERVIEW' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">Focus Technical Domain</label>
                  <input
                    type="text"
                    value={domainOrTopic}
                    onChange={(e) => setDomainOrTopic(e.target.value)}
                    placeholder="e.g. Distributed Systems, React & Node, DevOps"
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-700 mb-1">Target Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900"
                  >
                    <option value="EASY">Entry / Foundation (Fundamentals)</option>
                    <option value="MEDIUM">Intermediate (Practical Architecture)</option>
                    <option value="ADVANCED">Advanced (Concurrency &amp; Edge Cases)</option>
                    <option value="FAANG">Product Tier / FAANG Bar</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">Spoken Briefing Audio Passage *</label>
                <select
                  value={listeningPassageId}
                  onChange={(e) => setListeningPassageId(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 font-medium"
                >
                  {LISTENING_PASSAGES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.domain} · {p.durationSeconds}s)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Candidates will hear this passage spoken aloud by the voice engine without transcript cues, followed by oral comprehension checks.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                Custom Focus Notes / Instructions for Candidates (Optional)
              </label>
              <textarea
                rows={2}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g. Pay special attention to algorithmic trade-offs and explain your reasoning clearly without rushing."
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          {/* 5. Policy & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div className="flex items-center space-x-2 pt-5">
              <input
                type="checkbox"
                id="isMandatoryCheck"
                checked={isMandatory}
                onChange={(e) => setIsMandatory(e.target.checked)}
                className="w-4 h-4 rounded text-neutral-900 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="isMandatoryCheck" className="text-xs text-neutral-800 font-medium cursor-pointer">
                Mandatory for Placement Clearance
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-neutral-200 rounded-xl text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white font-semibold rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              {sessionType === 'MOCK_INTERVIEW' ? <Mic className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Assigning Assessment...' : `Assign ${sessionType === 'MOCK_INTERVIEW' ? 'Mock Interview Assessment' : 'Listening Assessment'}`}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
