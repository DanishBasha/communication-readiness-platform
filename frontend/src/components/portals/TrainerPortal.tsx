import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Send, 
  Activity, 
  AlertCircle,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-stone-900">
      
      {/* Header */}
      <div className="bg-white border border-stone-200/90 rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono uppercase font-bold px-3 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
            Visiting Trainer Workspace · Active Tenure (Day 6 of 15)
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">Domain Speech & Communication Analytics</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Assigned Domain: <strong>Cloud Computing & DevOps</strong> (PEP Track). Use acoustic metrics to guide daily workshops.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#191C1A] hover:bg-stone-800 text-white font-bold text-xs sm:text-sm shadow-md transition transform active:scale-95"
        >
          <Send className="w-4 h-4 text-emerald-400" />
          <span>Assign Domain Practice Drill</span>
        </button>
      </div>

      {/* Speech Metrics Breakdown for Domain Cohort */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        <div className="bg-white border border-stone-200/90 p-7 rounded-[28px] shadow-sm">
          <div className="flex items-center justify-between mb-2 text-xs text-stone-500 font-bold">
            <span>Average Speaking Pace</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-stone-900 font-mono">114</span>
            <span className="text-xs text-stone-500">WPM</span>
          </div>
          <p className="text-xs text-amber-700 mt-3 font-medium">
            Cohort pace is slightly hesitant. Recommend 2-minute impromptu speaking warm-ups before lecture.
          </p>
        </div>

        <div className="bg-white border border-stone-200/90 p-7 rounded-[28px] shadow-sm">
          <div className="flex items-center justify-between mb-2 text-xs text-stone-500 font-bold">
            <span>Common Filler Words</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-amber-700 font-mono">16.2</span>
            <span className="text-xs text-stone-500">avg per session</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">'uh' (38%)</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">'like' (24%)</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-mono">'you know' (18%)</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200/90 p-7 rounded-[28px] shadow-sm">
          <div className="flex items-center justify-between mb-2 text-xs text-stone-500 font-bold">
            <span>Technical Articulation</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-emerald-700 font-mono">76.8%</span>
            <span className="text-xs text-stone-500">domain mastery</span>
          </div>
          <p className="text-xs text-stone-600 mt-3 font-medium">
            Strong on Docker & CI/CD; needs reinforcement in Kubernetes ingress controllers & Prometheus.
          </p>
        </div>

      </div>

      {/* Drill Dispatcher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 w-full max-w-md rounded-[28px] p-7 shadow-2xl relative text-stone-900">
            <h3 className="text-lg font-black text-stone-900 mb-1">Assign Domain Practice Mock</h3>
            <p className="text-xs text-stone-500 mb-4">Push a targeted interview session to Cloud Computing & DevOps students.</p>

            <form onSubmit={handleCreateDrill} className="space-y-4">
              <div>
                <label className="text-xs text-stone-700 font-bold block mb-1">Drill Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kubernetes & AWS Networking Rapid-Fire Drill"
                  value={drillTitle}
                  onChange={(e) => setDrillTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#191C1A] hover:bg-stone-800 text-white font-bold text-xs transition"
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
