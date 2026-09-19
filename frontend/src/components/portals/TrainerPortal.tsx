import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Mic2, 
  Users, 
  Send, 
  TrendingUp, 
  Activity, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const TrainerPortal: React.FC = () => {
  const { createAssignment } = useApp();
  const [drillTitle, setDrillTitle] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateDrill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drillTitle) return;
    createAssignment({
      title: drillTitle,
      assignedByRole: 'TRAINER',
      assignedByName: 'Vikramaditya Sharma (Visiting Trainer)',
      targetDomainOrTrack: 'Cloud Computing & DevOps',
      dueDate: '2026-09-24',
      isMandatory: false
    });
    setDrillTitle('');
    setIsModalOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono uppercase font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
            Visiting Trainer Workspace · Active Tenure (Day 6 of 15)
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Domain Speech & Communication Analytics</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Assigned Domain: <strong>Cloud Computing & DevOps</strong> (PEP Track). Use acoustic metrics to guide daily workshops.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-purple-600/25 transition"
        >
          <Send className="w-4 h-4" />
          <span>Assign Domain Practice Drill</span>
        </button>
      </div>

      {/* Speech Metrics Breakdown for Domain Cohort */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-2 text-xs text-slate-400">
            <span>Average Speaking Pace</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-white font-mono">114</span>
            <span className="text-xs text-slate-500">WPM</span>
          </div>
          <p className="text-xs text-amber-400 mt-2">
            Cohort trend is slightly hesitant. Recommend 2-minute impromptu speaking warm-ups before lecture.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-2 text-xs text-slate-400">
            <span>Common Filler Words</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-amber-400 font-mono">16.2</span>
            <span className="text-xs text-slate-500">avg per session</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-2.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">'uh' (38%)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">'like' (24%)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">'you know' (18%)</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-2 text-xs text-slate-400">
            <span>Technical Articulation</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-emerald-400 font-mono">76.8%</span>
            <span className="text-xs text-slate-500">domain mastery</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Strong on Docker & CI/CD; needs reinforcement in Kubernetes ingress controllers & Prometheus.
          </p>
        </div>

      </div>

      {/* Drill Dispatcher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1">Assign Domain Practice Mock</h3>
            <p className="text-xs text-slate-400 mb-4">Push a targeted interview session to Cloud Computing & DevOps students.</p>

            <form onSubmit={handleCreateDrill} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Drill Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kubernetes & AWS Networking Rapid-Fire Drill"
                  value={drillTitle}
                  onChange={(e) => setDrillTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition"
                >
                  Publish Drill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
