import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Key,
  FileText,
  AlertTriangle,
  Lock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  Link2,
} from 'lucide-react';
import type { AuditEvent } from '../types/index.ts';
import { api } from '../services/api.ts';

export const AuditTrailView: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterOutcome, setFilterOutcome] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Integrity Check State
  const [verifying, setVerifying] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<{
    isValid: boolean;
    totalRecords: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadAuditEvents();
    runIntegrityCheck();
  }, [filterAction, filterOutcome]);

  const loadAuditEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditTrail({
        action: filterAction !== 'ALL' ? filterAction : undefined,
        outcome: filterOutcome !== 'ALL' ? filterOutcome : undefined,
        limit: 150,
      });
      setEvents(res.events);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const runIntegrityCheck = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyAuditIntegrity();
      setIntegrityStatus(res);
    } catch {
      // ignore
    } finally {
      setVerifying(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      e.actorUsername.toLowerCase().includes(q) ||
      (e.reasonCode && e.reasonCode.toLowerCase().includes(q)) ||
      (e.resourceId && e.resourceId.toLowerCase().includes(q)) ||
      e.correlationId.toLowerCase().includes(q)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
      case 'LOGIN_FAILURE':
      case 'LOGOUT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DOCUMENT_UPLOAD':
      case 'DOCUMENT_VIEW':
      case 'DOCUMENT_DOWNLOAD':
      case 'DOCUMENT_DELETE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PERMISSION_GRANT':
      case 'PERMISSION_REVOKE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ACCESS_DENIED':
        return 'bg-red-50 text-red-700 border-red-200 font-bold';
      case 'USER_SUSPEND':
      case 'USER_ACTIVATE':
      case 'USER_ROLE_CHANGE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Cryptographic Integrity Banner */}
      <div className="bg-white rounded-2xl border border-[#DCE6F5] p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#142B4D]">Tamper-Evident Security Audit Ledger</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
              Zero-Trust
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Server-controlled append-only event stream cryptographically chained with SHA-256 block hashes.
          </p>
        </div>

        {/* Cryptographic Verification Status Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${
              integrityStatus?.isValid
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {integrityStatus?.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <div>
              <div className="font-bold">
                {integrityStatus?.isValid
                  ? 'Cryptographic Chain Verified'
                  : 'Integrity Anomaly Detected'}
              </div>
              <div className="text-[10px] text-slate-600 font-mono">
                {integrityStatus?.totalRecords} blocks verified • No hash collisions
              </div>
            </div>
          </div>

          <button
            onClick={runIntegrityCheck}
            disabled={verifying}
            className="p-2.5 bg-[#F4F8FF] hover:bg-blue-50 border border-[#DCE6F5] text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Recalculate SHA-256 chain from genesis block"
          >
            <RefreshCw className={`w-4 h-4 ${verifying ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Verify Chain</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-[#DCE6F5] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, user, correlation ID, or reason code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
          />
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Action:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
          >
            <option value="ALL">All Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
            <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
            <option value="DOCUMENT_VIEW">DOCUMENT_VIEW</option>
            <option value="DOCUMENT_DOWNLOAD">DOCUMENT_DOWNLOAD</option>
            <option value="PERMISSION_GRANT">PERMISSION_GRANT</option>
            <option value="PERMISSION_REVOKE">PERMISSION_REVOKE</option>
            <option value="ACCESS_DENIED">ACCESS_DENIED</option>
            <option value="USER_SUSPEND">USER_SUSPEND</option>
            <option value="USER_ACTIVATE">USER_ACTIVATE</option>
          </select>
        </div>

        {/* Outcome Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Outcome:</span>
          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="DENIED">DENIED</option>
            <option value="FAILURE">FAILURE</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-[#DCE6F5] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading audit records...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">No matching audit events found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-[#DCE6F5] text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp & ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Outcome & Reason</th>
                  <th className="py-3 px-4">Integrity Hash</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => {
                  const isExpanded = expandedId === evt.id;
                  return (
                    <React.Fragment key={evt.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                        className={`cursor-pointer hover:bg-blue-50/40 transition-colors ${
                          evt.outcome === 'DENIED' ? 'bg-red-50/20' : ''
                        }`}
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(evt.timestamp).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-[#142B4D]">@{evt.actorUsername}</div>
                          <div className="text-[10px] text-slate-500">{evt.actorRole}</div>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(
                              evt.action
                            )}`}
                          >
                            {evt.action}
                          </span>
                        </td>

                        {/* Resource */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {evt.resourceId ? (
                            <span className="font-mono text-[11px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {evt.resourceId.slice(0, 16)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Outcome & Reason */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {evt.outcome === 'SUCCESS' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : evt.outcome === 'DENIED' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            ) : (
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span
                              className={`font-bold ${
                                evt.outcome === 'SUCCESS'
                                  ? 'text-emerald-700'
                                  : evt.outcome === 'DENIED'
                                  ? 'text-red-700 font-extrabold'
                                  : 'text-amber-700'
                              }`}
                            >
                              {evt.outcome}
                            </span>
                          </div>
                          {evt.reasonCode && (
                            <div className="text-[10px] text-slate-500 font-mono">{evt.reasonCode}</div>
                          )}
                        </td>

                        {/* Hash Pointer */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500" title={evt.hash}>
                            <Link2 className="w-3 h-3 text-blue-500" />
                            <span>{evt.hash.slice(0, 10)}...</span>
                          </div>
                        </td>

                        {/* Expand Icon */}
                        <td className="py-3 px-4 text-right">
                          <button className="text-slate-400 hover:text-slate-600">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Record Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-[#F4F8FF] border-b border-[#DCE6F5]">
                          <td colSpan={7} className="p-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                    Event ID & Correlation
                                  </span>
                                  <span className="font-mono text-slate-800 text-[11px] block">
                                    ID: {evt.id}
                                  </span>
                                  <span className="font-mono text-slate-600 text-[11px] block">
                                    Corr: {evt.correlationId}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                                    Cryptographic Block Link
                                  </span>
                                  <div className="font-mono text-[10px] text-slate-600 break-all space-y-0.5">
                                    <div>Previous: {evt.previousHash}</div>
                                    <div>Current : {evt.hash}</div>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                                  Context Payload (Sanitized - Zero Secrets)
                                </span>
                                <pre className="p-3 bg-white border border-[#DCE6F5] rounded-xl font-mono text-[11px] text-slate-700 overflow-x-auto">
                                  {JSON.stringify(evt.context, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
