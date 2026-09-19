import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ResumeUploadModal } from './ResumeUploadModal';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  Mic2, 
  Headphones, 
  ArrowRight, 
  GitBranch, 
  Code, 
  Award, 
  Users, 
  TrendingUp, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { student, startInterview, setActiveView, toggleCriteriaTask } = useApp();
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  const completedTasksCount = student.criteriaTasks.filter(t => t.isCompleted).length;
  const verifiedTasksCount = student.criteriaTasks.filter(t => t.verifiedByMentor).length;
  const taskProgressPercent = Math.round((completedTasksCount / student.criteriaTasks.length) * 100);

  const trackBadgeColors: { [key: string]: string } = {
    HOPE_ELITE: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    HOPE_NON_ELITE: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    PEP: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    DEPARTMENT: 'bg-slate-500/10 text-slate-300 border-slate-500/30'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Student Profile Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{student.name}</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {student.rollNumber}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${trackBadgeColors[student.track]}`}>
                {student.track === 'HOPE_ELITE' && '★ HOPE Elite (High Caliber)'}
                {student.track === 'HOPE_NON_ELITE' && 'HOPE Coding Track'}
                {student.track === 'PEP' && `PEP: ${student.pepDomain}`}
                {student.track === 'DEPARTMENT' && 'Department Stream'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-400">
              {student.department} • Batch of {student.batchYear}
            </p>

            {/* Mentor Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Assigned Mentor: <strong className="text-white">{student.mentorName}</strong></span>
              <span className="text-[11px] text-slate-400">({student.mentorEmail})</span>
            </div>
          </div>

          {/* Right Action: Upload / Manage Resume */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setIsResumeModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-indigo-600/25 transition"
            >
              <FileText className="w-4 h-4" />
              <span>{student.resume ? 'Manage / Update Resume' : 'Upload Resume (Mandatory)'}</span>
            </button>
          </div>

        </div>

        {/* Coding Handles Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-slate-400 font-medium">Coding Handles:</span>
            
            {student.codingHandles.leetcode && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 text-slate-200 border border-slate-800">
                <Code className="w-3.5 h-3.5 text-amber-400" />
                <span>LeetCode: <strong>{student.codingHandles.leetcode}</strong> ({student.codingHandles.leetcodeSolved} solved)</span>
              </span>
            )}

            {student.codingHandles.github && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 text-slate-200 border border-slate-800">
                <GitBranch className="w-3.5 h-3.5 text-slate-300" />
                <span>GitHub: <strong>{student.codingHandles.github.replace('https://github.com/', '')}</strong> ({student.codingHandles.githubRepos} repos)</span>
              </span>
            )}
          </div>

          <div className="text-slate-400 flex items-center gap-1.5 font-mono text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Profile Verified</span>
          </div>
        </div>

      </div>

      {/* 2. THE TWO PRIMARY ACTION CARDS (Interview vs Listening) */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Select Assessment Mode</h2>
          <p className="text-xs text-slate-400">Proctored evaluations generate detailed diagnostic feedback for placement readiness.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card A: Start AI Mock Interview */}
          <div className="group relative bg-gradient-to-br from-slate-900 to-indigo-950/50 hover:to-indigo-950/80 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition duration-300">
                  <Mic2 className="w-7 h-7" />
                </div>
                <span className="text-xs font-mono uppercase font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  Voice-First · Proctored
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition">
                  Attend AI Mock Interview
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Voice-driven technical interview grounded directly in your uploaded resume projects, frameworks, and domain track. Features live adaptive difficulty and real-time speech analytics.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                  Resume-Grounded Questions
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                  WPM & Filler Detection
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                  Anti-Tab-Switch Proctoring
                </span>
              </div>
            </div>

            <button
              onClick={() => startInterview('MOCK_INTERVIEW')}
              className="mt-6 w-full py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group-hover:gap-3 transition duration-200"
            >
              <span>Launch Mock Interview Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card B: Start Listening Comprehension */}
          <div className="group relative bg-gradient-to-br from-slate-900 to-cyan-950/40 hover:to-cyan-950/70 border border-slate-800 hover:border-cyan-500/50 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition duration-300">
                  <Headphones className="w-7 h-7" />
                </div>
                <span className="text-xs font-mono uppercase font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Auditory Comprehension
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition">
                  Attend Listening Comprehension
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Listen to an AI-narrated corporate scenario or complex technical requirement passage (text is hidden). Respond verbally to comprehension questions to test real-time listening and retention.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                  Hidden Text Audio Passage
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                  Verbal Retention Scoring
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                  Concise Summary Check
                </span>
              </div>
            </div>

            <button
              onClick={() => startInterview('LISTENING_COMPREHENSION')}
              className="mt-6 w-full py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 group-hover:gap-3 transition duration-200"
            >
              <span>Launch Listening Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* 3. Placement Criteria Checklist & Recent Score History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Placement Criteria Checklist (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">College Placement Criteria Checklist</h3>
              <p className="text-xs text-slate-400">Imported from College CSV. Complete items for Faculty Mentor verification.</p>
            </div>
            
            <div className="text-right font-mono text-xs">
              <span className="text-emerald-400 font-bold">{completedTasksCount} / {student.criteriaTasks.length} Completed</span>
              <span className="text-slate-500 ml-2">({verifiedTasksCount} verified)</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${taskProgressPercent}%` }}
            />
          </div>

          {/* Checklist items */}
          <div className="space-y-2.5 pt-1">
            {student.criteriaTasks.map((task) => (
              <div 
                key={task.id}
                onClick={() => toggleCriteriaTask(task.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  task.isCompleted 
                    ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700' 
                    : 'bg-slate-950/40 border-slate-800/60 hover:border-indigo-500/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                    task.isCompleted 
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                      : 'border-slate-700 bg-slate-900'
                  }`}>
                    {task.isCompleted && <CheckCircle2 className="w-4 h-4" />}
                  </div>

                  <div>
                    <span className={`text-xs font-medium block ${task.isCompleted ? 'text-slate-200 line-through opacity-80' : 'text-white'}`}>
                      {task.title}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {task.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {task.verifiedByMentor ? (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified by Mentor
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending Sign-off
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Recent Performance & Score Trends (1 Column) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Latest Evaluation</h3>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>

            {student.recentReports.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 font-mono">Placement Readiness Score</span>
                  <div className="text-5xl font-black text-white font-mono my-2">
                    {student.recentReports[0].overallScore}
                    <span className="text-sm text-slate-500 font-normal">/100</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium">
                    Technical: {student.recentReports[0].technicalScore}% • Comm: {student.recentReports[0].communicationScore}%
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Speaking Speed:</span>
                    <strong className="text-white font-mono">{student.recentReports[0].averageWpm} WPM (Good)</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Filler Words ('uh', 'um'):</span>
                    <strong className="text-amber-400 font-mono">{student.recentReports[0].totalFillerWords} detected</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Proctor Status:</span>
                    <strong className="text-emerald-400 font-mono">Verified Clean</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No previous mock interview recorded.</p>
            )}
          </div>

          <button
            onClick={() => setActiveView('REPORT_VIEW')}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-1.5"
          >
            <span>View Full Diagnostic Report</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

        </div>

      </div>

      {/* Mandatory Resume Upload Modal */}
      <ResumeUploadModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
      />

    </div>
  );
};
