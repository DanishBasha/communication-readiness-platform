import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { PendingInvite } from '../../types';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  Building2, 
  ShieldCheck,
  ArrowRight,
  Zap
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    authModalOpen, 
    authModalMode, 
    closeAuthModal, 
    openAuthModal, 
    loginUser, 
    registerCandidate,
    completeInviteActivation
  } = useApp();

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'INVITE'>('LOGIN');

  // Sign in state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Candidate Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science & Engineering');
  const [regBatchYear, setRegBatchYear] = useState(2026);

  // Invite activation state
  const [inviteToken, setInviteToken] = useState('');
  const [inviteDetails, setInviteDetails] = useState<PendingInvite | null>(null);
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState('');
  const [tokenSearching, setTokenSearching] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync mode from context
  useEffect(() => {
    if (authModalMode === 'register') {
      setActiveTab('REGISTER');
    } else if (activeTab !== 'INVITE') {
      setActiveTab('LOGIN');
    }
  }, [authModalMode]);

  // Check URL params for invite_token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite_token');
    if (token) {
      setInviteToken(token);
      setActiveTab('INVITE');
      openAuthModal('login');
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
        setError('Invite link is invalid or may have expired.');
        setInviteDetails(null);
      }
    } catch {
      setError('Unable to resolve invite link.');
    } finally {
      setTokenSearching(false);
    }
  };

  if (!authModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginUser(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
    setError(null);
    setLoading(true);
    try {
      await loginUser(demoEmail, 'demo123');
    } catch (err: any) {
      setError(err?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in your name, email, and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await registerCandidate({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword
      });
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
    setLoading(true);
    try {
      await completeInviteActivation(inviteToken.trim(), invitePassword);
    } catch (err: any) {
      setError(err?.message || 'Failed to activate account. The link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-neutral-900" />
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
                {activeTab === 'LOGIN' && 'Portal Sign In'}
                {activeTab === 'REGISTER' && 'Candidate Self-Registration'}
                {activeTab === 'INVITE' && 'Admin Account Activation'}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {activeTab === 'LOGIN' && 'Access your institutional dashboard or independent candidate studio.'}
              {activeTab === 'REGISTER' && 'Open registration for self-paced mock interviews & listening comprehension.'}
              {activeTab === 'INVITE' && 'Set your private password using your invitation activation token.'}
            </p>
          </div>
          <button 
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 px-6 pt-3 bg-white shrink-0 space-x-6 text-xs font-medium">
          <button
            onClick={() => { setActiveTab('LOGIN'); setError(null); }}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'LOGIN' 
                ? 'border-neutral-900 text-neutral-900 font-semibold' 
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('REGISTER'); setError(null); }}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'REGISTER' 
                ? 'border-neutral-900 text-neutral-900 font-semibold' 
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Candidate Registration
          </button>
          <button
            onClick={() => { setActiveTab('INVITE'); setError(null); }}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'INVITE' 
                ? 'border-neutral-900 text-neutral-900 font-semibold' 
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Activate Invite
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'LOGIN' && (
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Email / User ID</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. owner@platform.com or admin@college.edu"
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In to Designated Portal</span>
                  )}
                </button>
              </form>

              {/* Quick Demo Logins Box */}
              <div className="pt-3 border-t border-neutral-100 space-y-2">
                <div className="flex items-center space-x-1.5 text-neutral-500 text-[11px] font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Instant Demo Logins (Click to Test):</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('owner@platform.com')}
                    className="p-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-left transition-colors cursor-pointer group"
                  >
                    <p className="font-semibold text-neutral-900 group-hover:text-black flex items-center justify-between">
                      <span>🌐 Platform Owner</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">owner@platform.com</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('superadmin@college.edu')}
                    className="p-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-left transition-colors cursor-pointer group"
                  >
                    <p className="font-semibold text-neutral-900 group-hover:text-black flex items-center justify-between">
                      <span>🏛️ College Super Admin</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">superadmin@college.edu</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('program@college.edu')}
                    className="p-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-left transition-colors cursor-pointer group"
                  >
                    <p className="font-semibold text-neutral-900 group-hover:text-black flex items-center justify-between">
                      <span>🏢 Program Admin</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">program@college.edu</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('candidate@example.com')}
                    className="p-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl text-left transition-colors cursor-pointer group"
                  >
                    <p className="font-semibold text-neutral-900 group-hover:text-black flex items-center justify-between">
                      <span>🎯 Independent Candidate</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">candidate@example.com</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CANDIDATE REGISTRATION */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegisterCandidate} className="space-y-3.5">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
                <strong>Independent Candidate Mode: </strong>
                Open practice environment with 100% full access to adaptive AI voice interviews, speech metrics, audio listening tests, and resume-grounded questions. No faculty approval required.
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Danish Basha"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="candidate@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Password *</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Discipline / Branch</label>
                  <select
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
                  >
                    <option value="Computer Science & Engineering">CSE</option>
                    <option value="Information Technology">IT</option>
                    <option value="AI & Data Science">AIDS</option>
                    <option value="Electronics & Communication">ECE</option>
                    <option value="Independent Study">Independent Study</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Batch Year</label>
                  <input
                    type="number"
                    value={regBatchYear}
                    onChange={(e) => setRegBatchYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating your Studio Account...</span>
                  </>
                ) : (
                  <span>Register & Launch Practice</span>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: INVITE ACTIVATION */}
          {activeTab === 'INVITE' && (
            <div className="space-y-4">
              {!inviteDetails ? (
                <div className="space-y-3.5">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                    <strong>College Super Admin &amp; Program Admin Activation:</strong>
                    <br />
                    The Platform Owner and Super Admins assign no initial passwords. Enter your invitation token or open the link received in your activation email.
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Invitation Token / Code</label>
                    <div className="relative">
                      <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                      <input
                        type="text"
                        value={inviteToken}
                        onChange={(e) => setInviteToken(e.target.value)}
                        placeholder="e.g. inv_sup_174000..."
                        className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono focus:outline-none focus:border-neutral-900 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={tokenSearching || !inviteToken.trim()}
                    onClick={() => lookupToken(inviteToken)}
                    className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {tokenSearching ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Resolving Invitation...</span>
                      </>
                    ) : (
                      <span>Verify &amp; Load Invitation</span>
                    )}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCompleteActivation} className="space-y-4">
                  {/* Verified Invite Card */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-950 flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Valid Invitation Confirmed</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900 font-mono">
                        {inviteDetails.role}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60 text-[11px]">
                      <div>
                        <span className="text-emerald-700 block">Assigned College:</span>
                        <span className="font-medium text-emerald-950 font-semibold">{inviteDetails.collegeName || 'Institution'}</span>
                      </div>
                      <div>
                        <span className="text-emerald-700 block">Designated Admin:</span>
                        <span className="font-medium text-emerald-950">{inviteDetails.name}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-emerald-700 block">Strict User ID (College Email):</span>
                        <span className="font-mono text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                          {inviteDetails.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500">
                    The Platform Owner never sets your password. Please establish your own private password to complete account activation:
                  </p>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Create Private Password *</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                      <input
                        type="password"
                        required
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                      <input
                        type="password"
                        required
                        value={inviteConfirmPassword}
                        onChange={(e) => setInviteConfirmPassword(e.target.value)}
                        placeholder="Re-type your password"
                        className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Activating Administrator Account...</span>
                      </>
                    ) : (
                      <span>Complete Activation &amp; Launch Portal</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setInviteDetails(null); setInviteToken(''); }}
                    className="w-full text-center text-xs text-neutral-500 hover:text-neutral-900 py-1"
                  >
                    ← Enter a different invitation token
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between text-xs shrink-0">
          <span className="text-neutral-500">
            {activeTab === 'LOGIN' && "Don't have an institutional account?"}
            {activeTab === 'REGISTER' && "Already registered or invited?"}
            {activeTab === 'INVITE' && "Already set your password?"}
          </span>
          <button
            type="button"
            onClick={() => {
              setError(null);
              if (activeTab === 'LOGIN') setActiveTab('REGISTER');
              else setActiveTab('LOGIN');
            }}
            className="font-medium text-neutral-900 hover:underline cursor-pointer"
          >
            {activeTab === 'LOGIN' && "Register as Independent Candidate"}
            {activeTab === 'REGISTER' && "Sign in to existing account"}
            {activeTab === 'INVITE' && "Back to Sign In"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;
