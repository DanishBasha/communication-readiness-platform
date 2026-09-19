import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Briefcase, 
  Users, 
  Award, 
  Send, 
  UploadCloud, 
  Search, 
  Filter, 
  TrendingUp,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { MOCK_MENTEES_LIST } from '../../data/mockData';

export const PlacementCoordinatorPortal: React.FC = () => {
  const { assignments, createAssignment } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignTarget, setAssignTarget] = useState('All Batches (2026)');

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle) return;
    createAssignment({
      title: assignTitle,
      assignedByRole: 'PLACEMENT_COORDINATOR',
      assignedByName: 'Prof. K. Venkatesh (Placement Officer)',
      targetDomainOrTrack: assignTarget,
      dueDate: '2026-09-30',
      isMandatory: true
    });
    setAssignTitle('');
    setIsAssignModalOpen(false);
  };

  const filteredMentees = MOCK_MENTEES_LIST.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono uppercase font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
              Placement Cell · Super Admin Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Institution Readiness Overview</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Oversight of 2,450 students across HOPE Elite, HOPE Non-Elite, 21 PEP Domains, and Department Streams.
          </p>
        </div>

        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs sm:text-sm shadow-xl shadow-rose-600/25 transition"
        >
          <Send className="w-4 h-4" />
          <span>Assign College-Wide Mock Interview</span>
        </button>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Total Enrolled Students</span>
          <span className="text-3xl font-bold text-white font-mono">2,450</span>
          <span className="text-[11px] text-emerald-400 block mt-2">✓ 100% Mentors Assigned</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Placement Ready (&gt;80 Score)</span>
          <span className="text-3xl font-bold text-emerald-400 font-mono">1,280</span>
          <span className="text-[11px] text-slate-400 block mt-2">52.2% of cohort</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">HOPE Elite High Caliber</span>
          <span className="text-3xl font-bold text-purple-400 font-mono">58 / 60</span>
          <span className="text-[11px] text-purple-300 block mt-2">Avg Score: 88.4%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Active Visiting Trainers</span>
          <span className="text-3xl font-bold text-indigo-400 font-mono">18</span>
          <span className="text-[11px] text-slate-400 block mt-2">100-Day Semester Training</span>
        </div>
      </div>

      {/* Cohort Readiness Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">Candidate Readiness & Performance Directory</h3>
            <p className="text-xs text-slate-400">Search students across HOPE, PEP, and Department streams.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Search by name, roll no, domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-y border-slate-800">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Roll No</th>
                <th className="p-3">Track / Domain</th>
                <th className="p-3">Readiness Score</th>
                <th className="p-3">Checklist</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredMentees.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-semibold text-white">{m.name}</td>
                  <td className="p-3 font-mono text-slate-400">{m.rollNumber}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                      {m.track.replace('_', ' ')} • {m.domain}
                    </span>
                  </td>
                  <td className="p-3 font-bold font-mono text-white">{m.score}%</td>
                  <td className="p-3 font-mono text-slate-400">{m.checklist}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      m.status === 'PLACEMENT_READY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      m.status === 'ON_TRACK' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                      m.status === 'NEEDS_ATTENTION' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {m.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-2">Dispatch Mock Interview Assignment</h3>
            <p className="text-xs text-slate-400 mb-4">As Placement Coordinator, you can push assignments college-wide or to any cohort.</p>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Assignment Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Pre-Placement Technical & Communication Mock #3"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Target Cohort</label>
                <select
                  value={assignTarget}
                  onChange={(e) => setAssignTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="All Batches (2026)">All Batches (2,450 Students)</option>
                  <option value="HOPE Elite">HOPE Elite (Top 60 Coders)</option>
                  <option value="HOPE Non-Elite">HOPE Non-Elite</option>
                  <option value="PEP Track (All 21 Domains)">PEP Track (All 21 Domains)</option>
                  <option value="Department Stream Only">Department Stream Only</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition"
                >
                  Dispatch Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
