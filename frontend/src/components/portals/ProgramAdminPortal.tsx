import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  UserPlus, 
  UserMinus, 
  Calendar, 
  Building
} from 'lucide-react';
import { PEP_DOMAINS } from '../../data/mockData';

export const ProgramAdminPortal: React.FC = () => {
  const { trainerTenures, onboardTrainer, revokeTrainer } = useApp();
  const [selectedDomain, setSelectedDomain] = useState('Cloud Computing & DevOps');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-stone-900">
      
      {/* Header */}
      <div className="bg-white border border-stone-200/90 rounded-[32px] p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono uppercase font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
            Program Domain Admin
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">Track & Domain Administration</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage HOPE Elite / Non-Elite cohorts, 21 PEP Domains, and external visiting trainer tenures.
          </p>
        </div>

        {/* Domain Selector */}
        <div className="bg-stone-50 border border-stone-200 p-2 rounded-2xl">
          <label className="text-[11px] text-stone-400 font-bold px-2 block">Active Domain:</label>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="bg-transparent text-xs font-bold text-stone-900 px-2 py-1 outline-none cursor-pointer"
          >
            <option value="HOPE Elite (DSA & Coding)">★ HOPE Elite (DSA & Coding)</option>
            <option value="HOPE Non-Elite">HOPE Non-Elite</option>
            {PEP_DOMAINS.map(d => (
              <option key={d} value={d}>PEP: {d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Visiting Trainer Tenures Management Card */}
      <div className="bg-white border border-stone-200/90 rounded-[28px] p-7 sm:p-8 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Visiting Trainer Tenures (100-Day Semester Program)</h3>
            <p className="text-xs text-stone-500">External instructors visiting for 10–15 day modules. Revoke access immediately when tenure ends.</p>
          </div>

          <button
            onClick={() => setIsOnboardModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#191C1A] hover:bg-stone-800 text-white font-bold text-xs shadow-md transition"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Onboard Visiting Trainer</span>
          </button>
        </div>

        {/* Trainer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {domainTrainers.length > 0 ? (
            domainTrainers.map((t) => (
              <div key={t.id} className="bg-stone-50 p-6 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">{t.trainerName}</h4>
                    <p className="text-xs text-stone-500">{t.companyOrInstitute}</p>
                    <p className="text-xs text-emerald-700 font-mono mt-0.5">{t.trainerEmail}</p>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                    t.isActive 
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-200' 
                      : 'bg-rose-100 text-rose-900 border-rose-200'
                  }`}>
                    {t.isActive ? 'ACTIVE TENURE' : 'REVOKED'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-600 bg-white p-3 rounded-xl border border-stone-200">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span>Tenure: {t.startDate} to {t.endDate} (15 Days)</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                  <span className="text-[11px] text-stone-400 font-medium">Domain: {t.domain}</span>
                  {t.isActive ? (
                    <button
                      onClick={() => revokeTrainer(t.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Revoke Access</span>
                    </button>
                  ) : (
                    <span className="text-xs text-stone-400 font-mono">Inactive</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-stone-400 py-6 col-span-2 text-center">
              No external trainers currently assigned to {selectedDomain}. Click above to onboard one for the 10–15 day module.
            </p>
          )}
        </div>

      </div>

      {/* Onboard Trainer Modal */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 w-full max-w-md rounded-[28px] p-7 shadow-2xl relative text-stone-900">
            <h3 className="text-lg font-black text-stone-900 mb-1">Onboard Visiting Trainer</h3>
            <p className="text-xs text-stone-500 mb-4">Assign an instructor for the 10–15 day active training window in {selectedDomain}.</p>

            <form onSubmit={handleOnboardTrainer} className="space-y-3.5">
              <div>
                <label className="text-xs text-stone-700 font-bold block mb-1">Trainer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Sharma"
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="text-xs text-stone-700 font-bold block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. trainer@academy.org"
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div>
                <label className="text-xs text-stone-700 font-bold block mb-1">Company / Academy</label>
                <input
                  type="text"
                  placeholder="e.g. SkillMatrix Solutions"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-stone-700 font-bold block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-700 font-bold block mb-1">End Date (15 Days)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#191C1A] hover:bg-stone-800 text-white font-bold text-xs transition"
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
