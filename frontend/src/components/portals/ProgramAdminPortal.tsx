import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Layers, 
  UserPlus, 
  UserMinus, 
  Calendar, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  Building,
  ShieldCheck
} from 'lucide-react';
import { PEP_DOMAINS } from '../../data/mockData';

export const ProgramAdminPortal: React.FC = () => {
  const { trainerTenures, onboardTrainer, revokeTrainer, createAssignment } = useApp();
  const [selectedDomain, setSelectedDomain] = useState('Cloud Computing & DevOps');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);

  // New trainer form state
  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [company, setCompany] = useState('');
  const [startDate, setStartDate] = useState('2026-09-20');
  const [endDate, setEndDate] = useState('2026-10-04');

  const handleOnboardTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerName || !trainerEmail) return;
    onboardTrainer({
      trainerName,
      trainerEmail,
      companyOrInstitute: company || 'Industry Guest Faculty',
      domain: selectedDomain,
      startDate,
      endDate
    });
    setTrainerName('');
    setTrainerEmail('');
    setCompany('');
    setIsOnboardModalOpen(false);
  };

  const domainTrainers = trainerTenures.filter(t => t.domain === selectedDomain);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono uppercase font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Program Admin Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">Track & Domain Administration</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage HOPE Elite / Non-Elite cohorts, 21 PEP Domains, and external visiting trainer tenures.
          </p>
        </div>

        {/* Domain Selector */}
        <div className="bg-slate-950 border border-slate-800 p-2 rounded-2xl">
          <label className="text-[11px] text-slate-400 px-2 block">Active Program/Domain:</label>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="bg-transparent text-xs font-semibold text-white px-2 py-1 outline-none cursor-pointer"
          >
            <option value="HOPE Elite (DSA & Coding)" className="bg-slate-900">★ HOPE Elite (DSA & Coding)</option>
            <option value="HOPE Non-Elite" className="bg-slate-900">HOPE Non-Elite</option>
            {PEP_DOMAINS.map(d => (
              <option key={d} value={d} className="bg-slate-900">PEP: {d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Visiting Trainer Lifecycle Management Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Visiting Trainer Tenures (100-Day Semester Program)</h3>
            <p className="text-xs text-slate-400">External instructors visiting for 10–15 day modules. Revoke access immediately when tenure concludes.</p>
          </div>

          <button
            onClick={() => setIsOnboardModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-lg shadow-amber-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Visiting Trainer</span>
          </button>
        </div>

        {/* Trainer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {domainTrainers.length > 0 ? (
            domainTrainers.map((t) => (
              <div key={t.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{t.trainerName}</h4>
                    <p className="text-xs text-slate-400">{t.companyOrInstitute}</p>
                    <p className="text-xs text-indigo-400 font-mono mt-0.5">{t.trainerEmail}</p>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    t.isActive 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {t.isActive ? 'TENURE ACTIVE' : 'ACCESS REVOKED'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Tenure: {t.startDate} to {t.endDate} (15 Days)</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-500">Scope: {t.domain}</span>
                  {t.isActive ? (
                    <button
                      onClick={() => revokeTrainer(t.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 transition"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Revoke Access</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Inactive</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-4 col-span-2 text-center">
              No external trainers currently assigned to {selectedDomain}. Click above to onboard one for the 10–15 day module.
            </p>
          )}
        </div>

      </div>

      {/* Onboard Trainer Modal */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1">Onboard Visiting Trainer</h3>
            <p className="text-xs text-slate-400 mb-4">Assign an instructor for the 10–15 day active training window in {selectedDomain}.</p>

            <form onSubmit={handleOnboardTrainer} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Trainer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Sharma"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. trainer@academy.org"
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1">Company / Academy</label>
                <input
                  type="text"
                  placeholder="e.g. SkillMatrix Solutions"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">End Date (15 Days)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition"
                >
                  Grant Temporary Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
