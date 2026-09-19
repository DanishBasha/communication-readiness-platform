import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Send, 
  Search, 
  TrendingUp,
  ShieldCheck,
  Building
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-stone-900">
      
      {/* Top Banner */}
      <div className="bg-white border border-stone-200/90 rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono uppercase font-bold px-3 py-1 rounded-full bg-[#191C1A] text-white">
            Placement Cell · Super Admin
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">Institution Readiness Overview</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Centralized monitoring of 2,450 candidates across HOPE Elite, HOPE Non-Elite, 21 PEP Domains, and Department Streams.
          </p>
        </div>

        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#191C1A] hover:bg-stone-800 text-white font-bold text-xs sm:text-sm shadow-md transition transform active:scale-95"
        >
          <Send className="w-4 h-4 text-emerald-400" />
          <span>Dispatch College-Wide Mock Interview</span>
        </button>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200/90 p-6 rounded-[24px] shadow-sm">
          <span className="text-xs text-stone-500 font-medium block mb-1">Total Enrolled Students</span>
          <span className="text-3xl font-black text-stone-900 font-mono">2,450</span>
          <span className="text-[11px] text-emerald-700 font-bold block mt-2">✓ 100% Mentors Assigned</span>
        </div>

        <div className="bg-white border border-stone-200/90 p-6 rounded-[24px] shadow-sm">
          <span className="text-xs text-stone-500 font-medium block mb-1">Placement Ready (&gt;80 Score)</span>
          <span className="text-3xl font-black text-emerald-700 font-mono">1,280</span>
          <span className="text-[11px] text-stone-400 block mt-2">52.2% of university cohort</span>
        </div>

        <div className="bg-white border border-stone-200/90 p-6 rounded-[24px] shadow-sm">
          <span className="text-xs text-stone-500 font-medium block mb-1">HOPE Elite High Caliber</span>
          <span className="text-3xl font-black text-stone-900 font-mono">58 / 60</span>
          <span className="text-[11px] text-emerald-700 font-bold block mt-2">Cohort Average: 88.4%</span>
        </div>

        <div className="bg-white border border-stone-200/90 p-6 rounded-[24px] shadow-sm">
          <span className="text-xs text-stone-500 font-medium block mb-1">Active Visiting Trainers</span>
          <span className="text-3xl font-black text-amber-700 font-mono">18</span>
          <span className="text-[11px] text-stone-500 block mt-2">100-Day Semester Training</span>
        </div>
      </div>

      {/* Cohort Readiness Table */}
      <div className="bg-white border border-stone-200/90 rounded-[28px] p-6 sm:p-8 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Candidate Readiness Directory</h3>
            <p className="text-xs text-stone-500">Filter across HOPE, PEP, and Department streams.</p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input 
              type="text"
              placeholder="Search by name, roll no, domain..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-900"
            />
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-500 uppercase font-mono text-[11px] border-y border-stone-200">
              <tr>
                <th className="p-3.5 font-bold">Student</th>
                <th className="p-3.5 font-bold">Roll No</th>
                <th className="p-3.5 font-bold">Track / Domain</th>
                <th className="p-3.5 font-bold">Readiness Score</th>
                <th className="p-3.5 font-bold">Checklist</th>
                <th className="p-3.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredMentees.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50 transition">
                  <td className="p-3.5 font-bold text-stone-900">{m.name}</td>
                  <td className="p-3.5 font-mono text-stone-500">{m.rollNumber}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-mono text-[11px] font-semibold border border-stone-200">
                      {m.track.replace('_', ' ')} • {m.domain}
                    </span>
                  </td>
                  <td className="p-3.5 font-black font-mono text-stone-900">{m.score}%</td>
                  <td className="p-3.5 font-mono text-stone-500">{m.checklist}</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      m.status === 'PLACEMENT_READY' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                      m.status === 'ON_TRACK' ? 'bg-stone-100 text-stone-800 border border-stone-200' :
                      m.status === 'NEEDS_ATTENTION' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                      'bg-rose-100 text-rose-900 border border-rose-200'
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
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 w-full max-w-lg rounded-[28px] p-7 shadow-2xl relative text-stone-900">
            <h3 className="text-lg font-black text-stone-900 mb-1">Dispatch Mock Interview Assignment</h3>
            <p className="text-xs text-stone-500 mb-4">Assign practice mock tests university-wide or to specific student cohorts.</p>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="text-xs text-stone-700 font-bold block mb-1">Assignment Title</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Pre-Placement Technical & Communication Mock #3"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="text-xs text-stone-700 font-bold block mb-1">Target Cohort</label>
                <select
                  value={assignTarget}
                  onChange={(e) => setAssignTarget(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#191C1A] hover:bg-stone-800 text-white font-bold text-xs transition"
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
