import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  ShieldCheck,
  UserX,
  UserCheck,
  AlertTriangle,
  Activity,
  Key,
  Database,
  Lock,
  Search,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { User, UserRole, AccountStatus } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

export const AdminDashboardView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [usersList, setUsersList] = useState<User[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminStats(),
      ]);
      setUsersList(usersRes.users);
      setStats(statsRes);
    } catch (err: any) {
      setActionError(err.message || 'Administrative operations restricted.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      setActionError('Self-protection: You cannot suspend your own administrative session.');
      return;
    }

    const nextStatus: AccountStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Confirm action: Change status of @${user.username} to ${nextStatus}?`)) {
      return;
    }

    try {
      const res = await api.updateUserStatus(user.id, nextStatus);
      setActionMessage(res.message);
      await loadAdminData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleChangeRole = async (user: User, newRole: string) => {
    if (user.id === currentUser?.id) {
      setActionError('Self-promotion/demotion guard: You cannot modify your own administrative role.');
      return;
    }

    try {
      const res = await api.updateUserRole(user.id, newRole);
      setActionMessage(res.message);
      await loadAdminData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Admin Warning Banner */}
      <div className="bg-purple-900 text-white rounded-2xl p-6 shadow-md border border-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-purple-300" />
            <h2 className="text-xl font-bold tracking-tight">System Administration & Security Governance</h2>
          </div>
          <p className="text-xs text-purple-200 mt-1 max-w-xl">
            Strict Zero-Trust Rule: Administrators oversee authentication identities, monitor authorization anomalies, and audit integrity. Administrators have NO automated backdoor access to private certificate contents.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="p-2.5 bg-purple-800 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Governance State</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Admin Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Registered Identities</span>
          <div className="text-2xl font-extrabold text-[#142B4D] mt-1">{stats?.totalUsers || 0}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1">
            {stats?.activeUsers || 0} active • {stats?.suspendedUsers || 0} suspended
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Sealed Documents</span>
          <div className="text-2xl font-extrabold text-[#142B4D] mt-1">{stats?.totalDocs || 0}</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">100% private store</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Active Sharing Grants</span>
          <div className="text-2xl font-extrabold text-[#142B4D] mt-1">{stats?.activeGrants || 0}</div>
          <div className="text-[11px] text-purple-600 font-semibold mt-1">ABAC verified</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <span className="text-[11px] font-bold text-[#64748B] uppercase">Security Events</span>
          <div className="text-2xl font-extrabold text-[#142B4D] mt-1">{stats?.securityIncidents || 0}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-1">
            {stats?.totalAuditRecords || 0} total ledger events
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-white rounded-2xl border border-[#DCE6F5] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#142B4D]">Vault User Identities & Access Control</h3>
            <p className="text-xs text-[#64748B]">Manage accounts, update trusted roles, and enforce instant suspensions.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </div>

        {/* User Table */}
        <div className="border border-[#DCE6F5] rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-[#DCE6F5] text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isCurrent = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-[#142B4D]">{u.displayName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">@{u.username}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                          {u.role} (Current)
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value)}
                          className="px-2 py-1 text-xs bg-[#F4F8FF] border border-[#DCE6F5] rounded-lg font-semibold text-slate-800"
                        >
                          <option value="OWNER">OWNER</option>
                          <option value="VIEWER">VIEWER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString() : 'Never'}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {!isCurrent && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'text-red-700 border-red-200 hover:bg-red-50'
                              : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
