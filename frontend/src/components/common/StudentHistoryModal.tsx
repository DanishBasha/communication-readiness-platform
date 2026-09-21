import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Mic, 
  AlertTriangle, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Code2,
  Calendar,
  Layers,
  GraduationCap
} from 'lucide-react';
import { api } from '../../services/api';

interface StudentHistoryModalProps {
  studentIdOrUserId: string;
  onClose: () => void;
}

export const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({
  studentIdOrUserId,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'resume' | 'checklist'>('sessions');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.admin.getStudentFullHistory(studentIdOrUserId);
        if (isMounted) {
          setData(res);
          if (res.interviewSessions && res.interviewSessions.length > 0) {
            setExpandedSessionId(res.interviewSessions[0].id);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch student complete activity.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [studentIdOrUserId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-xl">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-neutral-600">Loading student history, telemetry, and reports...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
          <div className="flex items-center space-x-2 text-rose-600 font-semibold text-sm">
            <AlertTriangle className="w-5 h-5" />
            <span>Access Error</span>
          </div>
          <p className="text-xs text-neutral-600">{error || 'Could not load student profile.'}</p>
          <button
            onClick={onClose}
            className="w-full bg-neutral-900 text-white text-xs font-medium py-2 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { student, resume, checklist, interviewSessions } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-neutral-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 bg-neutral-50 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
              {student.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-neutral-900">{student.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800">
                  {student.track}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-100 text-blue-800">
                  Roll: {student.roll_number}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {student.department} · Batch of {student.batch_year} · Mentor: <strong>{student.mentor_name || 'Unassigned'}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Header Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-neutral-100/70 border-b border-neutral-200 text-xs font-mono">
          <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
            <span className="text-[10px] text-neutral-400 block uppercase">LeetCode Solved</span>
            <span className="font-bold text-neutral-900 text-sm">{student.leetcode_solved || 0}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
            <span className="text-[10px] text-neutral-400 block uppercase">GitHub Repos</span>
            <span className="font-bold text-neutral-900 text-sm">{student.github_repos || 0}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
            <span className="text-[10px] text-neutral-400 block uppercase">Mock Sessions</span>
            <span className="font-bold text-neutral-900 text-sm">{interviewSessions.length}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-neutral-200/80">
            <span className="text-[10px] text-neutral-400 block uppercase">Criteria Verified</span>
            <span className="font-bold text-emerald-700 text-sm">
              {checklist.filter((t: any) => t.verified_by_mentor).length} / {checklist.length}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 px-5 pt-3 space-x-6 text-xs font-medium">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`pb-3 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'sessions'
                ? 'border-neutral-900 text-neutral-900 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Mock Interviews &amp; Turns ({interviewSessions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`pb-3 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'resume'
                ? 'border-neutral-900 text-neutral-900 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Parsed Resume &amp; Skills</span>
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`pb-3 border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'checklist'
                ? 'border-neutral-900 text-neutral-900 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Placement Checklist ({checklist.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">

          {/* TAB 1: INTERVIEW SESSIONS & TURNS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {interviewSessions.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
                  <Mic className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-neutral-700">No mock interview sessions recorded yet.</p>
                  <p className="text-[11px] text-neutral-500 mt-1">When the student attends practice or mock drills, their complete turn-by-turn transcripts, speech telemetry, and AI scorecards will appear here.</p>
                </div>
              ) : (
                interviewSessions.map((sess: any) => {
                  const isExpanded = expandedSessionId === sess.id;
                  return (
                    <div key={sess.id} className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                      <div 
                        onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                        className="p-4 bg-neutral-50/70 hover:bg-neutral-100/60 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            sess.report && sess.report.overallScore >= 80 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : sess.report && sess.report.overallScore >= 65 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-neutral-200 text-neutral-700'
                          }`}>
                            {sess.report ? Math.round(sess.report.overallScore) : '—'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-neutral-900">{sess.sessionType}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-200 font-mono">
                                {sess.difficulty}
                              </span>
                              {sess.isProctorFlagged && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-semibold flex items-center">
                                  <AlertTriangle className="w-3 h-3 mr-0.5" /> Flagged
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                              {new Date(sess.startedAt).toLocaleString()} · {sess.turns?.length || 0} Questions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {sess.report && (
                            <div className="hidden sm:flex items-center space-x-3 text-xs font-mono text-neutral-600">
                              <span>Tech: <strong>{Math.round(sess.report.technicalScore)}</strong></span>
                              <span>Comm: <strong>{Math.round(sess.report.communicationScore)}</strong></span>
                              <span>WPM: <strong>{sess.report.averageWpm}</strong></span>
                              <span>Fillers: <strong>{sess.report.totalFillerWords}</strong></span>
                            </div>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                        </div>
                      </div>

                      {/* Expanded Turns & Telemetry */}
                      {isExpanded && (
                        <div className="p-4 border-t border-neutral-200 space-y-4 bg-white">
                          
                          {/* Diagnostic Summary if available */}
                          {sess.report && (
                            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                              <h4 className="text-xs font-bold text-neutral-900 flex items-center">
                                <Award className="w-3.5 h-3.5 text-neutral-700 mr-1.5" />
                                Session Scorecard Summary
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                                <div className="bg-white p-2 rounded border border-neutral-200">Overall: <strong>{sess.report.overallScore}/100</strong></div>
                                <div className="bg-white p-2 rounded border border-neutral-200">Technical: <strong>{sess.report.technicalScore}/100</strong></div>
                                <div className="bg-white p-2 rounded border border-neutral-200">Communication: <strong>{sess.report.communicationScore}/100</strong></div>
                                <div className="bg-white p-2 rounded border border-neutral-200">Tab Switches: <strong>{sess.tabSwitchCount}</strong></div>
                              </div>
                            </div>
                          )}

                          {/* Turn by turn Q&A */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-neutral-900 uppercase font-mono tracking-wider">
                              Turn-by-Turn Question &amp; Transcript Analysis ({sess.turns?.length || 0})
                            </h4>
                            {sess.turns && sess.turns.length > 0 ? (
                              sess.turns.map((turn: any) => (
                                <div key={turn.turn_number} className="p-3 bg-neutral-50/50 rounded-xl border border-neutral-200 text-xs space-y-2">
                                  <div className="flex items-center justify-between font-mono text-[11px] text-neutral-500">
                                    <span className="font-bold text-neutral-800">Q{turn.turn_number} · {turn.difficulty}</span>
                                    <div className="flex items-center space-x-3">
                                      <span>Tech: <strong>{Math.round(turn.technical_score)}</strong></span>
                                      <span>Comm: <strong>{Math.round(turn.communication_score)}</strong></span>
                                      <span>Pace: <strong>{turn.speaking_pace_wpm} WPM</strong></span>
                                      <span>Fillers: <strong>{turn.filler_word_count}</strong></span>
                                    </div>
                                  </div>
                                  <p className="font-medium text-neutral-900 bg-white p-2 rounded border border-neutral-200/70">
                                    {turn.question_text}
                                  </p>
                                  <div>
                                    <span className="text-[10px] uppercase font-mono text-neutral-400 block">Candidate Speech Transcript:</span>
                                    <p className="text-neutral-700 italic bg-white p-2 rounded border border-neutral-200/70 text-[11px]">
                                      "{turn.student_transcript || 'No transcribed speech input.'}"
                                    </p>
                                  </div>
                                  {turn.feedback && (
                                    <div className="text-[11px] text-neutral-600 bg-emerald-50/60 border border-emerald-200/60 p-2 rounded">
                                      <strong>AI Coach Evaluation:</strong> {turn.feedback}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-neutral-500 italic">No turns completed in this session.</p>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: PARSED RESUME & SKILLS */}
          {activeTab === 'resume' && (
            <div className="space-y-4">
              {!resume ? (
                <div className="p-8 text-center border-2 border-dashed border-neutral-200 rounded-2xl">
                  <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-neutral-700">Resume Intake Pending</p>
                  <p className="text-[11px] text-neutral-500 mt-1">The candidate has not uploaded their resume yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">Technical Profile Summary</span>
                      <span className="text-[10px] font-mono text-neutral-400">File: {resume.fileName} ({resume.parsedAt})</span>
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed">{resume.summary}</p>
                  </div>

                  {/* Skills Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">Programming Languages</span>
                      <div className="flex flex-wrap gap-1.5">
                        {resume.skills.languages?.length > 0 ? (
                          resume.skills.languages.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 font-mono border border-blue-200/60">
                              {s}
                            </span>
                          ))
                        ) : <span className="text-xs text-neutral-400">None detected</span>}
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">Frameworks &amp; Libraries</span>
                      <div className="flex flex-wrap gap-1.5">
                        {resume.skills.frameworks?.length > 0 ? (
                          resume.skills.frameworks.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 font-mono border border-purple-200/60">
                              {s}
                            </span>
                          ))
                        ) : <span className="text-xs text-neutral-400">None detected</span>}
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">Databases</span>
                      <div className="flex flex-wrap gap-1.5">
                        {resume.skills.databases?.length > 0 ? (
                          resume.skills.databases.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 font-mono border border-emerald-200/60">
                              {s}
                            </span>
                          ))
                        ) : <span className="text-xs text-neutral-400">None detected</span>}
                      </div>
                    </div>

                    <div className="p-3 bg-white border border-neutral-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 block font-bold">Tools &amp; Cloud</span>
                      <div className="flex flex-wrap gap-1.5">
                        {resume.skills.tools?.length > 0 ? (
                          resume.skills.tools.map((s: string) => (
                            <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-700 font-mono border border-amber-200/60">
                              {s}
                            </span>
                          ))
                        ) : <span className="text-xs text-neutral-400">None detected</span>}
                      </div>
                    </div>
                  </div>

                  {/* Projects */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-neutral-900 block font-mono uppercase">Verified Engineering Projects</span>
                    {resume.projects && resume.projects.length > 0 ? (
                      resume.projects.map((proj: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white border border-neutral-200 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-neutral-900">{proj.title}</h4>
                            <div className="flex flex-wrap gap-1">
                              {proj.techStack?.map((t: string) => (
                                <span key={t} className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-100 text-neutral-700 font-mono">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-neutral-600 text-[11px] leading-relaxed">{proj.description}</p>
                        </div>
                      ))
                    ) : <p className="text-xs text-neutral-400">No project archetypes extracted.</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CRITERIA CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-2">
              {checklist.map((task: any) => (
                <div key={task.id} className="p-3 bg-white border border-neutral-200 rounded-xl flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start space-x-2.5">
                    <div className="mt-0.5">
                      {task.verified_by_mentor ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : task.is_completed ? (
                        <Clock className="w-4 h-4 text-amber-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-300" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{task.title}</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{task.description}</p>
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap font-mono text-[10px]">
                    {task.verified_by_mentor ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Verified</span>
                    ) : task.is_completed ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">Pending Verification</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-500">Not Started</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-900 hover:bg-black text-white text-xs font-medium rounded-xl transition-all shadow-xs"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
