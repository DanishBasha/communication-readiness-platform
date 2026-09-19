import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Zap, 
  ArrowLeft, 
  Share2, 
  BookOpen, 
  Mic2,
  Activity,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export const DiagnosticReportView: React.FC = () => {
  const { latestReport, setActiveView } = useApp();

  if (!latestReport) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>No assessment report found. Complete a mock interview first.</p>
        <button 
          onClick={() => setActiveView('DASHBOARD')}
          className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium"
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
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Session: #{latestReport.id}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            {latestReport.date}
          </span>
        </div>
      </div>

      {/* Proctoring Verification Pill Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
        latestReport.isFlagged 
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
      }`}>
        <div className="flex items-center gap-3">
          {latestReport.isFlagged ? (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          )}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">
              {latestReport.isFlagged ? 'Proctoring Flagged: Multiple Tab Switches' : 'Proctored Session Verified Clean'}
            </h4>
            <p className="text-xs opacity-90">
              {latestReport.tabSwitches} tab switch events logged during interview.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-950/60 border border-current">
          Audit ID: PR-{latestReport.id.toUpperCase()}
        </span>
      </div>

      {/* Hero Scorecard Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Scorecard */}
        <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <span className="text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
              Diagnostic Result
            </span>
            <h2 className="text-xl font-bold text-white">Placement Readiness Score</h2>
            <p className="text-xs text-slate-400 mt-1">Weighted composite of Technical Depth (70%) and Spoken Delivery (30%).</p>
          </div>

          <div className="my-6 flex items-baseline gap-2">
            <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 font-mono">
              {latestReport.overallScore}
            </span>
            <span className="text-xl font-semibold text-slate-500">/100</span>
            <span className={`ml-3 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              latestReport.overallScore >= 80 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {latestReport.overallScore >= 80 ? 'Placement Ready' : 'Training Recommended'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800/80">
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Technical Score</span>
              <span className="text-lg font-bold text-indigo-300 font-mono">{latestReport.technicalScore}%</span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Communication</span>
              <span className="text-lg font-bold text-emerald-300 font-mono">{latestReport.communicationScore}%</span>
            </div>
          </div>
        </div>

        {/* Communication Diagnostic Center */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mic2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Speech & Acoustic Diagnostics</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Transient Analysis Complete</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* WPM Pace Meter */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Speaking Pace</span>
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-white font-mono">{latestReport.averageWpm}</span>
                  <span className="text-xs text-slate-500">WPM</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 my-2.5">
                  <div 
                    className="bg-indigo-500 h-1.5 rounded-full" 
                    style={{ width: `${Math.min(100, (latestReport.averageWpm / 160) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Optimal range: 120–150 WPM
                </span>
              </div>

              {/* Filler Words */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Filler Words</span>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-amber-400 font-mono">{latestReport.totalFillerWords}</span>
                  <span className="text-xs text-slate-500">used</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {Object.entries(latestReport.fillerWordBreakdown).map(([word, count]) => (
                    <span key={word} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                      "{word}" ({count})
                    </span>
                  ))}
                </div>
              </div>

              {/* Delivery & Clarity */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Delivery Confidence</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-emerald-400 font-mono">88%</span>
                  <span className="text-xs text-slate-500">vocal clarity</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2.5 leading-snug">
                  Low sentence breaking; structured thought delivery maintained across turns.
                </p>
              </div>

            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <span>Trainer Tip: Aim to replace filler word 'uh' with deliberate micro-pauses (silent 1-second breath).</span>
          </div>
        </div>

      </div>

      {/* Granular Skill-by-Skill Proficiency Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Technical Domain Competency Breakdown</h3>
            <p className="text-xs text-slate-400">Evaluated against your uploaded resume projects and technical context.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Resume-Grounded Matrix</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {latestReport.skillBreakdown.map((item, idx) => (
            <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{item.skill}</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                  item.status === 'STRONG' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : item.status === 'MODERATE'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {item.score}% · {item.status.replace('_', ' ')}
                </span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full ${
                    item.status === 'STRONG' ? 'bg-emerald-400' :
                    item.status === 'MODERATE' ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                  style={{ width: `${item.score}%` }}
                />
              </div>

              <p className="text-xs text-slate-400 pt-1">
                {item.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Next Steps ("What to do next") */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Personalized Self-Improvement Roadmap</h3>
        </div>

        <div className="space-y-3">
          {latestReport.actionableNextSteps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
              <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
