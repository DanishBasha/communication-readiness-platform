import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Activity, 
  Mic
} from 'lucide-react';

export const DiagnosticReportView: React.FC = () => {
  const { latestReport, setActiveView } = useApp();

  if (!latestReport) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveView('DASHBOARD')}
          className="flex items-center space-x-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Student Dashboard</span>
        </button>

        <span className="px-2.5 py-1 text-xs font-mono font-medium bg-neutral-100 text-neutral-600 rounded-md border border-neutral-200">
          SESSION #{latestReport.id.toUpperCase()}
        </span>
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-white font-mono">
                EVALUATION COMPLETE
              </span>
              <span className="text-xs text-neutral-500 font-mono">{latestReport.date}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Placement Communication Scorecard
            </h1>
            <p className="text-xs text-neutral-500 leading-relaxed max-w-xl">
              Holistic readiness evaluation synthesized from spoken vocabulary, technical depth, words-per-minute articulation, and filler word density.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-center">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider font-mono">Overall Readiness</p>
            <div className="flex items-baseline space-x-1 my-1">
              <span className="text-5xl font-black tracking-tight text-neutral-900">{latestReport.overallScore}</span>
              <span className="text-base text-neutral-400 font-medium">/100</span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 mt-1">
              Placement Ready
            </span>
          </div>

        </div>

        <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-neutral-100 text-center">
          <div className="p-3">
            <p className="text-[11px] text-neutral-400 font-mono uppercase">Technical Depth</p>
            <p className="text-xl font-bold text-neutral-900 mt-0.5">{latestReport.technicalScore}%</p>
          </div>
          <div className="p-3 border-x border-neutral-100">
            <p className="text-[11px] text-neutral-400 font-mono uppercase">Clarity & Delivery</p>
            <p className="text-xl font-bold text-neutral-900 mt-0.5">{latestReport.communicationScore}%</p>
          </div>
          <div className="p-3">
            <p className="text-[11px] text-neutral-400 font-mono uppercase">Proctoring Status</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5 font-mono">{latestReport.tabSwitches} Switches</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-neutral-700" />
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Speaking Pace Meter</h3>
            </div>
            <span className="text-xs font-mono font-medium text-neutral-500">Target: 120-150 WPM</span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-neutral-900">{latestReport.averageWpm}</span>
            <span className="text-xs text-neutral-500 font-medium">Words Per Minute</span>
          </div>

          <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-neutral-900 h-full rounded-full" 
              style={{ width: `${Math.min(100, (latestReport.averageWpm / 160) * 100)}%` }} 
            />
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Pace is within conversational range for technical interviews. Clear pauses were noted before system architecture explanations.
          </p>
        </div>

        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4 text-neutral-700" />
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">Filler Word Density</h3>
            </div>
            <span className="text-xs font-mono font-medium text-neutral-500">Total: {latestReport.totalFillerWords} detected</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(latestReport.fillerWordBreakdown).map(([word, count]) => (
              <div key={word} className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs">
                <span className="font-medium text-neutral-800">"{word}"</span>
                <span className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700 font-mono text-[10px]">x{Number(count)}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-neutral-500 leading-relaxed">
            Filler word usage is low. Recommend replacing habitual "basically" transitions with intentional 1-second silence.
          </p>
        </div>

      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
          Technical Skill Competency Analysis
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {latestReport.skillBreakdown.map((item, idx: number) => (
            <div key={idx} className="p-3.5 bg-neutral-50 border border-neutral-200/70 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900">{item.skill}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                  item.status === 'STRONG' ? 'bg-emerald-100 text-emerald-800' :
                  item.status === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {item.score}% · {item.status}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">{item.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
