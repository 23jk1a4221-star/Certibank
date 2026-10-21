import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Calendar,
  Building,
  Hash,
  Lock,
  UserCheck,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
} from 'lucide-react';
import type { VaultDocument } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

interface DocumentViewerModalProps {
  document: VaultDocument | null;
  streamToken: string | null;
  canDownload: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpenSharing?: (doc: VaultDocument) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  streamToken,
  canDownload,
  isOpen,
  onClose,
  onOpenSharing,
}) => {
  const { user } = useAuth();
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && document && streamToken) {
      setIsLoading(true);
      setDownloadError(null);
      const url = api.getStreamUrl(document.id, streamToken);
      setStreamUrl(url);
    }
  }, [isOpen, document, streamToken]);

  if (!isOpen || !document) return null;

  const handleDownload = async () => {
    if (!canDownload) {
      setDownloadError('DOWNLOAD_PERMISSION_DENIED: Your current grant is restricted to VIEW only.');
      return;
    }

    setDownloading(true);
    setDownloadError(null);
    try {
      await api.downloadDocument(document.id, document.originalFileName);
    } catch (err: any) {
      setDownloadError(err.message || 'Download was denied by server authorization.');
    } finally {
      setDownloading(false);
    }
  };

  const isOwner = user?.id === document.ownerId;
  const isImageOrSvg = document.mimeType.startsWith('image/') || document.mimeType === 'image/svg+xml';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl border border-[#DCE6F5] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-[#DCE6F5] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center border border-blue-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#142B4D] truncate max-w-md">
                  {document.title}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  UNLOCKED
                </span>
              </div>
              <p className="text-xs text-[#64748B]">
                {document.issuer} • {document.category} • {Math.round(document.fileSize / 1024)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Button */}
            {canDownload ? (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                title="Download verified certificate"
              >
                {downloading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download</span>
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl border border-slate-200 cursor-not-allowed"
                title="VIEW permission granted. Download permission is restricted."
              >
                <Lock className="w-3.5 h-3.5" />
                <span>View-Only (Download Restricted)</span>
              </div>
            )}

            {/* Manage Access Button (Owner only) */}
            {isOwner && onOpenSharing && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSharing(document);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Manage Access</span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="bg-red-50 px-6 py-2 border-b border-red-200 text-xs text-red-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Content Viewer Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Document Canvas */}
          <div className="flex-1 bg-slate-100 relative overflow-auto flex items-center justify-center p-6">
            {/* Zero-Trust Watermark Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-wrap items-center justify-around opacity-[0.04] select-none text-slate-900 font-extrabold text-2xl rotate-[-25deg] overflow-hidden z-20">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="p-12 text-center">
                  <div>CERTIBANK VAULT</div>
                  <div className="text-sm font-mono">{user?.username} • {new Date().toISOString().slice(0, 10)}</div>
                </div>
              ))}
            </div>

            {/* Document Render Element */}
            {streamUrl ? (
              <div
                className="relative bg-white shadow-xl rounded-xl overflow-hidden max-w-full max-h-full transition-transform duration-200 border border-[#DCE6F5]"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
              >
                {isImageOrSvg ? (
                  <img
                    src={streamUrl}
                    alt={document.title}
                    onLoad={() => setIsLoading(false)}
                    className="max-h-[75vh] w-auto object-contain block"
                  />
                ) : (
                  <iframe
                    src={streamUrl}
                    title={document.title}
                    onLoad={() => setIsLoading(false)}
                    className="w-[800px] h-[75vh] border-0"
                  />
                )}
              </div>
            ) : null}

            {/* Viewer Controls Floating Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xs border border-[#DCE6F5] shadow-lg rounded-full px-4 py-1.5 flex items-center gap-3 z-30 text-xs font-semibold text-slate-700">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 15))}
                className="p-1 hover:text-[#2563EB] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-500 w-10 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(200, z + 15))}
                className="p-1 hover:text-[#2563EB] transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-200"></div>
              <button
                onClick={() => setZoom(100)}
                className="p-1 hover:text-[#2563EB] transition-colors"
                title="Reset Zoom"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Metadata & Verification Inspector */}
          <div className="w-80 bg-white border-l border-[#DCE6F5] p-6 overflow-y-auto shrink-0 hidden md:block">
            <h4 className="text-xs font-bold text-[#142B4D] uppercase tracking-wider mb-4">
              Vault Document Passport
            </h4>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Security State</span>
                <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ephemerally Authorized Stream</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Short-lived signed token with 60s TTL. Direct static access is disabled.
                </p>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Owner</span>
                <span className="font-semibold text-slate-800">@{document.ownerUsername}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Issuing Authority</span>
                <span className="font-semibold text-slate-800">{document.issuer}</span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">Category & Classification</span>
                <span className="font-semibold text-slate-800">{document.category}</span>
                {document.subCategory && (
                  <span className="text-slate-500 block text-[11px]">{document.subCategory}</span>
                )}
              </div>

              {document.issueDate && (
                <div>
                  <span className="text-slate-400 text-[11px] block">Issue Date</span>
                  <span className="font-semibold text-slate-800">{document.issueDate}</span>
                </div>
              )}

              {document.expiryDate && (
                <div>
                  <span className="text-slate-400 text-[11px] block">Expiration Date</span>
                  <span className="font-semibold text-slate-800">{document.expiryDate}</span>
                </div>
              )}

              <div>
                <span className="text-slate-400 text-[11px] block">Cryptographic Storage ID</span>
                <span className="font-mono text-[11px] text-slate-600 truncate block">
                  {document.storageKey}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block">MIME Type & Size</span>
                <span className="font-mono text-[11px] text-slate-600">
                  {document.mimeType} • {document.fileSize} bytes
                </span>
              </div>

              {document.description && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 text-[11px] block mb-1">Description</span>
                  <p className="text-slate-600 text-xs italic">{document.description}</p>
                </div>
              )}

              {document.tags && document.tags.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 text-[11px] block mb-1.5">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {document.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
