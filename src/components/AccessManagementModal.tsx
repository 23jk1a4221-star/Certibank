import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  UserCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Clock,
  KeyRound,
  Eye,
  Download,
  Shield,
} from 'lucide-react';
import type { VaultDocument, DocumentPermissionGrant, PermissionLevel } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AccessManagementModalProps {
  document: VaultDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onGrantsUpdated?: () => void;
}

export const AccessManagementModal: React.FC<AccessManagementModalProps> = ({
  document,
  isOpen,
  onClose,
  onGrantsUpdated,
}) => {
  const [grants, setGrants] = useState<DocumentPermissionGrant[]>([]);
  const [recipientUsername, setRecipientUsername] = useState('viewer_auditor');
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionLevel[]>(['VIEW']);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      loadGrants();
    }
  }, [isOpen, document]);

  const loadGrants = async () => {
    if (!document) return;
    setIsLoading(true);
    try {
      const res = await api.getDocumentGrants(document.id);
      setGrants(res.grants);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !document) return null;

  const togglePermission = (level: PermissionLevel) => {
    if (selectedPermissions.includes(level)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== level));
    } else {
      setSelectedPermissions([...selectedPermissions, level]);
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!recipientUsername.trim()) {
      setError('Recipient username is required.');
      return;
    }
    if (selectedPermissions.length === 0) {
      setError('Select at least one permission level (VIEW, DOWNLOAD, or MANAGE_ACCESS).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.grantPermission({
        documentId: document.id,
        recipientUsername: recipientUsername.trim(),
        permissions: selectedPermissions,
        expiresAt: expiresAt || undefined,
      });

      setSuccessMsg(res.message);
      await loadGrants();
      if (onGrantsUpdated) onGrantsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to grant document permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (grantId: string, recipientName: string) => {
    if (!confirm(`Are you sure you want to revoke vault access from @${recipientName}? Access will be terminated immediately.`)) {
      return;
    }

    setError(null);
    try {
      const res = await api.revokePermission(grantId);
      setSuccessMsg(res.message);
      await loadGrants();
      if (onGrantsUpdated) onGrantsUpdated();
    } catch (err: any) {
      setError(err.message || 'Revocation failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#DCE6F5] relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#142B4D]">Document Access & Granular Permissions</h3>
            <p className="text-xs text-[#64748B] truncate max-w-md">
              {document.title}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 mb-4 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 mb-4 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Grant New Permission Form */}
        <form onSubmit={handleGrant} className="p-4 bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl mb-6 space-y-4">
          <div className="text-xs font-bold text-[#142B4D] uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-blue-600" />
            <span>Grant Access to Registered Vault User</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Recipient Username *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={recipientUsername}
                  onChange={(e) => setRecipientUsername(e.target.value)}
                  placeholder="e.g. viewer_auditor"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE6F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
                />
                <button
                  type="button"
                  onClick={() => setRecipientUsername('viewer_auditor')}
                  className="px-2 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold rounded-lg shrink-0"
                  title="Autofill viewer test account"
                >
                  Auditor
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expiration Timestamp (Optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#DCE6F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
              />
            </div>
          </div>

          {/* Granular Permission Toggles */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              Allowed Permission Levels (ABAC Gates)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  selectedPermissions.includes('VIEW')
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes('VIEW')}
                  onChange={() => togglePermission('VIEW')}
                  className="rounded text-blue-600"
                />
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>VIEW</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  selectedPermissions.includes('DOWNLOAD')
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes('DOWNLOAD')}
                  onChange={() => togglePermission('DOWNLOAD')}
                  className="rounded text-blue-600"
                />
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>DOWNLOAD</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  selectedPermissions.includes('MANAGE_ACCESS')
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes('MANAGE_ACCESS')}
                  onChange={() => togglePermission('MANAGE_ACCESS')}
                  className="rounded text-blue-600"
                />
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>MANAGE</span>
              </label>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Notice: VIEW does not grant DOWNLOAD. VIEW does not grant MANAGE. Each privilege is verified independently on every request.
            </p>
          </div>

          <div className="text-right pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Authorizing...' : 'Save & Authorize Grant'}
            </button>
          </div>
        </form>

        {/* Existing Active Grants Table */}
        <div>
          <h4 className="text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-2">
            Active Sharing Grants & Authorization Audit
          </h4>

          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-500">Loading grants...</div>
          ) : grants.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
              No explicit sharing grants issued for this document. Access is sealed exclusively to owner.
            </div>
          ) : (
            <div className="border border-[#DCE6F5] rounded-xl overflow-hidden divide-y divide-slate-100">
              {grants.map((g) => (
                <div key={g.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#142B4D]">@{g.recipientUsername}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          g.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      {g.permissions.map((p) => (
                        <span
                          key={p}
                          className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold"
                        >
                          {p}
                        </span>
                      ))}
                      {g.expiresAt && (
                        <span className="text-[10px] text-amber-600 flex items-center gap-0.5 font-medium">
                          <Clock className="w-3 h-3" /> Exp: {new Date(g.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {g.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleRevoke(g.id, g.recipientUsername)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 flex items-center gap-1 transition-colors"
                      title="Revoke access immediately"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revocation Limitation Notice */}
        <div className="mt-5 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Revocation Security Contract:</strong> Revocation terminates cloud vault access immediately on the next protected streaming or download request. Note that revocation cannot physically delete copies that recipients have already saved to their local devices.
          </div>
        </div>
      </div>
    </div>
  );
};
