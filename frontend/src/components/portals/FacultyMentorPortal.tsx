import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Award, 
  TrendingUp,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';
import { MOCK_MENTEES_LIST } from '../../data/mockData';

export const FacultyMentorPortal: React.FC = () => {
  const { student, verifyCriteriaTask } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Mentor Header */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono uppercase font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            Faculty Mentor Portal (Under Placement Coordinator)
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Assigned Mentees Progress & Sign-off</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Supervising 25 assigned students across HOPE Elite, PEP, and Department streams. Verify placement criteria tasks below.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs text-slate-300">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Assigned Mentees: <strong className="text-white font-mono">25 Students</strong></span>
        </div>
      </div>

      {/* Mentees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Mentees Roster</h3>
            <p className="text-xs text-slate-400">Click to view diagnostic scorecards and sign off on verified criteria tasks.</p>
          </div>
          <span className="text-xs font-mono text-emerald-400">Academic Term 2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-y border-slate-800">
              <tr>
                <th className="p-3">Student Name</th>
                <th className="p-3">Roll No</th>
                <th className="p-3">Track</th>
                <th className="p-3">Domain</th>
                <th className="p-3">Mock Score</th>
                <th className="p-3">Checklist Verified</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {MOCK_MENTEES_LIST.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-semibold text-white">{m.name}</td>
                  <td className="p-3 font-mono text-slate-400">{m.rollNumber}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                      {m.track.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{m.domain}</td>
                  <td className="p-3 font-bold font-mono text-emerald-400">{m.score}%</td>
                  <td className="p-3 font-mono text-slate-400">{m.checklist}</td>
                  <td className="p-3 text-right">
                    <button className="text-xs px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
                      Review Tasks
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Active Mentee Criteria Verification Card (Aravind Kumar) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Criteria Task Verification: {student.name} ({student.rollNumber})</h3>
            <p className="text-xs text-slate-400">Review student-completed milestones and stamp verified sign-offs.</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            HOPE Elite Mentee
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {student.criteriaTasks.map((t) => (
            <div key={t.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold text-white">{t.title}</h4>
                  {t.isCompleted ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">Student Marked Done</span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">Pending Student</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{t.description}</p>
              </div>

              {t.verifiedByMentor ? (
                <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4" /> Verified
                </span>
              ) : (
                <button
                  disabled={!t.isCompleted}
                  onClick={() => verifyCriteriaTask(t.id)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
                >
                  Verify & Sign-off
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
