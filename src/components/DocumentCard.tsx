import React from 'react';
import {
  FileText,
  Lock,
  Download,
  Share2,
  Trash2,
  ShieldCheck,
  Calendar,
  Building,
  Key,
  Eye,
  FileCheck2,
  Award,
  Landmark,
  BookOpen,
} from 'lucide-react';
import type { VaultDocument, PermissionLevel } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface DocumentCardProps {
  document: VaultDocument & { permissions?: PermissionLevel[] };
  onUnlockClick: (doc: VaultDocument) => void;
  onShareClick: (doc: VaultDocument) => void;
  onDeleteClick: (doc: VaultDocument) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onUnlockClick,
  onShareClick,
  onDeleteClick,
}) => {
  const { user } = useAuth();
  const isOwner = user?.id === document.ownerId;
  const canManage = isOwner || document.permissions?.includes('MANAGE_ACCESS');
  const canDownload = isOwner || document.permissions?.includes('DOWNLOAD');

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'GOVERNMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Landmark className="w-3 h-3 text-amber-600" />
            Government
          </span>
        );
      case 'EDUCATIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <BookOpen className="w-3 h-3 text-indigo-600" />
            Educational
          </span>
        );
      case 'PROFESSIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Award className="w-3 h-3 text-blue-600" />
            Professional
          </span>
        );
      case 'COURSES_TRAINING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <FileCheck2 className="w-3 h-3 text-emerald-600" />
            Course & Training
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <FileText className="w-3 h-3 text-slate-600" />
            {category}
          </span>
        );
    }
  };

  const getVerificationBadge = (status: string) => {
    if (status === 'VERIFIED_ISSUER') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          VERIFIED ISSUER
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
        SELF ASSERTED
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#DCE6F5] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {getCategoryBadge(document.category)}
          {getVerificationBadge(document.verificationStatus)}
        </div>

        {/* Certificate Title */}
        <h3 className="font-bold text-sm text-[#142B4D] group-hover:text-[#2563EB] transition-colors line-clamp-2 mb-1.5 leading-snug">
          {document.title}
        </h3>

        {/* SubCategory if present */}
        {document.subCategory && (
          <p className="text-[11px] text-[#64748B] font-medium mb-3">
            {document.subCategory}
          </p>
        )}

        {/* Metadata Details */}
        <div className="space-y-1.5 text-xs text-slate-600 mb-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 truncate">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{document.issuer}</span>
          </div>

          {document.issueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Issued: {document.issueDate}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Owner: @{document.ownerUsername}</span>
          </div>
        </div>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {document.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#F4F8FF] text-[#2563EB] font-medium border border-[#DCE6F5]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Footer & Action Buttons */}
      <div className="pt-3 border-t border-[#DCE6F5] space-y-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">
            {Math.round(document.fileSize / 1024)} KB • {document.mimeType.split('/')[1]?.toUpperCase()}
          </span>

          {/* Permission State Badge */}
          {isOwner ? (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              FULL VAULT ACCESS
            </span>
          ) : (
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
              {canDownload ? 'VIEW + DOWNLOAD' : 'VIEW ONLY'}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Main Unlock Button */}
          <button
            onClick={() => onUnlockClick(document)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Unlock & View</span>
          </button>

          {/* Share Button (Owners and MANAGE_ACCESS) */}
          {canManage && (
            <button
              onClick={() => onShareClick(document)}
              className="p-2 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-colors"
              title="Manage Document Permissions"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* Delete Button (Owner only) */}
          {isOwner && (
            <button
              onClick={() => onDeleteClick(document)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
