import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Eye, 
  Mic, 
  Headphones, 
  Sparkles, 
  Download,
  Filter,
  LayoutDashboard
} from 'lucide-react';
import { StudentHistoryModal } from '../common/StudentHistoryModal';

export const AssessmentSubmissionsPage: React.FC = () => {
  const { 
    assignments, 
    selectedAssessmentId, 
    setActiveView, 
    student: loggedInStudent,
    openStudentDashboard
  } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Return to previous view via back gesture
  useBackHandler(Boolean(selectedStudentId), () => setSelectedStudentId(null));
  useBackHandler(!selectedStudentId, () => setActiveView('ASSESSMENT_ACTIVITY'));

  // Find the selected assignment
  const currentAssignment = (assignments || []).find((a) => a.id === selectedAssessmentId) || assignments?.[0];

  const submissions = currentAssignment?.submissions || [];

  // Filter submissions by search query & department
  const filteredSubmissions = submissions.filter((sub) => {
    if (departmentFilter !== 'ALL' && sub.department && sub.department !== departmentFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = sub.studentName.toLowerCase().includes(q);
      const matchRoll = sub.studentRollNumber.toLowerCase().includes(q);
      const matchDept = (sub.department || '').toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchDept) return false;
    }
    return true;
  });

  // Calculate statistics
  const totalSubmissions = submissions.length;
  const avgScore = totalSubmissions > 0
    ? Math.round(submissions.reduce((a, s) => a + s.score, 0) / totalSubmissions)
    : 0;
  const topScore = totalSubmissions > 0
    ? Math.max(...submissions.map((s) => s.score))
    : 0;
  const placementReadyCount = submissions.filter((s) => s.score >= 80).length;
  const passRate = totalSubmissions > 0 ? Math.round((placementReadyCount / totalSubmissions) * 100) : 0;

  // Unique departments for filter
  const departmentsList = Array.from(new Set(submissions.map((s) => s.department).filter(Boolean)));

  const handleOpenStudentProfile = (sub: any) => {
    setSelectedStudentId(sub.studentId);
  };

  const handleExportCSV = () => {
    const headers = ['Roll Number', 'Student Name', 'Department', 'Score', 'Technical Score', 'Communication Score', 'Submitted At', 'Recommendation'];
    const rows = filteredSubmissions.map(s => [
      s.studentRollNumber,
      `"${s.studentName}"`,
      `"${s.department || 'General'}"`,
      s.score,
      s.technicalScore || s.score,
      s.communicationScore || s.score,
      s.submittedAt,
      s.recommendation || (s.score >= 80 ? 'PLACEMENT_READY' : 'ON_TRACK')
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentAssignment?.title || 'Assessment'}_Submissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveView('ASSESSMENT_ACTIVITY')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Assessment History</span>
        </button>

        <span className="text-xs font-mono text-neutral-400">
          Dedicated Submission Turnout Report
        </span>
      </div>

      {/* Assignment Header Card */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  currentAssignment?.sessionType === 'MOCK_INTERVIEW'
                    ? 'bg-neutral-900 text-emerald-400'
                    : 'bg-purple-950 text-purple-300'
                }`}
              >
                {currentAssignment?.sessionType === 'MOCK_INTERVIEW' ? <Mic className="w-3 h-3" /> : <Headphones className="w-3 h-3" />}
                <span>{currentAssignment?.sessionType.replace('_', ' ')}</span>
              </span>
              <span className="text-xs font-mono text-neutral-400">
                Due: {currentAssignment?.dueDate}
              </span>
              {currentAssignment?.difficulty && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-bold border border-neutral-200">
                  {currentAssignment.difficulty}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
              {currentAssignment?.title || 'Assessment Turnout & Scores'}
            </h1>

            <p className="text-xs text-neutral-500 max-w-2xl">
              Target Audience: <strong className="text-neutral-800">{currentAssignment?.targetDomainOrTrack || 'All Batches'}</strong> · Assigned by {currentAssignment?.assignedByName} ({currentAssignment?.assignedByRole})
            </p>
          </div>

          {/* Export Action */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={totalSubmissions === 0}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs flex items-center space-x-2 self-start disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Scores (CSV)</span>
          </button>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl space-y-1">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
              Total Submissions
            </span>
            <div className="text-2xl font-bold font-mono text-neutral-900">{totalSubmissions}</div>
            <span className="text-[10px] text-neutral-500 font-mono">Turnouts recorded</span>
          </div>

          <div className="p-4 bg-blue-50/60 border border-blue-200/70 rounded-2xl space-y-1">
            <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider block">
              Average Score
            </span>
            <div className="text-2xl font-bold font-mono text-blue-950">{avgScore}%</div>
            <span className="text-[10px] text-blue-600 font-mono">Batch average</span>
          </div>

          <div className="p-4 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl space-y-1">
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Highest Score
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-950">{topScore}%</div>
            <span className="text-[10px] text-emerald-600 font-mono">Top performer</span>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl space-y-1">
            <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider block">
              Placement Bar (80%+)
            </span>
            <div className="text-2xl font-bold font-mono text-amber-950">{passRate}%</div>
            <span className="text-[10px] text-amber-700 font-mono">{placementReadyCount} of {totalSubmissions} ready</span>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="pt-4 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, roll number, or department..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 shadow-2xs"
            />
          </div>

          {departmentsList.length > 0 && (
            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs text-neutral-800 font-medium focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                {departmentsList.map((d: any) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Submissions & Scores Table */}
      <div className="bg-white border border-neutral-200/90 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[10px] font-mono">
              <tr>
                <th className="px-5 py-3.5">Candidate Details</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Submitted On</th>
                <th className="px-4 py-3.5">Technical Score</th>
                <th className="px-4 py-3.5">Communication</th>
                <th className="px-4 py-3.5">Overall Score</th>
                <th className="px-4 py-3.5">Evaluation Status</th>
                <th className="px-5 py-3.5 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-neutral-500">
                    <Users className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="font-semibold text-neutral-700">No Candidate Submissions Found</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      No candidates have submitted for this session matching the current filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, idx) => {
                  const techScore = sub.technicalScore || sub.score;
                  const commScore = sub.communicationScore || sub.score;
                  const isPass = sub.score >= 80;

                  return (
                    <tr
                      key={sub.studentId || idx}
                      onClick={() => handleOpenStudentProfile(sub)}
                      className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {sub.studentName.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 group-hover:text-blue-600 transition-colors">
                              {sub.studentName}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              {sub.studentRollNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-neutral-700 font-medium">
                        {sub.department || 'Computer Science & Engineering'}
                      </td>

                      <td className="px-4 py-4 text-neutral-500 font-mono text-[11px]">
                        {sub.submittedAt ? sub.submittedAt.replace('T', ' ').slice(0, 16) : 'Recently'}
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-mono font-bold text-neutral-900">
                          {techScore}%
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-mono font-bold text-neutral-900">
                          {commScore}%
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span
                            className={`font-mono font-bold text-sm ${
                              sub.status === 'DISQUALIFIED' || sub.isDisqualified
                                ? 'text-rose-600'
                                : sub.score >= 85
                                ? 'text-emerald-700'
                                : sub.score >= 70
                                ? 'text-blue-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {sub.score}%
                          </span>
                          {(sub.status === 'DISQUALIFIED' || sub.isDisqualified) && (
                            <span className="text-[10px] text-rose-500 font-mono font-bold">Proctored Exit</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {(sub.status === 'DISQUALIFIED' || sub.isDisqualified) ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-300">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>DISQUALIFIED (4 TAB SWITCHES)</span>
                          </span>
                        ) : isPass ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>PLACEMENT READY</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>ON TRACK</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentId(sub.studentId)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1"
                            title="Inspect test results and transcripts modal"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Activity</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openStudentDashboard(sub.studentId)}
                            className="px-2.5 py-1 text-xs font-semibold text-neutral-800 hover:text-black bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1"
                            title="Open student full interactive Dashboard"
                          >
                            <LayoutDashboard className="w-3.5 h-3.5 text-neutral-600" />
                            <span>Dashboard</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Modal on Click */}
      {selectedStudentId && (
        <StudentHistoryModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
};
