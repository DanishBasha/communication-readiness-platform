import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { 
  ArrowLeft, 
  Calendar, 
  Search, 
  Users, 
  Mic, 
  Headphones, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Filter
} from 'lucide-react';
import { isAssignmentElapsed } from '../common/AssessmentMonitoringWidget';

export const AssessmentActivityPage: React.FC = () => {
  const { assignments, currentUser, setActiveView, viewAssessmentSubmissions } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MOCK_INTERVIEW' | 'LISTENING_COMPREHENSION'>('ALL');

  // Handle back gesture & browser popstate to return to dashboard
  useBackHandler(true, () => setActiveView('DASHBOARD'));

  const collegeId = currentUser?.collegeId || 'col-1';
  const collegeName = currentUser?.collegeName || "St. Joseph's College of Engineering";

  // Filter assignments for this college
  const collegeAssignments = (assignments || []).filter(
    (a) => !a.collegeId || a.collegeId === collegeId
  );

  const filteredSessions = collegeAssignments.filter((asg) => {
    if (filterType !== 'ALL' && asg.sessionType !== filterType && asg.sessionType !== 'BOTH') {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = asg.title.toLowerCase().includes(q);
      const matchAudience = (asg.targetDomainOrTrack || '').toLowerCase().includes(q);
      const matchOfficer = asg.assignedByName.toLowerCase().includes(q);
      if (!matchTitle && !matchAudience && !matchOfficer) return false;
    }
    return true;
  });

  const totalSessions = collegeAssignments.length;
  const totalSubmissions = collegeAssignments.reduce(
    (acc, a) => acc + (a.submissions?.length || 0),
    0
  );
  const activeSessionsCount = collegeAssignments.filter((a) => !isAssignmentElapsed(a)).length;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveView('DASHBOARD')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>

        <span className="text-xs font-mono text-neutral-400">
          College Activity Stream · {collegeName}
        </span>
      </div>

      {/* Hero Banner */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-900 text-white">
                AUDIT ARCHIVE
              </span>
              <span className="text-xs font-semibold text-neutral-500">
                {collegeName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
              Conducted Assessment &amp; Interview Sessions
            </h1>
          </div>

          {/* Quick Metrics Badge Group */}
          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-center min-w-[90px]">
              <div className="text-xl font-bold font-mono text-neutral-900">{totalSessions}</div>
              <div className="text-[10px] text-neutral-500 font-medium">All Sessions</div>
            </div>
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-center min-w-[90px]">
              <div className="text-xl font-bold font-mono text-blue-900">{totalSubmissions}</div>
              <div className="text-[10px] text-blue-700 font-medium">Total Turns</div>
            </div>
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl text-center min-w-[90px]">
              <div className="text-xl font-bold font-mono text-emerald-800">{activeSessionsCount}</div>
              <div className="text-[10px] text-emerald-700 font-medium">Live Active</div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by assessment title, target program, or assigner..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 shadow-2xs"
            />
          </div>

          <div className="inline-flex items-center bg-neutral-100 p-0.5 rounded-xl border border-neutral-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'ALL' ? 'bg-neutral-900 text-white shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Sessions
            </button>
            <button
              type="button"
              onClick={() => setFilterType('MOCK_INTERVIEW')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                filterType === 'MOCK_INTERVIEW' ? 'bg-neutral-900 text-white shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>Interviews</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('LISTENING_COMPREHENSION')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                filterType === 'LISTENING_COMPREHENSION' ? 'bg-neutral-900 text-white shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Headphones className="w-3 h-3" />
              <span>Listening</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px] font-mono">
              <tr>
                <th className="px-5 py-3.5">Session / Drill Title</th>
                <th className="px-4 py-3.5">Target Audience</th>
                <th className="px-4 py-3.5">Allocated On</th>
                <th className="px-4 py-3.5">Due Window</th>
                <th className="px-4 py-3.5">Turnout &amp; Submissions</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500">
                    No sessions match the current search filter.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((asg) => {
                  const elapsed = isAssignmentElapsed(asg);
                  const submissionCount = asg.submissions?.length || 0;
                  const avgScore = submissionCount > 0
                    ? Math.round(asg.submissions!.reduce((a, s) => a + s.score, 0) / submissionCount)
                    : null;

                  return (
                    <tr
                      key={asg.id}
                      onClick={() => viewAssessmentSubmissions(asg.id)}
                      className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              asg.sessionType === 'MOCK_INTERVIEW'
                                ? 'bg-neutral-900 text-emerald-400'
                                : asg.sessionType === 'LISTENING_COMPREHENSION'
                                ? 'bg-purple-950 text-purple-300'
                                : 'bg-neutral-900 text-amber-300'
                            }`}
                          >
                            {asg.sessionType === 'MOCK_INTERVIEW' ? (
                              <Mic className="w-4 h-4" />
                            ) : asg.sessionType === 'LISTENING_COMPREHENSION' ? (
                              <Headphones className="w-4 h-4" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                              {asg.title}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              By {asg.assignedByName} ({asg.assignedByRole})
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-neutral-700 font-medium">
                        <span className="line-clamp-1">{asg.targetDomainOrTrack || 'All Batches'}</span>
                      </td>

                      <td className="px-4 py-4 text-neutral-500 font-mono text-[11px]">
                        {asg.createdAt ? asg.createdAt.split('T')[0] : 'N/A'}
                      </td>

                      <td className="px-4 py-4 text-neutral-700 font-mono text-[11px]">
                        <div>{asg.dueDate}</div>
                        {asg.startTime && asg.endTime && (
                          <div className="text-[10px] text-neutral-400">{asg.startTime} - {asg.endTime}</div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-neutral-900 text-xs">
                            {submissionCount}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-medium">
                            {submissionCount === 1 ? 'submission' : 'submissions'}
                          </span>
                          {avgScore !== null && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              avg {avgScore}%
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {elapsed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Closed / Elapsed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                            Live Active
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 group-hover:text-blue-800">
                          <span>Inspect Scores</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
