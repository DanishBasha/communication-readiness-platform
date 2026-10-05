import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { BrandIcon } from './BrandLogo';
import { 
  LogOut, 
  Bell, 
  CheckCheck, 
  Trash2, 
  Mic, 
  Headphones, 
  Sparkles, 
  Award, 
  Clock,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    activeRole, 
    student, 
    setActiveView, 
    currentUser, 
    requestSignOut,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    assignments,
    startAssignedSession,
    viewAssessmentSubmissions,
    theme,
    toggleTheme
  } = useApp();

  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close notification popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    };
    if (notificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationOpen]);

  const roleBadgeMap: Record<string, string> = {
    'PLATFORM_OWNER': '🌐 Platform Owner',
    'SUPER_ADMIN': '👑 Super Administrator',
    'DEPARTMENT_ADMIN': '💻 Department Admin',
    'COUNSELLOR': '👩‍🏫 Class Counsellor',
    'PROGRAM_ADMIN': '🏢 Program Administrator',
    'PLACEMENT_COORDINATOR': '📊 Placement Coordinator',
    'COUNSELOR': '🤝 Department Counselor',
    'STUDENT': '🎓 Student'
  };

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    markNotificationAsRead(notif.id);
    if (notif.type === 'SESSION_COMPLETED' || notif.reportId) {
      setActiveView('REPORT_VIEW');
      setNotificationOpen(false);
      return;
    }
    if (notif.assignmentId) {
      if (activeRole === 'STUDENT') {
        const asg = assignments.find(a => a.id === notif.assignmentId);
        if (asg) {
          startAssignedSession(asg);
          setNotificationOpen(false);
        }
      } else {
        viewAssessmentSubmissions(notif.assignmentId);
        setNotificationOpen(false);
      }
    }
  };

  const formatNotificationTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 w-full">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between h-16 gap-3">
          
          <div className="flex items-center space-x-3 shrink-0">
            <div 
              onClick={() => setActiveView('DASHBOARD')}
              className="flex items-center space-x-2.5 cursor-pointer group"
              title="Return to Dashboard"
            >
              <BrandIcon size="md" />
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-900 font-sans leading-none">
                    Latch<span className="text-neutral-500 font-semibold">Up</span>
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono leading-none">
                    {currentUser?.collegeName ? currentUser.collegeName.split(' ')[0] : (activeRole === 'PLATFORM_OWNER' ? 'SAAS' : 'COLLEGE')}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 hidden sm:inline leading-tight mt-0.5">Placement &amp; Communication Suite</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {activeRole === 'STUDENT' && (
              <div className="hidden sm:flex items-center space-x-2 bg-neutral-50 border border-neutral-200/80 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-medium text-neutral-700">
                  {(currentUser?.isIndependent || student?.isIndependent) ? '🎯 Independent Candidate' : (student?.track || 'General Track')}
                </span>
              </div>
            )}

            {/* Role Badge */}
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center space-x-1.5 ${
                activeRole === 'PLATFORM_OWNER'
                  ? 'bg-neutral-950 text-white border-neutral-800 shadow-2xs font-bold'
                  : activeRole === 'SUPER_ADMIN'
                  ? 'bg-neutral-950 text-white border-neutral-800 font-bold'
                  : activeRole === 'DEPARTMENT_ADMIN'
                  ? 'bg-neutral-100 text-neutral-900 border-neutral-200'
                  : activeRole === 'COUNSELLOR'
                  ? 'bg-neutral-100 text-neutral-900 border-neutral-200'
                  : activeRole === 'PROGRAM_ADMIN'
                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                  : activeRole === 'PLACEMENT_COORDINATOR'
                  ? 'bg-neutral-100 text-neutral-900 border-neutral-200'
                  : activeRole === 'STUDENT'
                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                  : 'bg-neutral-100 text-neutral-800 border-neutral-200'
              }`}>
                <span>
                  {activeRole === 'DEPARTMENT_ADMIN'
                    ? `💻 ${currentUser?.department || 'IT'} Dept Head`
                    : activeRole === 'COUNSELLOR'
                    ? `👩‍🏫 ${currentUser?.assignedClassName || 'Class Counsellor'}`
                    : activeRole === 'PROGRAM_ADMIN'
                    ? (currentUser?.programName ? `🎯 ${currentUser.programName} Admin` : (currentUser?.department ? `🏢 ${currentUser.department} Admin` : '🏢 Program Admin'))
                    : (roleBadgeMap[activeRole] || activeRole)}
                </span>
              </span>
            </div>

            {/* Notification Bell Button placed between user role badge and profile/avatar button */}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setNotificationOpen(prev => !prev)}
                className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                  notificationOpen
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200 shadow-2xs'
                }`}
                title="Notifications"
                aria-label="View Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-75">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Dropdown */}
              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="px-4 py-3 bg-neutral-50/80 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-neutral-900">Notifications</span>
                      {unreadNotificationCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700">
                          {unreadNotificationCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {unreadNotificationCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsAsRead}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-blue-50 cursor-pointer"
                          title="Mark all as read"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>Mark read</span>
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          type="button"
                          onClick={clearNotifications}
                          className="text-[11px] text-neutral-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50 cursor-pointer"
                          title="Clear all notifications"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notification Items List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-neutral-400 space-y-1">
                        <Bell className="w-6 h-6 mx-auto text-neutral-300 mb-1" />
                        <p className="text-xs font-medium text-neutral-600">No notifications yet</p>
                        <p className="text-[11px]">Assigned mock tests and evaluations will appear here</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const isAssignment = notif.type === 'ASSIGNMENT_CREATED';
                        return (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-3.5 flex items-start space-x-3 hover:bg-neutral-50 cursor-pointer transition-colors ${
                              !notif.read ? 'bg-blue-50/30' : ''
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isAssignment ? 'bg-neutral-900 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isAssignment ? <Mic className="w-4 h-4 text-emerald-400" /> : <Award className="w-4 h-4" />}
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-xs font-semibold truncate ${
                                  !notif.read ? 'text-neutral-950 font-bold' : 'text-neutral-800'
                                }`}>
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] text-neutral-400 font-mono flex items-center space-x-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{formatNotificationTime(notif.createdAt)}</span>
                                </span>
                                {(notif.type === 'SESSION_COMPLETED' || notif.reportId) ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 flex items-center space-x-0.5 group-hover:underline">
                                    <span>Click here to view results</span>
                                    <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                                  </span>
                                ) : notif.assignmentId ? (
                                  <span className="text-[10px] font-semibold text-blue-600 flex items-center space-x-0.5 group-hover:underline">
                                    <span>{activeRole === 'STUDENT' ? 'Start Session' : 'View Submissions'}</span>
                                    <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Student Coins Balance Pill in Navbar */}
            {activeRole === 'STUDENT' && (
              <div 
                onClick={() => setActiveView('DASHBOARD')}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 rounded-xl text-amber-900 shadow-2xs cursor-pointer transition-colors"
                title="Available Session Coins"
              >
                <span className="text-sm">🪙</span>
                <span className="text-xs font-bold font-mono">{student?.coins ?? 5} Coins</span>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Dark Mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600" />
              )}
            </button>

            {/* User Profile trigger via avatar and name near logout button */}
            <div className="flex items-center space-x-2 pl-2 border-l border-neutral-200 ml-0.5">
              <button
                type="button"
                onClick={() => setActiveView('PROFILE')}
                className="w-8 h-8 rounded-full bg-neutral-900 hover:bg-black text-white flex items-center justify-center text-xs font-semibold shadow-xs cursor-pointer transition-transform hover:scale-105"
                title="View Profile"
              >
                {(currentUser?.name || student?.name || 'Platform Owner').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
              </button>
              
              <div 
                onClick={() => setActiveView('PROFILE')} 
                className="hidden xl:block text-left text-xs leading-tight cursor-pointer group"
                title="View Profile"
              >
                <p className="font-semibold text-neutral-900 truncate max-w-[130px] group-hover:text-blue-600 transition-colors">
                  {currentUser?.name || student?.name || 'Platform Owner'}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[130px]">
                  {currentUser?.email || activeRole}
                </p>
              </div>

              <button
                type="button"
                onClick={requestSignOut}
                title="Sign Out"
                className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
