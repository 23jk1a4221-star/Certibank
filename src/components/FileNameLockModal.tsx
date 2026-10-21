import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, AlertCircle, X, ShieldCheck, ArrowRight } from 'lucide-react';
import type { VaultDocument } from '../types/index.ts';
import { api } from '../services/api.ts';

interface FileNameLockModalProps {
  document: VaultDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: (document: VaultDocument, streamToken: string, canDownload: boolean) => void;
}

export const FileNameLockModal: React.FC<FileNameLockModalProps> = ({
  document,
  isOpen,
  onClose,
  onUnlocked,
}) => {
  const [enteredName, setEnteredName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !document) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!enteredName.trim()) {
      setError('Please enter the exact document name to unlock.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.unlockDocument(document.id, enteredName.trim());
      if (res.unlocked) {
        onUnlocked(document, res.streamToken, res.canDownload);
        onClose();
        setEnteredName('');
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect document name. Access remains sealed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const autofillNameForDemo = () => {
    setEnteredName(document.title);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DCE6F5] relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-200 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#142B4D]">File-Name Lock Verification</h3>
          <p className="text-xs text-[#64748B] mt-1">
            Extra layer of document confirmation required before decrypting vault stream.
          </p>
        </div>

        {/* Prompt Card */}
        <div className="p-4 bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl mb-5 text-center">
          <p className="text-sm font-bold text-[#142B4D]">
            "Enter the exact document name to unlock this certificate."
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            Issuer: <span className="font-semibold text-slate-800">{document.issuer}</span> • Category: <span className="font-semibold text-slate-800">{document.category}</span>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 mb-4 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-1.5">
              Exact Document Name
            </label>
            <input
              type="text"
              autoFocus
              required
              value={enteredName}
              onChange={(e) => setEnteredName(e.target.value)}
              placeholder="e.g. Date of Birth Registration Certificate"
              className="w-full px-4 py-2.5 text-sm bg-white border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D] placeholder-slate-400 font-medium"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={autofillNameForDemo}
              className="text-[#2563EB] hover:text-blue-800 font-medium underline flex items-center gap-1"
              title="Click to copy title for testing"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Autofill title for test evaluation</span>
            </button>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Security Protocol:</strong> Knowing the title alone does not grant access. The backend independently verifies active session, ownership or unexpired sharing grant, and role permissions.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Certificate</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
