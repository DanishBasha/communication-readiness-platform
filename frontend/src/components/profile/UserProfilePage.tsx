import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  ShieldCheck, 
  Key, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  LogOut, 
  Lock,
  Layers,
  Sparkles,
  LayoutDashboard,
  Sun,
  Moon
} from 'lucide-react';

export const UserProfilePage: React.FC = () => {
  const { currentUser, student, activeRole, setActiveView, requestSignOut, theme, toggleTheme } = useApp();

  const displayName = currentUser?.name || student?.name || 'Platform Administrator';
  const displayEmail = currentUser?.email || student?.email || 'owner@readiness.edu';
  const initials = displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('');

  const isPlatformOwner = activeRole === 'PLATFORM_OWNER';

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [profilePhoto, setProfilePhoto] = React.useState<string | null>(() => {
    try {
      return localStorage.getItem(`user_photo_${displayEmail}`) || null;
    } catch {
      return null;
    }
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Please upload an image smaller than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setProfilePhoto(dataUrl);
        try {
          localStorage.setItem(`user_photo_${displayEmail}`, dataUrl);
        } catch {}
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    try {
      localStorage.removeItem(`user_photo_${displayEmail}`);
    } catch {}
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Hidden Profile Photo Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveView('DASHBOARD')}
          className="flex items-center space-x-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors bg-white hover:bg-neutral-50 px-3.5 py-2 rounded-xl border border-neutral-200/90 shadow-2xs group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-neutral-500 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to {isPlatformOwner ? 'Control Plane' : 'Dashboard'}</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-2xs cursor-pointer flex items-center space-x-1.5 text-xs font-semibold"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-neutral-600" />
                <span>Dark</span>
              </>
            )}
          </button>

          <span className="px-3 py-1 text-xs font-mono font-medium bg-neutral-100 text-neutral-600 rounded-lg border border-neutral-200">
            PROFILE · {activeRole}
          </span>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-neutral-100">
          <div className="flex items-center space-x-5">
            {/* Interactive Profile Photo Avatar */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-2xl bg-neutral-950 text-white flex items-center justify-center text-xl font-bold shadow-md relative overflow-hidden group cursor-pointer border-2 border-neutral-200 hover:border-neutral-900 transition-colors shrink-0"
              title="Click to change profile photo"
            >
              {profilePhoto ? (
                <img 
                  src={profilePhoto} 
                  alt={displayName} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                />
              ) : (
                <>
                  <span className="relative z-10">{initials}</span>
                  {isPlatformOwner && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-600/30 to-red-600/30" />
                  )}
                </>
              )}
              {/* Camera Hover Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] space-y-1">
                <span>Change</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                  {displayName}
                </h1>
                {isPlatformOwner ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-900 text-blue-300 border border-neutral-800 shadow-xs">
                    <span className="text-base leading-none">🌐</span>
                    <span>Platform Owner</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
                    {activeRole.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-500 font-mono">
                {displayEmail}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {profilePhoto ? 'Change Photo' : '+ Add Profile Photo'}
                </button>
                {profilePhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setActiveView('DASHBOARD')}
              className="px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Open Dashboard</span>
            </button>
            <button
              onClick={requestSignOut}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Detailed Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-500 text-xs font-medium">
              <User className="w-4 h-4 text-neutral-400" />
              <span>Account Identity</span>
            </div>
            <p className="text-sm font-semibold text-neutral-900">{displayName}</p>
            <p className="text-[11px] text-neutral-500 font-mono">
              {activeRole === 'STUDENT' ? `Roll: ${student?.rollNumber || currentUser?.rollNumber || 'Direct'}` : `ID: ${currentUser?.id || 'usr-master-001'}`}
            </p>
          </div>

          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-500 text-xs font-medium">
              <Mail className="w-4 h-4 text-neutral-400" />
              <span>Primary Email</span>
            </div>
            <p className="text-sm font-semibold text-neutral-900 font-mono truncate">{displayEmail}</p>
            <span className="inline-flex items-center text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Verified Contact
            </span>
          </div>

          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-500 text-xs font-medium">
              <Building2 className="w-4 h-4 text-neutral-400" />
              <span>{activeRole === 'STUDENT' ? 'Academic Department' : 'Institutional Jurisdiction'}</span>
            </div>
            <p className="text-sm font-semibold text-neutral-900">
              {activeRole === 'STUDENT' 
                ? (student?.department || currentUser?.department || 'Computer Science & Engineering')
                : (isPlatformOwner ? 'Global Multi-Tenant SaaS' : (currentUser?.collegeName || 'Autonomous Campus'))}
            </p>
            <p className="text-[11px] text-neutral-500">
              {activeRole === 'STUDENT' ? `Class of ${student?.batchYear || currentUser?.batchYear || 2026}` : (isPlatformOwner ? 'All registered colleges & cloud tenants' : 'Campus Placement Cell')}
            </p>
          </div>

          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-500 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-neutral-400" />
              <span>{activeRole === 'STUDENT' ? 'Enrolled Track' : 'Platform Role & Tier'}</span>
            </div>
            <p className="text-sm font-semibold text-neutral-900">
              {activeRole === 'STUDENT' 
                ? (student?.track || currentUser?.track || 'General Readiness Track')
                : (isPlatformOwner ? '🌐 Master Platform Owner' : activeRole.replace(/_/g, ' '))}
            </p>
            <p className="text-[11px] text-neutral-500">
              {activeRole === 'STUDENT' ? `Mentor: ${student?.mentorName || 'Dr. S. Ranganathan'}` : 'Tier: Enterprise Multi-Tenant Master'}
            </p>
          </div>

          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-500 text-xs font-medium">
              <Lock className="w-4 h-4 text-neutral-400" />
              <span>Security &amp; Auth State</span>
            </div>
            <p className="text-sm font-semibold text-emerald-700 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Secure Session Active</span>
            </p>
            <p className="text-[11px] text-neutral-500 font-mono">TLS 1.3 · Token Verified</p>
          </div>

          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center space-x-2 text-neutral-500 text-xs font-medium">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span>{activeRole === 'STUDENT' ? 'Placement Readiness' : 'Account Status'}</span>
            </div>
            <p className="text-sm font-semibold text-neutral-900">
              {activeRole === 'STUDENT' ? `${student?.overallReadiness || 82}% Overall Score` : 'Permanent System Administrator'}
            </p>
            <p className="text-[11px] text-neutral-500 font-mono">
              {activeRole === 'STUDENT' ? 'Active Candidate' : 'Active'}
            </p>
          </div>

          {/* Theme & Visual Appearance Setting Card */}
          <div className="bg-neutral-50/70 border border-neutral-200/80 rounded-xl p-4.5 space-y-2 col-span-1 sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-neutral-900 font-semibold text-xs">
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span>Visual Appearance & Theme</span>
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">
                  Choose between Mobbin Clean Light Mode and Mobbin Obsidian Dark Mode. Your preference persists across browser sessions.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleTheme()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                    theme === 'light'
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                      : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleTheme()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                    theme === 'dark'
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                      : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Master Privileges or Student Verified Qualifications */}
        <div className="pt-4 border-t border-neutral-100 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-900 uppercase tracking-wider font-mono">
            <Key className="w-4 h-4 text-neutral-500" />
            <span>{activeRole === 'STUDENT' ? 'Verified Candidate Competencies' : 'Authorized System Privileges'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(activeRole === 'STUDENT' ? [
              `LeetCode Solved: ${student?.codingHandles?.leetcodeSolved ?? 110} Problems`,
              `GitHub Repositories: ${student?.codingHandles?.githubRepos ?? 12} Public Repos`,
              `Resume Profile: ${student?.resume ? 'Verified & Uploaded' : 'Uploaded'}`,
              `Verbal Pacing: ${student?.recentReports?.[0]?.averageWpm ?? 124} WPM Target`,
              `Technical Readiness: ${student?.recentReports?.[0]?.technicalScore ?? 86}% Verified`,
              `Listening Comprehension: Completed FinPay Session`
            ] : isPlatformOwner ? [
              'Onboard & Provision Institutional Colleges',
              'Dispatch Super Admin Activation Invites',
              'Delete & De-provision Colleges with Password Verification',
              'Monitor Multi-Tenant Student Enrolment',
              'Audit LLM & Token Usage Across Tenants',
              'Master Platform Security Governance'
            ] : [
              'Access Assigned Readiness Assessment Workspace',
              'View Departmental Diagnostic Reports',
              'Track Practice Drills & Readiness Progression'
            ]).map((perm, idx) => (
              <div key={idx} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 text-xs flex items-center space-x-2.5 text-neutral-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{perm}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
