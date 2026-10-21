import React from 'react';
import {
  FileText,
  Landmark,
  GraduationCap,
  Award,
  BookOpen,
  Share2,
  Users,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { VaultDocument, SecurityStats, PermissionLevel } from '../types/index.ts';
import { DocumentCard } from './DocumentCard.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface DashboardOverviewProps {
  documents: Array<VaultDocument & { permissions?: PermissionLevel[] }>;
  stats: SecurityStats | null;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onUnlockDocument: (doc: VaultDocument) => void;
  onShareDocument: (doc: VaultDocument) => void;
  onDeleteDocument: (doc: VaultDocument) => void;
  onOpenUpload: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  documents,
  stats,
  selectedCategory,
  onSelectCategory,
  onUnlockDocument,
  onShareDocument,
  onDeleteDocument,
  onOpenUpload,
  onRefresh,
  isLoading,
  searchQuery,
  onSearchChange,
}) => {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-[#142B4D] via-[#1E3A8A] to-[#2563EB] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-white/20 text-white">
              Role: {user?.role}
            </span>
            <span className="text-xs text-blue-200">
              Verified Session • Cryptographic Zero-Trust Active
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1">
            Welcome to Certibank, {user?.displayName}
          </h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            Your tamper-evident trust vault protects digital civil credentials, academic parchments, and industry certifications with ephemeral streaming and granular ABAC controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isOwner && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-white text-[#142B4D] hover:bg-blue-50 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-[#2563EB]" />
              <span>Deposit Certificate</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Refresh vault records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">All Documents</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-[#142B4D] mt-1">{stats?.totalCertificates ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Sealed in Vault</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Government</span>
            <Landmark className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-[#142B4D] mt-1">{stats?.governmentCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Civil Registrations</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Educational</span>
            <GraduationCap className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-extrabold text-[#142B4D] mt-1">{stats?.educationalCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Degrees & School</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Professional</span>
            <Award className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-[#142B4D] mt-1">{stats?.professionalCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Industry Badges</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Shared Access</span>
            <Share2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-extrabold text-[#142B4D] mt-1">{stats?.activeGrantsCount ?? 0}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active Grants</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#DCE6F5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Tamper Chain</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">VERIFIED</div>
          <div className="text-[10px] text-slate-400 mt-0.5">SHA-256 Ledger</div>
        </div>
      </div>

      {/* Category Filter Pills & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Vault Certificates' },
            { id: 'GOVERNMENT', label: 'Government' },
            { id: 'EDUCATIONAL', label: 'Educational' },
            { id: 'PROFESSIONAL', label: 'Professional' },
            { id: 'COURSES_TRAINING', label: 'Courses' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#DCE6F5]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input for Mobile/Tablet */}
        <div className="relative max-w-xs md:hidden">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search certificates..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#DCE6F5] p-5 h-64 animate-pulse space-y-3"
            >
              <div className="w-24 h-4 bg-slate-200 rounded"></div>
              <div className="w-3/4 h-5 bg-slate-200 rounded"></div>
              <div className="w-1/2 h-4 bg-slate-200 rounded"></div>
              <div className="w-full h-12 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DCE6F5] p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#142B4D]">No Certificates Found</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            No matching documents in this category or search filter. Upload a certificate to deposit it into the trust vault.
          </p>
          {isOwner && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-[#2563EB] text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Deposit Certificate</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onUnlockClick={onUnlockDocument}
              onShareClick={onShareDocument}
              onDeleteClick={onDeleteDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
};
