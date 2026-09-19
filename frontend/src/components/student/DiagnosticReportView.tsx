import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Mic2,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export const DiagnosticReportView: React.FC = () => {
  const { latestReport, setActiveView } = useApp();

  if (!latestReport) {
    return (
      <div className="p-8 text-center text-stone-500">
        <p>No assessment report found. Complete a mock interview first.</p>
        <button 
          onClick={() => setActiveView('DASHBOARD')}
          className="mt-4 px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => setActiveView('DASHBOARD')}
          className="flex items-center gap-2 text-xs font-bold text-stone-700 hover:text-stone-900 px-4 py-2.5 rounded-xl bg-white border border-stone-200 shadow-2xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-mono">Session #{latestReport.id}</span>
          <span className="text-xs px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-800 font-mono font-semibold">
            {latestReport.date}
          </span>
        </div>
      </div>

      {/* Proctoring Verification Pill Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        latestReport.isFlagged 
          ? 'bg-rose-50 border-rose-200 text-rose-900' 
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          {latestReport.isFlagged ? (
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          )}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">
              {latestReport.isFlagged ? 'Proctoring Flagged: Tab Switch Overuse' : 'Proctored Session Verified Clean'}
            </h4>
            <p className="text-xs opacity-90">
              {latestReport.tabSwitches} tab switch events recorded.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-white border border-current shadow-2xs">
          Audit: PR-{latestReport.id.toUpperCase()}
        </span>
      </div>

      {/* Hero Scorecard Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Scorecard (Bold Black & White with Jade) */}
        <div className="bg-[#181C19] text-white border border-stone-800 rounded-[32px] p-8 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-1">
              Assessment Diagnostic
            </span>
            <h2 className="text-2xl font-black text-white">Placement Readiness Score</h2>
            <p className="text-xs text-stone-300 mt-1">Weighted composite of Technical Depth (70%) and Spoken Delivery (30%).</p>
          </div>

          <div className="my-6 flex items-baseline gap-2">
            <span className="text-6xl font-black text-white font-mono">
              {latestReport.overallScore}
            </span>
            <span className="text-xl font-semibold text-stone-400">/100</span>
            <span className="ml-3 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {latestReport.overallScore >= 80 ? 'Placement Ready' : 'Training Recommended'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-800">
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <span className="text-[11px] text-stone-300 block">Technical Depth</span>
              <span className="text-xl font-extrabold text-emerald-300 font-mono">{latestReport.technicalScore}%</span>
            </div>
            <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
              <span className="text-[11px] text-stone-300 block">Communication</span>
              <span className="text-xl font-extrabold text-stone-200 font-mono">{latestReport.communicationScore}%</span>
            </div>
          </div>
        </div>

        {/* Communication Diagnostic Center */}
        <div className="lg:col-span-2 bg-white border border-stone-200/90 rounded-[32px] p-7 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Mic2 className="w-5 h-5 text-emerald-700" />
                <h3 className="text-lg font-extrabold text-stone-900">Speech & Acoustic Diagnostics</h3>
              </div>
              <span className="text-xs text-stone-400 font-mono">Transient Analysis Done</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Speaking Pace */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2 font-medium">
                  <span>Speaking Pace</span>
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-stone-900 font-mono">{latestReport.averageWpm}</span>
                  <span className="text-xs text-stone-500">WPM</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2 my-2.5">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (latestReport.averageWpm / 160) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-emerald-700 font-bold">
                  Optimal: 120–150 WPM
                </span>
              </div>

              {/* Filler Words */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2 font-medium">
                  <span>Filler Words</span>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-amber-700 font-mono">{latestReport.totalFillerWords}</span>
                  <span className="text-xs text-stone-500">used</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {Object.entries(latestReport.fillerWordBreakdown).map(([word, count]) => (
                    <span key={word} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                      "{word}" ({count})
                    </span>
                  ))}
                </div>
              </div>

              {/* Delivery Confidence */}
              <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2 font-medium">
                  <span>Vocal Confidence</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-emerald-700 font-mono">88%</span>
                  <span className="text-xs text-stone-500">clarity</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-2 leading-snug">
                  Structured sentence flow; steady voice pitch maintained.
                </p>
              </div>

            </div>
          </div>

          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900 font-medium">
            <span>Coach Note: Practice silent pauses (1-second deep breath) to eliminate residual 'uh' filler habits.</span>
          </div>
        </div>

      </div>

      {/* Granular Skill-by-Skill Breakdown */}
      <div className="bg-white border border-stone-200/90 rounded-[32px] p-7 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-stone-900">Technical Competency Matrix</h3>
            <p className="text-xs text-stone-500">Grounded in your uploaded resume projects and technical claims.</p>
          </div>
          <span className="text-xs font-mono text-stone-400 font-bold">Resume Verification</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {latestReport.skillBreakdown.map((item, idx) => (
            <div key={idx} className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-stone-900">{item.skill}</span>
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  item.status === 'STRONG' 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : item.status === 'MODERATE'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-rose-100 text-rose-800 border-rose-200'
                }`}>
                  {item.score}% · {item.status.replace('_', ' ')}
                </span>
              </div>

              <div className="w-full bg-stone-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    item.status === 'STRONG' ? 'bg-emerald-600' :
                    item.status === 'MODERATE' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${item.score}%` }}
                />
              </div>

              <p className="text-xs text-stone-600 pt-1">
                {item.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Self-Improvement Roadmap */}
      <div className="bg-white border border-stone-200/90 rounded-[32px] p-7 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-extrabold text-stone-900">Personalized Self-Improvement Roadmap</h3>
        </div>

        <div className="space-y-3">
          {latestReport.actionableNextSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3.5 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div className="w-6 h-6 rounded-full bg-[#191C1A] text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-medium">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
