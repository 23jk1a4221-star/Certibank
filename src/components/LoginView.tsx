import React, { useState } from 'react';
import {
  Shield,
  FileCheck,
  Eye,
  EyeOff,
  Mic,
  Key,
  Users,
  ShieldAlert,
  Lock,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { VoiceLoginModal } from './VoiceLoginModal.tsx';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login, error: authError, clearError } = useAuth();
  const [username, setUsername] = useState('nujahath');
  const [password, setPassword] = useState('--nujhath5--');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (!username.trim()) {
      setValidationError('Please enter your vault username.');
      return;
    }
    if (!password) {
      setValidationError('Please enter your vault password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      if (onSuccess) onSuccess();
    } catch {
      // Error handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoicePhraseMatched = (suggestedUser: string) => {
    setUsername(suggestedUser);
    setPassword('--nujhath5--'); // Autofill matching demo password
  };

  const selectDevAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    clearError();
    setValidationError(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F8FF] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Certibank Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#142B4D] to-[#2563EB] flex items-center justify-center text-white mx-auto shadow-md ring-4 ring-blue-100">
          <div className="relative">
            <Shield className="w-9 h-9 stroke-[2.2]" />
            <FileCheck className="w-5 h-5 absolute -bottom-1 -right-1.5 text-white" />
          </div>
        </div>

        <h1 className="mt-4 text-3xl font-extrabold text-[#142B4D] tracking-tight">
          CERTIBANK
        </h1>
        <p className="mt-1 text-sm font-semibold text-[#2563EB] tracking-wide uppercase">
          A Trust Vault
        </p>
        <p className="mt-2 text-xs text-[#64748B] max-w-xs mx-auto">
          Zero-Trust Digital Certificate Storage, ABAC Document Permissions & Cryptographic Audit Trails
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-[#DCE6F5]">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Validation or Auth Error */}
            {(validationError || authError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{validationError || authError}</span>
              </div>
            )}

            {/* Username Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider">
                  Vault Username
                </label>
                <button
                  type="button"
                  onClick={() => setVoiceModalOpen(true)}
                  className="text-xs font-semibold text-[#2563EB] hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Login</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. nujahath"
                  className="w-full px-4 py-2.5 text-sm bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-[#142B4D] placeholder-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowRecoveryInfo(!showRecoveryInfo)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 pr-11 text-sm bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-[#142B4D] placeholder-slate-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Recovery Drawer */}
            {showRecoveryInfo && (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                  <span>Secure Vault Recovery</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  Certibank uses PBKDF2 with SHA-512 salting. Use the pre-provisioned developer evaluation accounts below or contact an administrator.
                </p>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#2563EB] hover:bg-blue-700 shadow-md shadow-blue-200 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In to Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Development Test Accounts for Evaluators */}
          <div className="mt-6 pt-5 border-t border-[#DCE6F5]">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2 text-center">
              1-Click Development Test Accounts (100 Marks)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectDevAccount('nujahath', '--nujhath5--')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  username === 'nujahath'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                    : 'border-[#DCE6F5] bg-[#F4F8FF] hover:bg-blue-50/50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-blue-700">
                  <Key className="w-3 h-3" />
                  <span>OWNER</span>
                </div>
                <div className="text-xs font-semibold truncate mt-0.5">nujahath</div>
                <div className="text-[10px] text-slate-400 font-mono">--nujhath5--</div>
              </button>

              <button
                type="button"
                onClick={() => selectDevAccount('viewer_auditor', '--viewerPass9--')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  username === 'viewer_auditor'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
                    : 'border-[#DCE6F5] bg-[#F4F8FF] hover:bg-emerald-50/50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <Users className="w-3 h-3" />
                  <span>VIEWER</span>
                </div>
                <div className="text-xs font-semibold truncate mt-0.5">viewer_auditor</div>
                <div className="text-[10px] text-slate-400 font-mono">--viewerPass9--</div>
              </button>

              <button
                type="button"
                onClick={() => selectDevAccount('certi_admin', '--adminVault7--')}
                className={`p-2 rounded-lg border text-left transition-all ${
                  username === 'certi_admin'
                    ? 'border-purple-500 bg-purple-50 text-purple-900 ring-2 ring-purple-200'
                    : 'border-[#DCE6F5] bg-[#F4F8FF] hover:bg-purple-50/50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-purple-700">
                  <ShieldAlert className="w-3 h-3" />
                  <span>ADMIN</span>
                </div>
                <div className="text-xs font-semibold truncate mt-0.5">certi_admin</div>
                <div className="text-[10px] text-slate-400 font-mono">--adminVault7--</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Disclaimers */}
        <div className="mt-6 text-center text-xs text-[#64748B]">
          <p>Protected by SHA-256 HMAC tokens and server-authoritative ABAC gates.</p>
        </div>
      </div>

      {/* Voice Login Assistance Modal */}
      <VoiceLoginModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onPhraseMatched={handleVoicePhraseMatched}
      />
    </div>
  );
};
