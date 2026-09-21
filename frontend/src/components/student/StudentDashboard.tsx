import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CriteriaTask } from '../../types';
import { 
  Mic, 
  Headphones, 
  FileText, 
  CheckCircle2, 
  Clock, 
  GitBranch, 
  Code2, 
  Sparkles, 
  ShieldCheck, 
  ArrowUpRight,
  TrendingUp,
  Award,
  Edit3,
  X,
  AlertTriangle
} from 'lucide-react';
import { ResumeUploadModal } from './ResumeUploadModal';
import { SuggestionChatModal } from './SuggestionChatModal';

export const StudentDashboard: React.FC = () => {
  const { 
    student, 
    startInterview, 
    toggleCriteriaTask, 
    latestReport, 
    setActiveView,
    updateCodingHandles
  } = useApp();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [handlesModalOpen, setHandlesModalOpen] = useState(false);
  const [lcUsername, setLcUsername] = useState(student.codingHandles?.leetcode || '');
  const [lcSolvedCount, setLcSolvedCount] = useState<number>(student.codingHandles?.leetcodeSolved ?? 0);
  const [ghUsername, setGhUsername] = useState(student.codingHandles?.github || '');
  const [ghReposCount, setGhReposCount] = useState<number>(student.codingHandles?.githubRepos ?? 0);
  const [savingHandles, setSavingHandles] = useState(false);

  const completedCriteriaCount = student.criteriaTasks.filter((c: CriteriaTask) => c.isCompleted).length;
  const verifiedCriteriaCount = student.criteriaTasks.filter((c: CriteriaTask) => c.verifiedByMentor).length;
  const progressPercent = Math.round((completedCriteriaCount / (student.criteriaTasks.length || 1)) * 100);

  const handleSaveHandles = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingHandles(true);
    try {
      await updateCodingHandles({
        leetcode: lcUsername.trim() || undefined,
        leetcodeSolved: Number(lcSolvedCount) || 0,
        github: ghUsername.trim() || undefined,
        githubRepos: Number(ghReposCount) || 0
      });
      setHandlesModalOpen(false);
    } catch (err) {
      console.warn('Error saving handles:', err);
    } finally {
      setSavingHandles(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* 1. Candidate Hero Header */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {student.name}
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold bg-neutral-900 text-white rounded-full">
                ★ {student.track}
              </span>
              <span className="px-2.5 py-1 text-xs font-medium bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200 font-mono">
                {student.rollNumber}
              </span>
            </div>

            <p className="text-sm text-neutral-500 max-w-2xl">
              {student.department} · Batch of {student.batchYear} · Primary Track: {student.pepDomain || 'Full Stack'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
              <div className="flex items-center space-x-1.5">
                <span className="text-neutral-400 font-normal">Faculty Mentor:</span>
                <span className="font-medium text-neutral-800">{student.mentorName}</span>
                {student.mentorEmail && <span className="text-neutral-400">({student.mentorEmail})</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={() => setSuggestionModalOpen(true)}
              className="flex items-center space-x-2 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-800 px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>AI Suggestion Coach</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1 animate-pulse"></span>
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center space-x-2 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-800 px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-2xs"
            >
              <FileText className="w-4 h-4 text-neutral-500" />
              <span>{student.resume ? 'Update Resume' : 'Upload Resume'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>
            </button>

            {latestReport ? (
              <button
                onClick={() => setActiveView('REPORT_VIEW')}
                className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-xs"
              >
                <TrendingUp className="w-4 h-4" />
                <span>View Scorecard ({latestReport.overallScore}/100)</span>
              </button>
            ) : (
              <button
                onClick={() => startInterview('MOCK_INTERVIEW')}
                className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-xs"
              >
                <Mic className="w-4 h-4" />
                <span>Take 1st Mock Interview</span>
              </button>
            )}
          </div>

        </div>

        {/* Profiles Stat Strip */}
        <div className="mt-6 pt-6 border-t border-neutral-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/60 relative group">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>LeetCode Solved</span>
              <button 
                onClick={() => {
                  setLcUsername(student.codingHandles?.leetcode || '');
                  setLcSolvedCount(student.codingHandles?.leetcodeSolved ?? 0);
                  setGhUsername(student.codingHandles?.github || '');
                  setGhReposCount(student.codingHandles?.githubRepos ?? 0);
                  setHandlesModalOpen(true);
                }}
                className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors"
                title="Edit handles"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-neutral-900">{student.codingHandles?.leetcodeSolved ?? 0}</span>
              <span className="text-[11px] text-neutral-500 font-medium">/ 300 Target</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono truncate">
              {student.codingHandles?.leetcode ? `@${student.codingHandles.leetcode}` : 'Not connected'}
            </p>
          </div>

          <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/60 relative group">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>GitHub Repos</span>
              <button 
                onClick={() => {
                  setLcUsername(student.codingHandles?.leetcode || '');
                  setLcSolvedCount(student.codingHandles?.leetcodeSolved ?? 0);
                  setGhUsername(student.codingHandles?.github || '');
                  setGhReposCount(student.codingHandles?.githubRepos ?? 0);
                  setHandlesModalOpen(true);
                }}
                className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors"
                title="Edit handles"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-neutral-900">{student.codingHandles?.githubRepos ?? 0}</span>
              <span className="text-[11px] text-neutral-500 font-medium">Public</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono truncate">
              {student.codingHandles?.github ? `@${student.codingHandles.github}` : 'Not connected'}
            </p>
          </div>

          <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/60">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Mentor Sign-offs</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-neutral-900">{verifiedCriteriaCount}</span>
              <span className="text-[11px] text-neutral-500 font-medium">/ {student.criteriaTasks.length} items</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Mentor verification active</p>
          </div>

          <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/60">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>Readiness Progress</span>
              <Award className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-neutral-900">{progressPercent}%</span>
              <span className="text-[11px] text-neutral-500 font-medium">Cohort target</span>
            </div>
            <div className="w-full bg-neutral-200 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-neutral-900 h-full rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Resume & Skills Intake Grounding Section */}
      {!student.resume ? (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in">
          <div className="flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-neutral-900">Resume Intake Pending</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200/80 text-amber-900 rounded font-mono uppercase">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
                Upload your resume (PDF or pasted text) to extract your verified tech stack (Languages, Frameworks, Databases) and projects. The AI Interviewer uses your extracted profile to ask personalized, resume-grounded technical questions.
              </p>
            </div>
          </div>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="bg-neutral-900 hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload Resume Now</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-neutral-100">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-neutral-900">
                    Active Resume Grounding: {student.resume.fileName}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded font-mono uppercase">
                    Verified &amp; Active
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Parsed on {student.resume.parsedAt || new Date().toISOString().split('T')[0]} · Grounding enabled for Mock AI Interviews
                </p>
              </div>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-xl transition-colors shrink-0 flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <FileText className="w-3.5 h-3.5 text-neutral-500" />
              <span>Update Resume</span>
            </button>
          </div>

          {student.resume.summary && (
            <p className="text-xs text-neutral-600 bg-neutral-50/60 p-3 rounded-xl border border-neutral-100 leading-relaxed italic">
              "{student.resume.summary}"
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs">
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">Languages</span>
              <div className="flex flex-wrap gap-1">
                {student.resume.skills?.languages?.length ? (
                  student.resume.skills.languages.map((l: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-[11px] font-medium text-neutral-800">
                      {l}
                    </span>
                  ))
                ) : <span className="text-neutral-400 italic">None listed</span>}
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">Frameworks</span>
              <div className="flex flex-wrap gap-1">
                {student.resume.skills?.frameworks?.length ? (
                  student.resume.skills.frameworks.map((f: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-[11px] font-medium text-neutral-800">
                      {f}
                    </span>
                  ))
                ) : <span className="text-neutral-400 italic">None listed</span>}
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">Databases</span>
              <div className="flex flex-wrap gap-1">
                {student.resume.skills?.databases?.length ? (
                  student.resume.skills.databases.map((d: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-[11px] font-medium text-neutral-800">
                      {d}
                    </span>
                  ))
                ) : <span className="text-neutral-400 italic">None listed</span>}
              </div>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/60 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">Tools &amp; Cloud</span>
              <div className="flex flex-wrap gap-1">
                {student.resume.skills?.tools?.length ? (
                  student.resume.skills.tools.map((t: string, i: number) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-[11px] font-medium text-neutral-800">
                      {t}
                    </span>
                  ))
                ) : <span className="text-neutral-400 italic">None listed</span>}
              </div>
            </div>
          </div>

          {student.resume.projects && student.resume.projects.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold mb-2">Parsed Projects Grounded For AI Questions</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {student.resume.projects.map((proj: any, idx: number) => (
                  <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-neutral-900 truncate">{proj.title}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700 font-mono">Project {idx + 1}</span>
                    </div>
                    {proj.techStack && (
                      <p className="text-[10px] text-neutral-500 font-mono truncate">Stack: {Array.isArray(proj.techStack) ? proj.techStack.join(', ') : proj.techStack}</p>
                    )}
                    {proj.description && (
                      <p className="text-[11px] text-neutral-600 line-clamp-2">{proj.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Primary Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card A: Voice AI Mock Interview */}
        <div className="relative overflow-hidden bg-neutral-950 text-white rounded-2xl p-7 border border-neutral-800 shadow-sm flex flex-col justify-between group">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-800/80 text-neutral-200 border border-neutral-700">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Resume-Grounded Proctored Interview</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">PROCTORED</span>
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Attend AI Mock Interview
              </h2>
              <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                Engage in an adaptive verbal technical interview grounded in your uploaded resume projects, concurrency concepts, and algorithmic problem solving.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">Mode</p>
                <p className="text-xs font-medium text-neutral-200 mt-0.5">Voice-to-Voice</p>
              </div>
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">Adaptive</p>
                <p className="text-xs font-medium text-neutral-200 mt-0.5">3 Question Turns</p>
              </div>
              <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">Proctoring</p>
                <p className="text-xs font-medium text-emerald-400 mt-0.5">Strict Focus</p>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-400">Includes WPM Pace & Filler Diagnostics</span>
            <button
              onClick={() => startInterview('MOCK_INTERVIEW')}
              className="inline-flex items-center space-x-2 bg-white hover:bg-neutral-100 text-neutral-950 font-semibold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Launch Interview</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Card B: Listening Comprehension */}
        <div className="relative overflow-hidden bg-white text-neutral-900 rounded-2xl p-7 border border-neutral-200/90 shadow-xs flex flex-col justify-between group hover:border-neutral-300 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                <Headphones className="w-3 h-3 text-neutral-600" />
                <span>Auditory Retention & Briefing</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">2 REPLAYS MAX</span>
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
                Listening Comprehension
              </h2>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                Listen to a client architecture requirement passage without text cues, followed by 2 targeted verbal questions testing precision listening.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Audio Pass</p>
                <p className="text-xs font-medium text-neutral-800 mt-0.5">FinPay Gateway</p>
              </div>
              <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Format</p>
                <p className="text-xs font-medium text-neutral-800 mt-0.5">Audio Only</p>
              </div>
              <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">Feedback</p>
                <p className="text-xs font-medium text-neutral-800 mt-0.5">Instant Score</p>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-500">Tests auditory retention & verbal recall</span>
            <button
              onClick={() => startInterview('LISTENING_COMPREHENSION')}
              className="inline-flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white font-medium px-5 py-2.5 rounded-xl text-xs transition-all shadow-xs"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Start Listening</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 3. Placement Criteria Checklist */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-6 border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold tracking-tight text-neutral-900">
                College Placement Readiness Criteria
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200 font-mono">
                {completedCriteriaCount} of {student.criteriaTasks.length} Completed
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Checklist items imported from college placement syllabus. Click items to toggle; mentor sign-off requires mentor verification.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-neutral-500">Verified Status:</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <ShieldCheck className="w-3 h-3 mr-1" /> {verifiedCriteriaCount} Signed Off
            </span>
          </div>
        </div>

        <div className="divide-y divide-neutral-100">
          {student.criteriaTasks.map((item: CriteriaTask) => (
            <div 
              key={item.id}
              className={`p-4 sm:px-6 flex items-center justify-between hover:bg-neutral-50/70 transition-colors ${
                item.isCompleted ? 'bg-neutral-50/30' : ''
              }`}
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <button
                  onClick={() => toggleCriteriaTask(item.id)}
                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                    item.isCompleted 
                      ? 'bg-neutral-900 text-white border border-neutral-900' 
                      : 'border border-neutral-300 hover:border-neutral-400 bg-white'
                  }`}
                >
                  {item.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className={`text-xs font-medium ${item.isCompleted ? 'line-through text-neutral-400' : 'text-neutral-800'}`}>
                      {item.title}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono">
                      {item.targetTrack}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 ml-4 flex-shrink-0">
                {item.verifiedByMentor ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/70">
                    <Clock className="w-3 h-3 mr-1" /> Pending Sign-off
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {uploadModalOpen && (
        <ResumeUploadModal onClose={() => setUploadModalOpen(false)} />
      )}

      {suggestionModalOpen && (
        <SuggestionChatModal onClose={() => setSuggestionModalOpen(false)} studentId={student.id} />
      )}

      {/* 4. Link / Edit Coding Handles Modal */}
      {handlesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Link Coding Handles</h3>
                  <p className="text-xs text-neutral-500">Connect your personal LeetCode &amp; GitHub stats</p>
                </div>
              </div>
              <button 
                onClick={() => setHandlesModalOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHandles} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">LeetCode Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-neutral-400 font-mono">@</span>
                  <input
                    type="text"
                    value={lcUsername}
                    onChange={(e) => setLcUsername(e.target.value)}
                    placeholder="e.g. bavan_dev"
                    className="w-full pl-7 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">LeetCode Problems Solved</label>
                <input
                  type="number"
                  min="0"
                  max="3500"
                  value={lcSolvedCount}
                  onChange={(e) => setLcSolvedCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">GitHub Handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-neutral-400 font-mono">@</span>
                  <input
                    type="text"
                    value={ghUsername}
                    onChange={(e) => setGhUsername(e.target.value)}
                    placeholder="e.g. bavanbalaji007"
                    className="w-full pl-7 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 font-mono transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Public GitHub Repositories</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={ghReposCount}
                  onChange={(e) => setGhReposCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setHandlesModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHandles}
                  className="bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingHandles ? 'Saving...' : 'Save Handles'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
