import React, { useState } from 'react';
import { MOCK_MENTEES_LIST } from '../../data/mockData';
import { 
  GraduationCap, 
  Search, 
  ShieldCheck 
} from 'lucide-react';

export const FacultyMentorPortal: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">Dr. S. Ranganathan</h1>
              <p className="text-xs text-neutral-500">Associate Professor, CSE · Assigned Mentee Roster (25 Students)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-700">
            <span className="font-semibold text-neutral-900">25</span> Mentees
          </div>
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-medium">
            <span className="font-bold">18</span> Fully Verified
          </div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:px-6 border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search mentee by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <span className="text-xs text-neutral-500">
            Mentors sign off on LeetCode count & mock readiness
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 text-neutral-500 font-mono text-[11px] border-b border-neutral-200/70">
              <tr>
                <th className="py-3 px-6 font-medium">MENTEE</th>
                <th className="py-3 px-6 font-medium">COHORT</th>
                <th className="py-3 px-6 font-medium">DOMAIN</th>
                <th className="py-3 px-6 font-medium">MOCK SCORE</th>
                <th className="py-3 px-6 font-medium">CHECKLIST</th>
                <th className="py-3 px-6 font-medium text-right">MENTOR ACTION</th>
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
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
                  <td className="py-3.5 px-6 font-mono text-neutral-700">
                    {s.checklist} Verified
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <button className="bg-neutral-900 hover:bg-black text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors shadow-2xs">
                      Sign Off Criteria
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
