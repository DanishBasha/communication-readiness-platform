import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Activity, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  Layers, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  FileText,
  Mic,
  Headphones,
  RefreshCw
} from 'lucide-react';
import { DynamicProgram } from '../../types';

interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: 'DRILL_DISPATCHED' | 'INTERVIEW_COMPLETED' | 'LISTENING_COMPLETED' | 'PROCTOR_VERIFIED' | 'CRITERIA_VERIFIED' | 'ADMIN_ASSIGNED' | 'FLAG_RAISED';
  actor: string;
  actorRole: string;
  target: string;
  status: 'SUCCESS' | 'WARNING' | 'INFO';
  details: string;
  ipAddress?: string;
}

export const ProgramActivityLogsPage: React.FC = () => {
  const { selectedProgram, setActiveView, currentUser } = useApp();

  const program: DynamicProgram = selectedProgram || {
    id: 'prog-fallback',
    collegeId: currentUser?.collegeId || 'col-1',
    name: 'Advanced Technical Readiness Track',
    code: 'ATRT',
    hasSubPrograms: false,
    subPrograms: [],
    assignedAdminName: 'Prof. Swaminathan K',
    adminPermissions: [],
    createdAt: new Date().toISOString()
  };

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Realistic mock audit log events tailored to this specific program
  const [logs] = useState<ActivityLogEntry[]>([
    {
      id: 'log-101',
      timestamp: '2026-09-29 14:15:20',
      action: 'DRILL_DISPATCHED',
      actor: currentUser?.name || 'Super Administrator',
      actorRole: currentUser?.role || 'SUPER_ADMIN',
      target: 'Full Stack & Web Systems Mock Interview',
      status: 'SUCCESS',
      details: `Scheduled drill dispatched to ${program.name} students with 09:00 - 18:00 timer window.`,
      ipAddress: '192.168.1.104'
    },
    {
      id: 'log-102',
      timestamp: '2026-09-29 13:50:11',
      action: 'INTERVIEW_COMPLETED',
      actor: 'Harish K (21CS1084)',
      actorRole: 'STUDENT',
      target: 'Voice AI Mock Interview Round #3',
      status: 'SUCCESS',
      details: 'Student scored 88% overall. 5 verbal turns completed. Proctoring checks clean.',
      ipAddress: '192.168.1.189'
    },
    {
      id: 'log-103',
      timestamp: '2026-09-29 13:22:45',
      action: 'LISTENING_COMPLETED',
      actor: 'Sneha Patel (21IT1029)',
      actorRole: 'STUDENT',
      target: 'Fintech Payments Microservices Audio Briefing',
      status: 'SUCCESS',
      details: 'Listening comprehension: 92% retention accuracy with zero visual subtitle prompts.',
      ipAddress: '192.168.1.205'
    },
    {
      id: 'log-104',
      timestamp: '2026-09-29 12:45:00',
      action: 'PROCTOR_VERIFIED',
      actor: 'AI Proctor Engine v2.4',
      actorRole: 'SYSTEM_SERVICE',
      target: 'Candidate Session Validation',
      status: 'SUCCESS',
      details: 'Analyzed voice consistency and tab-focus checks across 24 concurrent submissions.',
      ipAddress: 'internal-daemon'
    },
    {
      id: 'log-105',
      timestamp: '2026-09-29 11:30:18',
      action: 'CRITERIA_VERIFIED',
      actor: program.assignedAdminName || 'Lead Mentor',
      actorRole: 'PROGRAM_ADMIN',
      target: 'Placement Readiness Checklist',
      status: 'INFO',
      details: 'Verified LinkedIn technical portfolio and GitHub repositories for 14 candidates in batch.',
      ipAddress: '192.168.1.112'
    },
    {
      id: 'log-106',
      timestamp: '2026-09-29 10:14:02',
      action: 'FLAG_RAISED',
      actor: 'AI Proctor Engine v2.4',
      actorRole: 'SYSTEM_SERVICE',
      target: 'Candidate Session 21CS1092',
      status: 'WARNING',
      details: 'Excessive tab switches (3 detected) during strict technical question turn. Turn flagged for mentor review.',
      ipAddress: '192.168.1.215'
    },
    {
      id: 'log-107',
      timestamp: '2026-09-29 09:00:00',
      action: 'ADMIN_ASSIGNED',
      actor: 'System Initialization',
      actorRole: 'SYSTEM',
      target: `${program.name} Governance Delegation`,
      status: 'INFO',
      details: `Lead administrator ${program.assignedAdminName || 'Swaminathan K'} delegated with student activity permissions.`,
      ipAddress: '127.0.0.1'
    }
  ]);

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'ALL' && log.action !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchActor = log.actor.toLowerCase().includes(q);
      const matchTarget = log.target.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      if (!matchActor && !matchTarget && !matchDetails && !matchAction) return false;
    }
    return true;
  });

  const exportLogsAsCSV = () => {
    const headers = ['Timestamp', 'Action', 'Actor', 'Role', 'Target', 'Status', 'Details', 'IP'];
    const rows = filteredLogs.map(l => [
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.actor}"`,
      `"${l.actorRole}"`,
      `"${l.target}"`,
      `"${l.status}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.ipAddress || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${program.code}_Activity_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setActiveView('PROGRAM_DETAIL')}
            className="p-2 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-xl transition-colors cursor-pointer shadow-2xs flex items-center space-x-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {program.name}</span>
          </button>
          <div className="h-4 w-[1px] bg-neutral-300" />
          <div className="flex items-center space-x-2 text-xs font-medium text-neutral-500">
            <span>{program.name}</span>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">Activity Logs</span>
          </div>
        </div>

        {/* Export / Refresh Action */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={exportLogsAsCSV}
            className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 rounded-xl text-xs font-semibold flex items-center space-x-2 cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4 text-neutral-500" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('DASHBOARD')}
            className="px-3.5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center space-x-2 cursor-pointer shadow-xs"
          >
            <span>Exit to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-neutral-900">Program Activity &amp; Audit Logs</h1>
                <span className="px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-800 font-mono text-xs font-bold border border-neutral-200">
                  {program.code}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Audit log recording assessment dispatches, turn completions, AI evaluations, and proctoring activity
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-2 text-xs font-mono text-neutral-600">
          <Clock className="w-4 h-4 text-neutral-400" />
          <span>Active Log Retention: 90 Days</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, candidate name, or event details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'DRILL_DISPATCHED', label: 'Dispatches' },
            { id: 'INTERVIEW_COMPLETED', label: 'Interviews' },
            { id: 'LISTENING_COMPLETED', label: 'Listening' },
            { id: 'PROCTOR_VERIFIED', label: 'Proctoring' },
            { id: 'FLAG_RAISED', label: 'Flagged' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                filterType === f.id
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                  : 'bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table Matching CRP Interface */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-5">Timestamp</th>
                <th className="py-3 px-4">Event Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Subject</th>
                <th className="py-3 px-4">Details &amp; Activity</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-neutral-300 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-neutral-600">No activity logs match your filter</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">Try clearing your search term or switching to All Events.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  return (
                    <tr key={log.id} className="hover:bg-neutral-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 sm:px-5 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                          log.action === 'DRILL_DISPATCHED'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : log.action === 'INTERVIEW_COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : log.action === 'LISTENING_COMPLETED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : log.action === 'FLAG_RAISED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-900">{log.actor}</div>
                        <div className="text-[10px] font-mono text-neutral-400">{log.actorRole}</div>
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4 text-neutral-700 font-medium">
                        {log.target}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-neutral-600 max-w-md">
                        <p className="text-xs leading-snug">{log.details}</p>
                        {log.ipAddress && (
                          <span className="text-[10px] font-mono text-neutral-400 mt-0.5 block">IP: {log.ipAddress}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'WARNING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                        }`}>
                          {log.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {log.status === 'WARNING' && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span>{log.status}</span>
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
