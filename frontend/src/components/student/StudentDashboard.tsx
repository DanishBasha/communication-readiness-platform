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
  Award
} from 'lucide-react';
import { ResumeUploadModal } from './ResumeUploadModal';

export const StudentDashboard: React.FC = () => {
  const { 
    student, 
    startInterview, 
    toggleCriteriaTask, 
    latestReport, 
    setActiveView 
  } = useApp();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const completedCriteriaCount = student.criteriaTasks.filter((c: CriteriaTask) => c.isCompleted).length;
  const verifiedCriteriaCount = student.criteriaTasks.filter((c: CriteriaTask) => c.verifiedByMentor).length;
  const progressPercent = Math.round((completedCriteriaCount / student.criteriaTasks.length) * 100);

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
                <span className="text-neutral-400">({student.mentorEmail})</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center space-x-2 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-800 px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-2xs"
            >
              <FileText className="w-4 h-4 text-neutral-500" />
              <span>{student.resume ? 'Update Resume' : 'Upload Resume'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>
            </button>

            {latestReport && (
              <button
                onClick={() => setActiveView('REPORT_VIEW')}
                className="flex items-center space-x-2 bg-neutral-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-xs"
              >
                <TrendingUp className="w-4 h-4" />
                <span>View Scorecard ({latestReport.overallScore}/100)</span>
              </button>
            )}
          </div>

        </div>

        {/* Profiles Stat Strip */}
        <div className="mt-6 pt-6 border-t border-neutral-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/60">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>LeetCode Solved</span>
              <Code2 className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-neutral-900">{student.codingHandles.leetcodeSolved || 248}</span>
              <span className="text-[11px] text-neutral-500 font-medium">/ 300 Target</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">@{student.codingHandles.leetcode || 'aravind_k'}</p>
          </div>

          <div className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/60">
            <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
              <span>GitHub Repos</span>
              <GitBranch className="w-3.5 h-3.5 text-neutral-400" />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-bold text-neutral-900">{student.codingHandles.githubRepos || 18}</span>
              <span className="text-[11px] text-neutral-500 font-medium">Public</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-mono">@{student.codingHandles.github || 'aravindkumar'}</p>
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

    </div>
  );
};
