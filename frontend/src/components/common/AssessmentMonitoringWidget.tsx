import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { InterviewAssignment } from '../../types';
import { MOCK_DYNAMIC_DEPARTMENTS, MOCK_DYNAMIC_PROGRAMS } from '../../data/mockData';
import { 
  Activity, 
  Mic, 
  Headphones, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Users, 
  Trash2, 
  ArrowRight, 
  AlertCircle,
  FileCheck2,
  Calendar,
  Layers,
  Building2,
  Globe,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';

export interface AssessmentMonitoringWidgetProps {
  collegeId?: string;
  className?: string;
  programName?: string;
  department?: string;
  hideScopeSelector?: boolean;
  titlePrefix?: string;
}

export const isAssignmentElapsed = (asg: InterviewAssignment): boolean => {
  if (!asg.dueDate) return false;
  try {
    const now = new Date();
    const [year, month, day] = asg.dueDate.split('-').map(Number);
    if (asg.endTime) {
      const [hours, minutes] = asg.endTime.split(':').map(Number);
      const deadline = new Date(year, month - 1, day, hours || 23, minutes || 59, 59);
      return now.getTime() > deadline.getTime();
    } else {
      const deadline = new Date(year, month - 1, day, 23, 59, 59);
      return now.getTime() > deadline.getTime();
    }
  } catch {
    return false;
  }
};

export const isSessionCollegeWide = (asg: InterviewAssignment): boolean => {
  return asg.targetScope === 'ALL_STUDENTS' || 
         (asg.targetDomainOrTrack?.toLowerCase().includes('all batches') ?? false) ||
         (asg.targetDomainOrTrack?.toLowerCase().includes('all students') ?? false);
};

export const isSessionForProgram = (asg: InterviewAssignment, progName: string): boolean => {
  if (isSessionCollegeWide(asg)) return false;
  const pLower = progName.toLowerCase();
  if (asg.targetProgramName && asg.targetProgramName.toLowerCase() === pLower) return true;
  if (asg.targetProgramNames && asg.targetProgramNames.some(p => p.toLowerCase() === pLower)) return true;
  if (asg.targetDomainOrTrack && asg.targetDomainOrTrack.toLowerCase().includes(pLower)) return true;
  return false;
};

export const isSessionForDepartment = (asg: InterviewAssignment, deptName: string): boolean => {
  if (isSessionCollegeWide(asg)) return false;
  const dLower = deptName.toLowerCase();
  if (asg.targetDepartment && asg.targetDepartment.toLowerCase() === dLower) return true;
  if (asg.targetDepartments && asg.targetDepartments.some(d => d.toLowerCase() === dLower)) return true;
  if (asg.targetDomainOrTrack && asg.targetDomainOrTrack.toLowerCase().includes(dLower)) return true;
  return false;
};

export const AssessmentMonitoringWidget: React.FC<AssessmentMonitoringWidgetProps> = ({
  collegeId,
  className = '',
  programName: propProgramName,
  department: propDepartment,
  hideScopeSelector = false,
  titlePrefix
}) => {
  const { assignments, deleteAssignment, viewAssessmentActivity, viewAssessmentSubmissions, currentUser } = useApp();
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // College-wide drawer toggle when viewing specific program or department
  const [showCollegeWideDrawer, setShowCollegeWideDrawer] = useState(false);

  // Base assignments filtered by college if provided
  const collegeAssignments = useMemo(() => {
    return (assignments || []).filter(
      (a) => !collegeId || !a.collegeId || a.collegeId === collegeId
    );
  }, [assignments, collegeId]);

  // Extract all available Programs from data & assignments
  const availablePrograms = useMemo(() => {
    const set = new Set<string>();
    MOCK_DYNAMIC_PROGRAMS.forEach(p => set.add(p.name));
    collegeAssignments.forEach(a => {
      if (a.targetProgramName) set.add(a.targetProgramName);
      if (a.targetProgramNames) a.targetProgramNames.forEach(p => set.add(p));
      if (a.targetScope === 'PROGRAM' && a.targetDomainOrTrack) set.add(a.targetDomainOrTrack);
    });
    return Array.from(set);
  }, [collegeAssignments]);

  // Extract all available Departments from data & assignments
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    MOCK_DYNAMIC_DEPARTMENTS.forEach(d => set.add(d.name));
    collegeAssignments.forEach(a => {
      if (a.targetDepartment) set.add(a.targetDepartment);
      if (a.targetDepartments) a.targetDepartments.forEach(d => set.add(d));
      if (a.targetScope === 'DEPARTMENT' && a.targetDomainOrTrack) set.add(a.targetDomainOrTrack);
    });
    return Array.from(set);
  }, [collegeAssignments]);

  // Determine initial scope
  const [selectedScopeType, setSelectedScopeType] = useState<'PROGRAM' | 'DEPARTMENT' | 'COLLEGE_WIDE' | 'ALL'>(() => {
    if (propProgramName) return 'PROGRAM';
    if (propDepartment) return 'DEPARTMENT';
    if (currentUser?.programName) return 'PROGRAM';
    if (currentUser?.department) return 'DEPARTMENT';
    return availablePrograms.length > 0 ? 'PROGRAM' : 'ALL';
  });

  const [selectedTargetName, setSelectedTargetName] = useState<string>(() => {
    if (propProgramName) return propProgramName;
    if (propDepartment) return propDepartment;
    if (currentUser?.programName) return currentUser.programName;
    if (currentUser?.department) return currentUser.department;
    return availablePrograms[0] || availableDepartments[0] || 'Cloud Computing & DevOps';
  });

  // Effective scope: locked if props are provided
  const effectiveScopeType = propProgramName ? 'PROGRAM' : propDepartment ? 'DEPARTMENT' : selectedScopeType;
  const effectiveTargetName = propProgramName || propDepartment || selectedTargetName;

  // Filter assignments strictly for the active scope
  const scopedAssignments = useMemo(() => {
    if (effectiveScopeType === 'PROGRAM') {
      return collegeAssignments.filter(a => isSessionForProgram(a, effectiveTargetName));
    }
    if (effectiveScopeType === 'DEPARTMENT') {
      return collegeAssignments.filter(a => isSessionForDepartment(a, effectiveTargetName));
    }
    if (effectiveScopeType === 'COLLEGE_WIDE') {
      return collegeAssignments.filter(a => isSessionCollegeWide(a));
    }
    // If 'ALL' (e.g. general institution view)
    return collegeAssignments;
  }, [collegeAssignments, effectiveScopeType, effectiveTargetName]);

  // Separate college-wide assignments (shown elsewhere if viewing program or department)
  const collegeWideAssignments = useMemo(() => {
    return collegeAssignments.filter(a => isSessionCollegeWide(a));
  }, [collegeAssignments]);

  const activeCollegeWideSessions = useMemo(() => {
    return collegeWideAssignments.filter(a => !isAssignmentElapsed(a));
  }, [collegeWideAssignments]);

  // Calculate unique metrics for this program/department
  const totalMockInterviews = scopedAssignments.filter(
    (a) => a.sessionType === 'MOCK_INTERVIEW' || a.sessionType === 'BOTH'
  ).length;

  const totalListening = scopedAssignments.filter(
    (a) => a.sessionType === 'LISTENING_COMPREHENSION' || a.sessionType === 'BOTH'
  ).length;

  // Helper to filter submissions per department if department-scoped
  const getScopedSubmissions = (subs?: InterviewAssignment['submissions']) => {
    if (!subs) return [];
    if (effectiveScopeType === 'DEPARTMENT') {
      return subs.filter(
        s => !s.department || s.department.toLowerCase() === effectiveTargetName.toLowerCase()
      );
    }
    return subs;
  };

  const totalSubmissions = scopedAssignments.reduce(
    (acc, a) => acc + getScopedSubmissions(a.submissions).length,
    0
  );

  const activeSessions = scopedAssignments.filter((a) => !isAssignmentElapsed(a));

  const handleRevoke = async (id: string, title: string) => {
    setRevoking(true);
    try {
      await deleteAssignment(id);
      setRevokeConfirmId(null);
      setFeedback(`Session "${title}" revoked successfully.`);
      setTimeout(() => setFeedback(null), 4000);
    } catch {
      setFeedback('Failed to revoke session. Please try again.');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className={`bg-white border border-neutral-200/90 rounded-3xl p-6 shadow-xs space-y-6 ${className}`}>
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-900">
                {titlePrefix ? `${titlePrefix} Assessment & Interview Hub` : 'Assessment & Interview Operations Hub'}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                Live Monitoring
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200">
                {effectiveScopeType === 'PROGRAM' ? `Program: ${effectiveTargetName}` :
                 effectiveScopeType === 'DEPARTMENT' ? `Department: ${effectiveTargetName}` :
                 effectiveScopeType === 'COLLEGE_WIDE' ? 'Scope: College-Wide Broadcasts' : 'Scope: All Institution Sessions'}
              </span>
            </div>
          </div>
        </div>

        {/* View Previous Activity History Button */}
        <button
          type="button"
          onClick={() => viewAssessmentActivity()}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
        >
          <Calendar className="w-3.5 h-3.5 text-neutral-600" />
          <span>View Previous Sessions &amp; Activity</span>
          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
        </button>
      </div>

      {/* Scope Selector: Unique per Program or Department */}
      {!hideScopeSelector && !propProgramName && !propDepartment && (
        <div className="p-3 bg-neutral-50/90 rounded-2xl border border-neutral-200/80 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-700 flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-500" />
              <span>Select Active Program or Department Scope:</span>
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">
              Interviews are isolated per track
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {/* Programs Section */}
            <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1 flex items-center">
              <Layers className="w-3 h-3 mr-1" /> Programs:
            </span>
            {availablePrograms.map(pName => {
              const isSelected = effectiveScopeType === 'PROGRAM' && effectiveTargetName === pName;
              return (
                <button
                  key={pName}
                  type="button"
                  onClick={() => {
                    setSelectedScopeType('PROGRAM');
                    setSelectedTargetName(pName);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                      : 'bg-white text-neutral-700 hover:bg-neutral-200/70 border border-neutral-200'
                  }`}
                >
                  <span>{pName}</span>
                </button>
              );
            })}

            {/* Separator */}
            <span className="text-neutral-300 mx-1">|</span>

            {/* Departments Section */}
            <span className="text-[10px] uppercase font-bold text-neutral-400 mr-1 flex items-center">
              <Building2 className="w-3 h-3 mr-1" /> Depts:
            </span>
            {availableDepartments.slice(0, 3).map(dName => {
              const isSelected = effectiveScopeType === 'DEPARTMENT' && effectiveTargetName === dName;
              return (
                <button
                  key={dName}
                  type="button"
                  onClick={() => {
                    setSelectedScopeType('DEPARTMENT');
                    setSelectedTargetName(dName);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                      : 'bg-white text-neutral-700 hover:bg-neutral-200/70 border border-neutral-200'
                  }`}
                >
                  <span>{dName.split(' ')[0]}</span>
                </button>
              );
            })}

            {/* Separator */}
            <span className="text-neutral-300 mx-1">|</span>

            {/* College-Wide Button (Shown Elsewhere) */}
            <button
              type="button"
              onClick={() => {
                setSelectedScopeType('COLLEGE_WIDE');
                setSelectedTargetName('College-Wide Broadcasts');
              }}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                effectiveScopeType === 'COLLEGE_WIDE'
                  ? 'bg-emerald-900 text-emerald-100 shadow-xs font-semibold'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title="View interviews assigned university-wide to all students"
            >
              <Globe className="w-3 h-3 text-emerald-600" />
              <span>College-Wide ({collegeWideAssignments.length})</span>
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Metrics Row: Strictly Unique for the Scoped Program/Department */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
            <span>Mock Interviews</span>
            <Mic className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">{totalMockInterviews}</div>
          <div className="text-[10px] text-neutral-400 font-mono">For this specific track</div>
        </div>

        <div className="p-4 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
            <span>Listening Labs</span>
            <Headphones className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">{totalListening}</div>
          <div className="text-[10px] text-neutral-400 font-mono">For this specific track</div>
        </div>

        <div className="p-4 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
            <span>Total Submissions</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900">{totalSubmissions}</div>
          <div className="text-[10px] text-neutral-400 font-mono">Track candidate submissions</div>
        </div>

        <div className="p-4 bg-neutral-50/70 border border-neutral-200/80 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] font-medium">
            <span>Online / Active</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">{activeSessions.length}</div>
          <div className="text-[10px] text-neutral-400 font-mono">Active evaluation windows</div>
        </div>
      </div>

      {/* Currently Online / Active Sessions Section: Unique to this Program or Department */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Currently Online &amp; Active Evaluation Sessions ({activeSessions.length})
            </h4>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">
            {activeSessions.length === 0 
              ? 'No active sessions for this specific track' 
              : `Allocated to ${effectiveTargetName}`}
          </span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="p-8 bg-neutral-50 border border-dashed border-neutral-200 rounded-2xl text-center space-y-2">
            <Clock className="w-8 h-8 text-neutral-400 mx-auto" />
            <p className="text-xs font-semibold text-neutral-700">
              No Active Sessions Allocated Specifically to {effectiveTargetName}
            </p>
            <p className="text-[11px] text-neutral-500 max-w-md mx-auto">
              Any mock interview or listening test assigned to other programs, departments, or university-wide are isolated and kept elsewhere.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeSessions.map((asg) => {
              const submissionCount = getScopedSubmissions(asg.submissions).length;
              const isConfirmingRevoke = revokeConfirmId === asg.id;

              return (
                <div
                  key={asg.id}
                  className="p-4 bg-neutral-50/80 hover:bg-neutral-50 border border-neutral-200 rounded-2xl transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            asg.sessionType === 'MOCK_INTERVIEW'
                              ? 'bg-neutral-900 text-emerald-400'
                              : asg.sessionType === 'LISTENING_COMPREHENSION'
                              ? 'bg-purple-950 text-purple-300'
                              : 'bg-neutral-900 text-amber-300'
                          }`}
                        >
                          {asg.sessionType === 'MOCK_INTERVIEW' ? (
                            <Mic className="w-3.5 h-3.5" />
                          ) : asg.sessionType === 'LISTENING_COMPREHENSION' ? (
                            <Headphones className="w-3.5 h-3.5" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-neutral-900 line-clamp-1">{asg.title}</h5>
                          <div className="flex items-center space-x-2 text-[10px] text-neutral-500 mt-0.5">
                            <span className="font-mono">{asg.sessionType.replace('_', ' ')}</span>
                            <span>·</span>
                            <span className="font-medium text-neutral-700 truncate max-w-[140px]">
                              {asg.targetDomainOrTrack || asg.targetProgramName || asg.targetDepartment || 'Track Specific'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {asg.difficulty && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 shrink-0">
                          {asg.difficulty}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-500 font-mono pt-1">
                      <span className="flex items-center space-x-1 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
                        <Calendar className="w-3 h-3 text-neutral-400" />
                        <span>Due: {asg.dueDate}</span>
                      </span>
                      {asg.startTime && asg.endTime && (
                        <span className="flex items-center space-x-1 bg-white px-2 py-0.5 rounded-md border border-neutral-200">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <span>{asg.startTime} - {asg.endTime}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Submissions Link */}
                  <div className="pt-2 border-t border-neutral-200/70 flex items-center justify-between gap-2">
                    {/* Clickable Submissions Link -> Opens Dedicated Submissions Page */}
                    <button
                      type="button"
                      onClick={() => viewAssessmentSubmissions(asg.id)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5 group"
                      title="Inspect student scores and profile breakdowns on a dedicated page"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>{submissionCount} {submissionCount === 1 ? 'Student' : 'Students'} Submitted</span>
                      <ArrowRight className="w-3 h-3 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Revoke Session Button */}
                    {isConfirmingRevoke ? (
                      <div className="flex items-center space-x-1 animate-in fade-in duration-100">
                        <button
                          type="button"
                          disabled={revoking}
                          onClick={() => handleRevoke(asg.id, asg.title)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          {revoking ? 'Revoking...' : 'Confirm Revoke'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevokeConfirmId(null)}
                          className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-lg text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevokeConfirmId(asg.id)}
                        className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1"
                        title="Remove / Revoke this active session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Revoke Session</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* College-Wide Sessions: Shown Elsewhere Section */}
      {effectiveScopeType !== 'COLLEGE_WIDE' && activeCollegeWideSessions.length > 0 && (
        <div className="pt-2 border-t border-neutral-100">
          <div 
            onClick={() => setShowCollegeWideDrawer(prev => !prev)}
            className="p-3.5 bg-neutral-50/70 hover:bg-neutral-100/70 border border-neutral-200/80 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-neutral-900">
                    College-Wide Evaluation Sessions ({activeCollegeWideSessions.length})
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    Shown Elsewhere (University Scope)
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Assigned broadly across all students in the college (not specific to {effectiveTargetName}).
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-600">
              <span>{showCollegeWideDrawer ? 'Hide College-Wide Drills' : 'View College-Wide Drills'}</span>
              {showCollegeWideDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {/* Expanded College-Wide Sessions Container */}
          {showCollegeWideDrawer && (
            <div className="mt-3 p-4 bg-emerald-50/30 border border-emerald-200/60 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-950 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-700" />
                  <span>University-Wide / Common Mock Drills</span>
                </span>
                <span className="text-[10px] text-emerald-800 font-mono">
                  Isolated from program metrics
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeCollegeWideSessions.map((asg) => {
                  const submissionCount = asg.submissions?.length || 0;
                  const isConfirmingRevoke = revokeConfirmId === asg.id;

                  return (
                    <div
                      key={asg.id}
                      className="p-4 bg-white border border-emerald-200/80 rounded-2xl space-y-3 flex flex-col justify-between shadow-2xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start space-x-2.5">
                            <div className="w-7 h-7 rounded-xl bg-neutral-900 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                              {asg.sessionType === 'MOCK_INTERVIEW' ? <Mic className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-neutral-900 line-clamp-1">{asg.title}</h5>
                              <div className="flex items-center space-x-2 text-[10px] text-neutral-500 mt-0.5">
                                <span className="font-mono">{asg.sessionType.replace('_', ' ')}</span>
                                <span>·</span>
                                <span className="font-medium text-emerald-700">All Batches (College-Wide)</span>
                              </div>
                            </div>
                          </div>

                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            ALL-COLLEGE
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-neutral-500 font-mono pt-1">
                          <span className="flex items-center space-x-1 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-200">
                            <Calendar className="w-3 h-3 text-neutral-400" />
                            <span>Due: {asg.dueDate}</span>
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => viewAssessmentSubmissions(asg.id)}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1.5"
                        >
                          <Users className="w-3.5 h-3.5 text-neutral-600" />
                          <span>{submissionCount} Submissions</span>
                          <ArrowRight className="w-3 h-3 text-neutral-400" />
                        </button>

                        {isConfirmingRevoke ? (
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              disabled={revoking}
                              onClick={() => handleRevoke(asg.id, asg.title)}
                              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setRevokeConfirmId(null)}
                              className="px-2 py-1 bg-neutral-200 text-neutral-700 rounded-lg text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRevokeConfirmId(asg.id)}
                            className="px-2 py-1 text-rose-600 hover:text-rose-800 rounded-xl text-xs font-medium cursor-pointer flex items-center space-x-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
