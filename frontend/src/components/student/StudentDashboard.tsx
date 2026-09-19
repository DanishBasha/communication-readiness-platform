import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ResumeUploadModal } from './ResumeUploadModal';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Mic2, 
  Headphones, 
  ArrowRight, 
  GitBranch, 
  Code, 
  Users, 
  TrendingUp, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { student, startInterview, setActiveView, toggleCriteriaTask } = useApp();
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  const completedTasksCount = student.criteriaTasks.filter(t => t.isCompleted).length;
  const verifiedTasksCount = student.criteriaTasks.filter(t => t.verifiedByMentor).length;
  const taskProgressPercent = Math.round((completedTasksCount / student.criteriaTasks.length) * 100);

  const trackBadgeColors: { [key: string]: string } = {
    HOPE_ELITE: 'bg-[#191C1A] text-white border-stone-800',
    HOPE_NON_ELITE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    PEP: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    DEPARTMENT: 'bg-stone-100 text-stone-800 border-stone-300'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. Student Profile Hero Card (Warm Paper & Deep Ink) */}
      <div className="bg-white border border-stone-200/90 rounded-[28px] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">{student.name}</h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-bold">
                {student.rollNumber}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${trackBadgeColors[student.track]}`}>
                {student.track === 'HOPE_ELITE' && '★ HOPE Elite (High Caliber)'}
                {student.track === 'HOPE_NON_ELITE' && 'HOPE Coding Track'}
                {student.track === 'PEP' && `PEP: ${student.pepDomain}`}
                {student.track === 'DEPARTMENT' && 'Department Stream'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              {student.department} • Class of {student.batchYear}
            </p>

            {/* Mentor Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-50 border border-stone-200 text-xs text-stone-700">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>Assigned Mentor: <strong className="text-stone-900 font-bold">{student.mentorName}</strong></span>
              <span className="text-[11px] text-stone-400">({student.mentorEmail})</span>
            </div>
          </div>

          {/* Right Action: Upload / Manage Resume */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setIsResumeModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#191C1A] hover:bg-stone-800 text-white font-bold text-xs sm:text-sm shadow-md transition transform active:scale-95"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>{student.resume ? 'Manage / Update Resume' : 'Upload Resume (Mandatory)'}</span>
            </button>
          </div>

        </div>

        {/* Coding Handles Bar */}
        <div className="mt-6 pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-stone-500 font-medium">Coding Handles:</span>
            
            {student.codingHandles.leetcode && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-50 text-stone-800 border border-stone-200 font-semibold">
                <Code className="w-3.5 h-3.5 text-amber-600" />
                <span>LeetCode: <strong>{student.codingHandles.leetcode}</strong> ({student.codingHandles.leetcodeSolved} solved)</span>
              </span>
            )}

            {student.codingHandles.github && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-50 text-stone-800 border border-stone-200 font-semibold">
                <GitBranch className="w-3.5 h-3.5 text-stone-600" />
                <span>GitHub: <strong>{student.codingHandles.github.replace('https://github.com/', '')}</strong> ({student.codingHandles.githubRepos} repos)</span>
              </span>
            )}
          </div>

          <div className="text-emerald-700 flex items-center gap-1.5 font-mono text-[11px] font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Profile Verified</span>
          </div>
        </div>

      </div>

      {/* 2. THE TWO PRIMARY ACTION CARDS (Bold Ink & Warm Bamboo) */}
      <div className="space-y-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 tracking-tight">Choose Assessment Mode</h2>
          <p className="text-xs text-stone-500">Voice-first proctored sessions designed to build natural communication clarity under pressure.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card A: Start AI Mock Interview (Bold Black & White with Bamboo) */}
          <div className="group relative bg-[#181C19] text-white border border-stone-800 rounded-[32px] p-8 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-110 transition duration-300">
                  <Mic2 className="w-7 h-7 text-emerald-400" />
                </div>
                <span className="text-xs font-mono uppercase font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Voice-First · Proctored
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-white group-hover:text-emerald-300 transition">
                  Attend AI Mock Interview
                </h3>
                <p className="text-xs sm:text-sm text-stone-300 mt-2 leading-relaxed">
                  Technical interview grounded directly in your uploaded resume projects and domain track. Features adaptive difficulty and real-time speech diagnostics.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10">
                  Resume-Grounded Questions
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10">
                  WPM & Filler Detection
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-stone-200 border border-white/10">
                  Anti-Tab-Switch Proctoring
                </span>
              </div>
            </div>

            <button
              onClick={() => startInterview('MOCK_INTERVIEW')}
              className="mt-8 w-full py-4 px-6 rounded-2xl font-black text-xs sm:text-sm bg-white hover:bg-emerald-50 text-[#181C19] shadow-lg flex items-center justify-center gap-2 group-hover:gap-3 transition duration-200"
            >
              <span>Launch Mock Interview Room</span>
              <ArrowRight className="w-4 h-4 text-emerald-600" />
            </button>
          </div>

          {/* Card B: Start Listening Comprehension (Warm Earth & Sage) */}
          <div className="group relative bg-[#F2ECE4] text-stone-900 border border-stone-300/80 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-stone-900 group-hover:scale-110 transition duration-300 shadow-sm">
                  <Headphones className="w-7 h-7 text-emerald-700" />
                </div>
                <span className="text-xs font-mono uppercase font-bold px-3 py-1 rounded-full bg-stone-200 text-stone-800 border border-stone-300">
                  Auditory Comprehension
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-stone-900 group-hover:text-emerald-800 transition">
                  Attend Listening Comprehension
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                  Listen to an AI-narrated corporate scenario or technical specification (text is hidden). Respond verbally to comprehension questions to test active listening and retention.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-stone-700 border border-stone-200 shadow-2xs">
                  Hidden Text Audio Passage
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-stone-700 border border-stone-200 shadow-2xs">
                  Verbal Retention Scoring
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white text-stone-700 border border-stone-200 shadow-2xs">
                  Concise Summary Check
                </span>
              </div>
            </div>

            <button
              onClick={() => startInterview('LISTENING_COMPREHENSION')}
              className="mt-8 w-full py-4 px-6 rounded-2xl font-black text-xs sm:text-sm bg-[#191C1A] hover:bg-stone-800 text-white shadow-md flex items-center justify-center gap-2 group-hover:gap-3 transition duration-200"
            >
              <span>Launch Listening Session</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

        </div>
      </div>

      {/* 3. Placement Criteria Checklist & Recent Score History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Placement Criteria Checklist */}
        <div className="lg:col-span-2 bg-white border border-stone-200/90 rounded-[28px] p-6 sm:p-8 shadow-sm space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900">College Placement Criteria Checklist</h3>
              <p className="text-xs text-stone-500">Imported from College CSV. Check off completed items for Faculty Mentor verification.</p>
            </div>
            
            <div className="text-right font-mono text-xs">
              <span className="text-emerald-700 font-bold">{completedTasksCount} / {student.criteriaTasks.length} Completed</span>
              <span className="text-stone-400 ml-2">({verifiedTasksCount} verified)</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-stone-100 rounded-full h-2.5">
            <div 
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${taskProgressPercent}%` }}
            />
          </div>

          {/* Checklist items */}
          <div className="space-y-3 pt-2">
            {student.criteriaTasks.map((task) => (
              <div 
                key={task.id}
                onClick={() => toggleCriteriaTask(task.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                  task.isCompleted 
                    ? 'bg-stone-50 border-stone-200' 
                    : 'bg-white border-stone-200/80 hover:border-emerald-500/40 hover:bg-stone-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                    task.isCompleted 
                      ? 'bg-emerald-600 border-emerald-600 text-white' 
                      : 'border-stone-300 bg-white'
                  }`}>
                    {task.isCompleted && <CheckCircle2 className="w-4 h-4" />}
                  </div>

                  <div>
                    <span className={`text-xs sm:text-sm font-semibold block ${task.isCompleted ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                      {task.title}
                    </span>
                    <span className="text-xs text-stone-500 block mt-0.5">
                      {task.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {task.verifiedByMentor ? (
                    <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Mentor Verified
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3 text-amber-600" /> Pending Sign-off
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Recent Performance & Score Trends */}
        <div className="bg-white border border-stone-200/90 rounded-[28px] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-stone-900">Latest Scorecard</h3>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>

            {student.recentReports.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 text-center">
                  <span className="text-xs text-stone-500 font-mono uppercase font-semibold">Placement Readiness</span>
                  <div className="text-5xl font-black text-stone-900 font-mono my-2">
                    {student.recentReports[0].overallScore}
                    <span className="text-sm text-stone-400 font-normal">/100</span>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-100/60 px-2.5 py-0.5 rounded-full">
                    Technical: {student.recentReports[0].technicalScore}% • Comm: {student.recentReports[0].communicationScore}%
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Speaking Pace:</span>
                    <strong className="text-stone-900 font-mono">{student.recentReports[0].averageWpm} WPM (Ideal)</strong>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Filler Words ('uh', 'um'):</span>
                    <strong className="text-amber-700 font-mono">{student.recentReports[0].totalFillerWords} detected</strong>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Proctor Status:</span>
                    <strong className="text-emerald-700 font-mono">Verified Clean</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-400">No previous mock interview recorded.</p>
            )}
          </div>

          <button
            onClick={() => setActiveView('REPORT_VIEW')}
            className="mt-6 w-full py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold border border-stone-300 transition flex items-center justify-center gap-1.5"
          >
            <span>View Full Diagnostic Report</span>
            <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
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
