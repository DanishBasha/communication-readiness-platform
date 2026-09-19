import React, { useState } from 'react';
import { MOCK_MENTEES_LIST } from '../../data/mockData';
import { 
  Users, 
  TrendingUp, 
  Award, 
  Layers, 
  Search, 
  Download, 
  ArrowUpRight,
  ShieldCheck,
  Building2
} from 'lucide-react';

export const PlacementCoordinatorPortal: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCohort, setSelectedCohort] = useState<string>('ALL');

  const totalCandidates = 2840;
  const hopeEliteCount = 58;
  const pepDomainsCount = 21;
  const placementReadyRate = 68.4;

  const cohorts = [
    { id: 'ALL', label: 'All Candidates', count: 2840 },
    { id: 'HOPE_ELITE', label: '★ HOPE Elite', count: 58 },
    { id: 'HOPE_NON_ELITE', label: 'HOPE General', count: 420 },
    { id: 'PEP', label: 'PEP 21 Domains', count: 1820 },
    { id: 'DEPARTMENT', label: 'Department Stream', count: 542 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Institutional Placement Intelligence</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-900 text-white rounded font-mono">SUPER ADMIN</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Macro college-wide placement readiness, HOPE elite tracking, and domain benchmark oversight.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button className="flex items-center space-x-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors shadow-2xs">
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Export CSV</span>
          </button>
          <button className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-medium transition-colors shadow-xs">
            <Building2 className="w-3.5 h-3.5" />
            <span>Generate Senate Report</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1.5">
            <span className="font-medium">Total Candidates</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{totalCandidates.toLocaleString()}</div>
          <p className="text-[11px] text-neutral-400 mt-1">Registered for 2026 Season</p>
        </div>

        <div className="p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1.5">
            <span className="font-medium">HOPE Elite Pool</span>
            <Award className="w-4 h-4 text-neutral-900" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{hopeEliteCount}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">98.2% readiness target</p>
        </div>

        <div className="p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1.5">
            <span className="font-medium">PEP Active Domains</span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{pepDomainsCount} Tracks</div>
          <p className="text-[11px] text-neutral-400 mt-1">Full-stack, Cloud, AI/ML, Embedded</p>
        </div>

        <div className="p-5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs mb-1.5">
            <span className="font-medium">Eligibility Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{placementReadyRate}%</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">+4.2% from prior cohort</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3">
        {cohorts.map((cohort) => (
          <button
            key={cohort.id}
            onClick={() => setSelectedCohort(cohort.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedCohort === cohort.id 
                ? 'bg-neutral-900 text-white shadow-xs' 
                : 'bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600'
            }`}
          >
            {cohort.label} ({cohort.count})
          </button>
        ))}
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:px-6 border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Filter candidate by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <span className="text-xs text-neutral-500">
            Showing active mock interview evaluations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
              <tr>
                <th className="py-3 px-6 font-medium">CANDIDATE</th>
                <th className="py-3 px-6 font-medium">COHORT TRACK</th>
                <th className="py-3 px-6 font-medium">DOMAIN</th>
                <th className="py-3 px-6 font-medium">MOCK SCORE</th>
                <th className="py-3 px-6 font-medium">STATUS</th>
                <th className="py-3 px-6 font-medium text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {MOCK_MENTEES_LIST.map((s) => (
                <tr key={s.id} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3.5 px-6 font-medium text-neutral-900">
                    <div>{s.name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">{s.rollNumber}</div>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                      {s.track}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-neutral-600">
                    {s.domain}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-neutral-900 text-white">
                      {s.score}/100
                    </span>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button className="text-neutral-500 hover:text-neutral-900 font-medium inline-flex items-center">
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
