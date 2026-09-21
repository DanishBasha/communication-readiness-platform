import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Lock, Mail, User, Sparkles, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { 
    authModalOpen, 
    authModalMode, 
    closeAuthModal, 
    openAuthModal, 
    loginUser, 
    registerExternalUser,
    verifyEmailAndLogin 
  } = useApp();

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science & Engineering');
  const [regBatchYear, setRegBatchYear] = useState(2026);

  // Verification Step State
  const [step, setStep] = useState<'FORM' | 'VERIFY'>('FORM');
  const [verificationCode, setVerificationCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginUser(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await registerExternalUser({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        department: regDepartment,
        batchYear: Number(regBatchYear)
      });
      setSimulatedCode(res.simulatedVerificationCode);
      setStep('VERIFY');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyEmailAndLogin(regEmail.trim(), verificationCode.trim());
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const resetModals = (mode: 'login' | 'register') => {
    setError(null);
    setStep('FORM');
    setVerificationCode('');
    setSimulatedCode(null);
    openAuthModal(mode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-neutral-900" />
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
                {authModalMode === 'login' ? 'Institutional Sign In' : 'Candidate Registration'}
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {authModalMode === 'login' 
                ? 'Sign in with your institutional credentials to open your designated portal.' 
                : 'Self-register as a candidate for placement communication practice.'}
            </p>
          </div>
          <button 
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-200 px-6 pt-3 bg-white shrink-0">
          <button
            onClick={() => resetModals('login')}
            className={`pb-2.5 text-xs font-medium border-b-2 mr-6 transition-colors cursor-pointer ${
              authModalMode === 'login' 
                ? 'border-neutral-900 text-neutral-900 font-semibold' 
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => resetModals('register')}
            className={`pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              authModalMode === 'register' 
                ? 'border-neutral-900 text-neutral-900 font-semibold' 
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Candidate Self-Registration
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {authModalMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@college.edu or candidate@college.edu"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
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
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
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
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-[11px] text-neutral-500 leading-relaxed">
                <span className="font-medium text-neutral-700">Role-Based Access Note: </span>
                Your role (Super Admin, Program Admin, Faculty Mentor, Domain Trainer, or Student) is resolved automatically upon authentication.
              </div>
            </form>
          ) : step === 'FORM' ? (
            <form onSubmit={handleRegisterStep1} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Priyadharshini M"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Department</label>
                  <select
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
                  >
                    <option value="Computer Science & Engineering">CSE</option>
                    <option value="Information Technology">IT</option>
                    <option value="AI & Data Science">AIDS</option>
                    <option value="Electronics & Communication">ECE</option>
                    <option value="Electrical & Electronics">EEE</option>
                    <option value="Mechanical Engineering">Mechanical</option>
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

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                <strong>Track Policy: </strong>
                Self-registered candidates are enrolled as <strong>EXTERNAL</strong> practice candidates. Internal college cohorts (HOPE Elite / PEP Domains) are provisioned directly by Faculty Mentors.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-neutral-900 hover:bg-black text-white text-xs font-medium py-2.5 rounded-xl transition-all shadow-xs disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Initiating Registration...</span>
                  </>
                ) : (
                  <span>Continue to Email Verification</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5">
                <p className="font-semibold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Verification Code Dispatched</span>
                </p>
                <p className="text-blue-700">
                  Please enter the 6-digit confirmation code sent to <strong>{regEmail}</strong>.
                </p>
                {simulatedCode && (
                  <div className="mt-2 p-2 bg-white rounded-lg border border-blue-200 font-mono text-center">
                    <span className="text-neutral-500 text-[10px] block">YOUR VERIFICATION CODE</span>
                    <span className="text-base font-bold tracking-widest text-neutral-900">{simulatedCode}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">6-Digit Confirmation Code</label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono tracking-widest text-center focus:outline-none focus:border-neutral-900 transition-colors"
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
                    <span>Verifying Code & Logging in...</span>
                  </>
                ) : (
                  <span>Verify Email & Access Dashboard</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('FORM')}
                className="w-full text-center text-xs text-neutral-500 hover:text-neutral-900 py-1"
              >
                ← Back to Registration Details
              </button>
            </form>
          )}
        </div>

        {/* Footer Switcher */}
        <div className="p-3.5 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between text-xs shrink-0">
          <span className="text-neutral-500">
            {authModalMode === 'login' ? "New candidate?" : "Already registered?"}
          </span>
          <button
            type="button"
            onClick={() => resetModals(authModalMode === 'login' ? 'register' : 'login')}
            className="font-medium text-neutral-900 hover:underline cursor-pointer"
          >
            {authModalMode === 'login' ? "Candidate Self-Registration" : "Sign in to existing account"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AuthModal;

