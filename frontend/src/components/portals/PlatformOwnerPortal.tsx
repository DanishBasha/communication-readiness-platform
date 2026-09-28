import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { College, PendingInvite } from '../../types';
import { 
  Building2, 
  Plus, 
  Send, 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Users, 
  Layers, 
  ShieldCheck, 
  Sparkles,
  AlertCircle,
  X,
  Search,
  Globe
} from 'lucide-react';

export const PlatformOwnerPortal: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [stats, setStats] = useState({
    totalColleges: 0,
    activeSuperAdmins: 0,
    totalStudents: 0,
    totalPrograms: 0
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [addCollegeModalOpen, setAddCollegeModalOpen] = useState(false);
  const [inviteAdminModalOpen, setInviteAdminModalOpen] = useState(false);
  const [selectedCollegeForInvite, setSelectedCollegeForInvite] = useState<string>('');

  // Add College Form
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeCode, setNewCollegeCode] = useState('');
  const [newCollegeCity, setNewCollegeCity] = useState('');

  // Invite Super Admin Form
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  // Generated Link Card
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [latestInviteDetails, setLatestInviteDetails] = useState<PendingInvite | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [colList, st, invList] = await Promise.all([
        api.owner.getColleges(),
        api.owner.getStats(),
        api.invites.getAll()
      ]);
      setColleges(colList);
      setStats(st);
      setPendingInvites(invList.filter(inv => inv.role === 'SUPER_ADMIN'));
    } catch (err: any) {
      console.error('Error loading platform owner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName.trim() || !newCollegeCode.trim() || !newCollegeCity.trim()) {
      setFeedback({ type: 'error', message: 'Please fill in all college details.' });
      return;
    }
    try {
      const created = await api.owner.createCollege({
        name: newCollegeName.trim(),
        code: newCollegeCode.trim(),
        campusCity: newCollegeCity.trim()
      });
      setFeedback({ type: 'success', message: `Institution '${created.name}' created successfully!` });
      setNewCollegeName('');
      setNewCollegeCode('');
      setNewCollegeCity('');
      setAddCollegeModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to create college.' });
    }
  };

  const handleInviteSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollegeForInvite || !adminFirstName.trim() || !adminEmail.trim()) {
      setFeedback({ type: 'error', message: 'Please select a college and enter the Super Admin name and email.' });
      return;
    }
    try {
      const res = await api.owner.inviteSuperAdmin(selectedCollegeForInvite, {
        firstName: adminFirstName.trim(),
        lastName: adminLastName.trim(),
        email: adminEmail.trim()
      });
      setLatestInviteUrl(res.inviteUrl);
      setLatestInviteDetails(res.invite);
      setFeedback({ 
        type: 'success', 
        message: `Activation link generated for ${res.invite.name} (${res.invite.email})!` 
      });
      setAdminFirstName('');
      setAdminLastName('');
      setAdminEmail('');
      setInviteAdminModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to dispatch invitation.' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredColleges = colleges.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.campusCity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Header Banner */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Globe className="w-3.5 h-3.5" />
            <span>Platform Owner Control Plane</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Institutional Tenants & Super Admins
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-2xl">
            Create participating colleges, provision their institutional Super Admins, and dispatch password-creation activation invitations. Super Admins will define their own dynamic training tracks and departments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setAddCollegeModalOpen(true)}
            className="px-4 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add College</span>
          </button>
          <button
            onClick={() => {
              if (colleges.length > 0) setSelectedCollegeForInvite(colleges[0].id);
              setInviteAdminModalOpen(true);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Invite Super Admin</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between animate-in slide-in-from-top-2 text-xs font-medium ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-neutral-400 hover:text-neutral-700 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Invitation Link Alert (Simulated Email Dispatch) */}
      {latestInviteUrl && latestInviteDetails && (
        <div className="p-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-900 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Activation Email Link Dispatched to {latestInviteDetails.email}</span>
            </div>
            <button 
              onClick={() => setLatestInviteUrl(null)}
              className="text-neutral-400 hover:text-neutral-700 text-xs p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-neutral-600 leading-relaxed">
            In an active SMTP environment, an email is dispatched containing this link. As platform owner, you can test the activation flow immediately or copy this URL to share with the Super Admin:
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input 
              readOnly 
              value={latestInviteUrl} 
              className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-2 text-xs font-mono text-neutral-700 select-all"
            />
            <button
              onClick={() => copyToClipboard(latestInviteUrl)}
              className="px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
            <a
              href={latestInviteUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Test Activation Screen</span>
            </a>
          </div>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Registered Colleges</span>
            <Building2 className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.totalColleges}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Multi-tenant institutional nodes</div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">College Super Admins</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.activeSuperAdmins}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Active institutional heads</div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Enrolled Candidates</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.totalStudents}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Across all participating campuses</div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 mb-2">
            <span className="text-xs font-medium">Dynamic Programs</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">{stats.totalPrograms}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Defined by institutional admins</div>
        </div>
      </div>

      {/* Colleges Directory Table */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Institutions &amp; College Super Admins</h2>
            <p className="text-xs text-neutral-500">List of colleges onboarded to the SaaS platform</p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search college, code, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-neutral-900 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200/80 bg-neutral-50/70 text-neutral-500 font-medium">
                <th className="py-3.5 px-5">Institution Name &amp; Code</th>
                <th className="py-3.5 px-5">Campus Location</th>
                <th className="py-3.5 px-5">Assigned Super Admin</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {filteredColleges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-neutral-400">
                    No colleges match your search criteria. Click "Add College" above to register a new tenant.
                  </td>
                </tr>
              ) : (
                filteredColleges.map((col) => (
                  <tr key={col.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-semibold text-neutral-900 text-sm">{col.name}</div>
                      <div className="text-[11px] font-mono text-neutral-400">{col.code}</div>
                    </td>
                    <td className="py-4 px-5 text-neutral-600">
                      {col.campusCity}
                    </td>
                    <td className="py-4 px-5">
                      {col.superAdminEmail ? (
                        <div>
                          <div className="font-medium text-neutral-800">{col.superAdminName || 'Super Admin'}</div>
                          <div className="text-[11px] font-mono text-neutral-500">{col.superAdminEmail}</div>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">No Super Admin assigned yet</span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      {col.superAdminStatus === 'ACTIVE' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                        </span>
                      ) : col.superAdminEmail ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 mr-1" /> Invite Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => {
                          setSelectedCollegeForInvite(col.id);
                          setInviteAdminModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        {col.superAdminEmail ? 'Re-invite / Change Admin' : 'Assign Super Admin'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add College Modal */}
      {addCollegeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-neutral-900" />
                <h3 className="text-sm font-semibold text-neutral-900">Add New Institutional College</h3>
              </div>
              <button 
                onClick={() => setAddCollegeModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollege} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">College Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. St. Joseph's College of Engineering"
                  value={newCollegeName}
                  onChange={(e) => setNewCollegeName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Institutional Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SJCE-3118"
                  value={newCollegeCode}
                  onChange={(e) => setNewCollegeCode(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono uppercase focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Campus City / Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chennai, Tamil Nadu"
                  value={newCollegeCity}
                  onChange={(e) => setNewCollegeCity(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-500 leading-relaxed">
                Once added, you can dispatch an invitation to this college's Super Admin. The Super Admin will define their custom departments and dynamic training programs.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddCollegeModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium"
                >
                  Create College
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Super Admin Modal */}
      {inviteAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-neutral-900">Provision College Super Admin</h3>
              </div>
              <button 
                onClick={() => setInviteAdminModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSuperAdmin} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Target College *</label>
                <select
                  value={selectedCollegeForInvite}
                  onChange={(e) => setSelectedCollegeForInvite(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Rajesh"
                    value={adminFirstName}
                    onChange={(e) => setAdminFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Nair"
                    value={adminLastName}
                    onChange={(e) => setAdminLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Valid Institutional Email ID *</label>
                <input
                  type="email"
                  required
                  placeholder="superadmin@college.edu"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono focus:outline-none focus:border-neutral-900"
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  * This email address will strictly be the Super Admin's permanent User ID.
                </span>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                <span className="font-semibold">Security Protocol: </span>
                You will not assign any password. An invitation email with a secure token link will be dispatched to this email. Through this link, the Super Admin will create their own private password.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setInviteAdminModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-xs"
                >
                  Generate &amp; Dispatch Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
