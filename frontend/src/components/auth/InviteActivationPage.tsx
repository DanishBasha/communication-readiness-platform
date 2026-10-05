import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { PendingInvite } from '../../types';
import { BrandIcon } from '../common/BrandLogo';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  Building2, 
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  UserCheck,
  Sun,
  Moon
} from 'lucide-react';

export const InviteActivationPage: React.FC = () => {
  const { completeInviteActivation, setActiveView, openAuthModal, theme, toggleTheme } = useApp();

  const [inviteToken, setInviteToken] = useState('');
  const [inviteDetails, setInviteDetails] = useState<PendingInvite | null>(null);
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [tokenSearching, setTokenSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite_token');
    if (token) {
      setInviteToken(token);
      lookupToken(token);
    }
  }, []);

  const lookupToken = async (tokenStr: string) => {
    if (!tokenStr.trim()) return;
    setTokenSearching(true);
    setError(null);
    try {
      const inv = await api.invites.getByToken(tokenStr.trim());
      if (inv) {
        setInviteDetails(inv);
      } else {
        setError('The invitation link is invalid or may have expired.');
        setInviteDetails(null);
      }
    } catch {
      setError('Unable to resolve invitation link. Please check the code or contact your administrator.');
    } finally {
      setTokenSearching(false);
    }
  };

  const handleCompleteActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitePassword || invitePassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (invitePassword !== inviteConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await completeInviteActivation(inviteToken.trim(), invitePassword);
      setSuccessMsg('Account activated successfully! Launching your designated portal...');
      setTimeout(() => {
        setActiveView('DASHBOARD');
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Failed to activate account. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToSignIn = () => {
    setActiveView('DASHBOARD');
    openAuthModal('login');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col antialiased selection:bg-neutral-900 selection:text-white">
      
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center justify-between h-16">
            <div 
              onClick={() => setActiveView('DASHBOARD')}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <BrandIcon size="md" />
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-900 font-sans leading-none">
                    Latch<span className="text-neutral-500 font-semibold">Up</span>
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-700 rounded border border-neutral-200 font-mono leading-none">COLLEGE</span>
                </div>
                <span className="text-[11px] text-neutral-500 leading-tight mt-0.5">Placement &amp; Communication Suite</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
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

              <button
                type="button"
                onClick={handleBackToSignIn}
                className="text-xs font-semibold px-4 py-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <span>Back to Sign In</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-xl bg-white border border-neutral-200 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Card Header */}
          <div className="p-6 sm:p-8 border-b border-neutral-100 bg-neutral-50/70">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                <KeyRound className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h1 className="text-base sm:text-lg font-bold text-neutral-900">
                    Admin Account Activation
                  </h1>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Set your private password using your invitation activation token.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-5 text-xs">
            {/* Feedback banners */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start space-x-2.5 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{successMsg}</span>
              </div>
            )}

            {/* If no verified invite loaded yet */}
            {!inviteDetails ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/80 border border-blue-200/90 rounded-2xl text-blue-950 space-y-1.5 leading-relaxed">
                  <p className="font-bold flex items-center space-x-1.5 text-xs text-blue-900">
                    <Building2 className="w-4 h-4 text-blue-700" />
                    <span>Institutional Administrator Security Architecture</span>
                  </p>
                  <p className="text-[11px] text-blue-800">
                    The Platform Owner and College Authorities never pre-assign passwords. Please enter your invitation activation token from your official activation email to establish your private credentials.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-800">
                    Invitation Activation Token / Code *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type="text"
                      value={inviteToken}
                      onChange={(e) => setInviteToken(e.target.value)}
                      placeholder="Enter invitation code"
                      className="w-full pl-10 pr-3.5 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={tokenSearching || !inviteToken.trim()}
                  onClick={() => lookupToken(inviteToken)}
                  className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-semibold py-3 rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {tokenSearching ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Resolving Invitation Details...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Load Invitation</span>
                  )}
                </button>
              </div>
            ) : (
              /* Verified Invitation Form (Exact match with user requested UI) */
              <form onSubmit={handleCompleteActivation} className="space-y-4">
                
                {/* Green Verified Box from User Screenshot */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-emerald-950">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-xs">Valid Invitation Confirmed</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900 font-mono tracking-wider">
                      {inviteDetails.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/70 text-[11px]">
                    <div>
                      <span className="text-emerald-700 block font-medium">Assigned College:</span>
                      <span className="font-bold text-neutral-900 text-xs">
                        {inviteDetails.collegeName || 'Institution'}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block font-medium">Designated Admin:</span>
                      <span className="font-bold text-neutral-900 text-xs">
                        {inviteDetails.name}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-emerald-700 block font-medium">Strict User ID (College Email):</span>
                      <div className="font-mono text-emerald-950 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-1 font-semibold">
                        {inviteDetails.email}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed pt-1">
                  The Platform Owner never sets your password. Please establish your own private password to complete account activation:
                </p>

                {/* Create Private Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Create Private Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-neutral-800">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-neutral-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={inviteConfirmPassword}
                      onChange={(e) => setInviteConfirmPassword(e.target.value)}
                      placeholder="Re-type your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-900 focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer mt-2"
                >
                  {submitting ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Activating Administrator Account &amp; Launching Portal...</span>
                    </>
                  ) : (
                    <span>Complete Activation &amp; Launch Portal</span>
                  )}
                </button>

                {/* Switch Token */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInviteDetails(null);
                      setInviteToken('');
                      setError(null);
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer py-1 font-medium"
                  >
                    ← Enter a different invitation token
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Card Footer */}
          <div className="p-4 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between text-xs">
            <span className="text-neutral-500">Already set your password?</span>
            <button
              type="button"
              onClick={handleBackToSignIn}
              className="font-bold text-neutral-900 hover:underline cursor-pointer flex items-center space-x-1"
            >
              <span>Back to Sign In</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

        </div>
      </main>

    </div>
  );
};

export default InviteActivationPage;
