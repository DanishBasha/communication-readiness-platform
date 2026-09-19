import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  CheckCircle2, 
  ShieldCheck
} from 'lucide-react';
import { MOCK_MENTEES_LIST } from '../../data/mockData';

export const FacultyMentorPortal: React.FC = () => {
  const { student, verifyCriteriaTask } = useApp();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-stone-900">
      
      {/* Mentor Header */}
      <div className="bg-white border border-stone-200/90 rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono uppercase font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
            Faculty Mentor Portal (Under Placement Coordinator)
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">Assigned Mentees Progress & Sign-off</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Supervising 25 assigned students across HOPE Elite, PEP, and Department streams. Verify placement criteria tasks below.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200 text-xs text-stone-700">
          <Users className="w-5 h-5 text-emerald-700" />
          <span>Assigned Mentees: <strong className="text-stone-900 font-mono text-sm">25 Students</strong></span>
        </div>
      </div>

      {/* Mentees Table */}
      <div className="bg-white border border-stone-200/90 rounded-[28px] p-7 sm:p-8 shadow-sm space-y-4">
        
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Mentees Roster</h3>
            <p className="text-xs text-stone-500">Click to review diagnostic scores and stamp verified checklist milestones.</p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Term 2026 Active
          </span>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-500 uppercase font-mono text-[11px] border-y border-stone-200">
              <tr>
                <th className="p-3.5 font-bold">Student Name</th>
                <th className="p-3.5 font-bold">Roll No</th>
                <th className="p-3.5 font-bold">Track</th>
                <th className="p-3.5 font-bold">Domain</th>
                <th className="p-3.5 font-bold">Mock Score</th>
                <th className="p-3.5 font-bold">Checklist</th>
                <th className="p-3.5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {MOCK_MENTEES_LIST.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50 transition">
                  <td className="p-3.5 font-bold text-stone-900">{m.name}</td>
                  <td className="p-3.5 font-mono text-stone-500">{m.rollNumber}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-800 font-mono text-[11px] font-semibold border border-stone-200">
                      {m.track.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-stone-600 font-medium">{m.domain}</td>
                  <td className="p-3.5 font-black font-mono text-emerald-700">{m.score}%</td>
                  <td className="p-3.5 font-mono text-stone-500">{m.checklist}</td>
                  <td className="p-3.5 text-right">
                    <button className="text-xs font-bold px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition">
                      Review Tasks
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Active Mentee Criteria Verification Card */}
      <div className="bg-white border border-stone-200/90 rounded-[28px] p-7 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Task Verification: {student.name} ({student.rollNumber})</h3>
            <p className="text-xs text-stone-500">Sign off on completed placement requirements.</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            HOPE Elite Mentee
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {student.criteriaTasks.map((t) => (
            <div key={t.id} className="p-5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-stone-900">{t.title}</h4>
                  {t.isCompleted ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">Student Completed</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-mono">Pending Student</span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">{t.description}</p>
              </div>

              {t.verifiedByMentor ? (
                <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Verified
                </span>
              ) : (
                <button
                  disabled={!t.isCompleted}
                  onClick={() => verifyCriteriaTask(t.id)}
                  className="px-5 py-2 rounded-xl bg-[#191C1A] hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-bold shadow-sm transition"
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
