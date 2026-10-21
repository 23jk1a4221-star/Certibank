import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Calendar,
  Building,
  Tag,
  FileText,
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { VaultDocument } from '../types/index.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDoc: VaultDocument) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GOVERNMENT');
  const [subCategory, setSubCategory] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];

      // Check max 10MB
      if (selected.size > 10 * 1024 * 1024) {
        setError('FILE_OVERSIZED: File size exceeds maximum allowed 10 MB limit.');
        setFile(null);
        return;
      }

      setFile(selected);
      // Auto pre-fill title from filename if title empty
      if (!title) {
        const cleanName = selected.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setTitle(cleanName);
      }
    }
  };

  const handleGenerateSampleFile = () => {
    // Generate sample SVG certificate file for quick testing
    const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%">
      <rect width="800" height="500" fill="#f8fafc" stroke="#2563eb" stroke-width="4" rx="12"/>
      <text x="400" y="80" font-family="Inter, sans-serif" font-size="24" font-weight="bold" fill="#142b4d" text-anchor="middle">CERTIFICATE OF AUTHENTICITY</text>
      <text x="400" y="160" font-family="Inter, sans-serif" font-size="20" font-weight="bold" fill="#2563eb" text-anchor="middle">${title || 'Trust Vault Credential'}</text>
      <text x="400" y="240" font-family="Inter, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">Issued by: ${issuer || 'Authorized Verification Board'}</text>
      <text x="400" y="300" font-family="Inter, sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Timestamp: ${new Date().toISOString()}</text>
      <rect x="350" y="380" width="100" height="40" rx="8" fill="#eff6ff" stroke="#2563eb"/>
      <text x="400" y="405" font-family="Inter, sans-serif" font-size="12" font-weight="bold" fill="#2563eb" text-anchor="middle">VERIFIED</text>
    </svg>`;
    const blob = new Blob([sampleSvg], { type: 'image/svg+xml' });
    const dummyFile = new File([blob], `${title ? title.toLowerCase().replace(/\s+/g, '_') : 'certificate'}.svg`, {
      type: 'image/svg+xml',
    });
    setFile(dummyFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!file) {
      setError('Please select a certificate file (PDF, PNG, JPG, or SVG).');
      return;
    }
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }
    if (!issuer.trim()) {
      setError('Issuing authority is required.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('category', category);
      if (subCategory) formData.append('subCategory', subCategory.trim());
      formData.append('issuer', issuer.trim());
      if (issueDate) formData.append('issueDate', issueDate);
      if (expiryDate) formData.append('expiryDate', expiryDate);
      if (description) formData.append('description', description.trim());
      if (tags) formData.append('tags', tags);

      const res = await api.uploadDocument(formData);
      setSuccessMsg(res.message);

      setTimeout(() => {
        onUploadSuccess(res.document);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'File upload failed validation on server.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#DCE6F5] relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#142B4D]">Deposit Certificate to Trust Vault</h3>
            <p className="text-xs text-[#64748B]">Zero-trust validation: MIME check, magic bytes inspection & private storage</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Picker Area */}
          <div>
            <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-1.5">
              Certificate File (PDF, PNG, JPG, SVG • Max 10MB)
            </label>
            <div className="border-2 border-dashed border-[#DCE6F5] hover:border-blue-400 rounded-xl p-4 text-center bg-[#F4F8FF] transition-colors relative">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.svg"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <UploadCloud className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              {file ? (
                <div>
                  <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {Math.round(file.size / 1024)} KB • {file.type || 'Custom Format'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-700">Click or drag certificate file to upload</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Strict file signature verification will be enforced</p>
                </div>
              )}
            </div>

            {/* Quick Demo Sample Generator Button */}
            {!file && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={handleGenerateSampleFile}
                  className="text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  + Generate sample synthetic SVG certificate for testing
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Higher Secondary School Marksheet"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
            />
          </div>

          {/* Category & SubCategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
              >
                <option value="GOVERNMENT">Government Certificates</option>
                <option value="EDUCATIONAL">Educational Certificates</option>
                <option value="PROFESSIONAL">Professional Certifications</option>
                <option value="COURSES_TRAINING">Courses and Training</option>
                <option value="CUSTOM">Custom Category</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-1">
                Sub-Classification
              </label>
              <input
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="e.g. University Degrees"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
              />
            </div>
          </div>

          {/* Issuer */}
          <div>
            <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-1">
              Issuing Authority *
            </label>
            <input
              type="text"
              required
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="e.g. Stanford University / Municipal Registrar"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-1">
                Expiry Date (Optional)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-1">
              Search Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. Identity, Graduation, Degree, Verified"
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#DCE6F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#142B4D]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Deposit & Seal in Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
