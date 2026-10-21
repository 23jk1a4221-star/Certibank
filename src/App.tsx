import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar, NavigationTab } from './components/Sidebar.tsx';
import { LoginView } from './components/LoginView.tsx';
import { DashboardOverview } from './components/DashboardOverview.tsx';
import { AuditTrailView } from './components/AuditTrailView.tsx';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { FileNameLockModal } from './components/FileNameLockModal.tsx';
import { DocumentViewerModal } from './components/DocumentViewerModal.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { AccessManagementModal } from './components/AccessManagementModal.tsx';
import { EvaluationDocsModal } from './components/EvaluationDocsModal.tsx';
import { api } from './services/api.ts';
import type { VaultDocument, SecurityStats, PermissionLevel } from './types/index.ts';

function MainApp() {
  const { user, loading: authLoading } = useAuth();

  // Navigation and Filtering State
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Documents and Stats State
  const [documents, setDocuments] = useState<Array<VaultDocument & { permissions?: PermissionLevel[] }>>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Modals State
  const [lockModalDoc, setLockModalDoc] = useState<VaultDocument | null>(null);
  const [viewerModalDoc, setViewerModalDoc] = useState<VaultDocument | null>(null);
  const [viewerStreamToken, setViewerStreamToken] = useState<string | null>(null);
  const [viewerCanDownload, setViewerCanDownload] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [accessModalDoc, setAccessModalDoc] = useState<VaultDocument | null>(null);
  const [evalDocsOpen, setEvalDocsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadDocuments();
      loadStats();
    }
  }, [user, currentTab, searchQuery, selectedCategoryFilter]);

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      let categoryParam: string | undefined = undefined;
      let scopeParam: 'all' | 'owned' | 'shared' | undefined = undefined;

      if (currentTab === 'government') categoryParam = 'GOVERNMENT';
      else if (currentTab === 'educational') categoryParam = 'EDUCATIONAL';
      else if (currentTab === 'educational-school') categoryParam = 'EDUCATIONAL';
      else if (currentTab === 'educational-college') categoryParam = 'EDUCATIONAL';
      else if (currentTab === 'professional') categoryParam = 'PROFESSIONAL';
      else if (currentTab === 'courses') categoryParam = 'COURSES_TRAINING';
      else if (currentTab === 'shared-with-me') scopeParam = 'shared';
      else if (currentTab === 'shared-by-me') scopeParam = 'owned';
      else if (selectedCategoryFilter !== 'ALL') categoryParam = selectedCategoryFilter;

      const res = await api.getDocuments({
        category: categoryParam,
        scope: scopeParam,
        search: searchQuery.trim() || undefined,
      });

      let docs = res.documents;

      // Handle sub-filtering for school vs college
      if (currentTab === 'educational-school') {
        docs = docs.filter(
          (d) =>
            d.subCategory?.toLowerCase().includes('school') ||
            d.title.toLowerCase().includes('school') ||
            d.title.toLowerCase().includes('sslc')
        );
      } else if (currentTab === 'educational-college') {
        docs = docs.filter(
          (d) =>
            d.subCategory?.toLowerCase().includes('university') ||
            d.subCategory?.toLowerCase().includes('college') ||
            d.title.toLowerCase().includes('bachelor') ||
            d.title.toLowerCase().includes('degree')
        );
      }

      setDocuments(docs);
    } catch {
      // ignore
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await api.getStats();
      setStats(s);
    } catch {
      // ignore
    }
  };

  const handleUnlockClick = (doc: VaultDocument) => {
    setLockModalDoc(doc);
  };

  const handleUnlockedSuccess = (doc: VaultDocument, streamToken: string, canDownload: boolean) => {
    setViewerModalDoc(doc);
    setViewerStreamToken(streamToken);
    setViewerCanDownload(canDownload);
  };

  const handleShareClick = (doc: VaultDocument) => {
    setAccessModalDoc(doc);
  };

  const handleDeleteClick = async (doc: VaultDocument) => {
    if (!confirm(`Are you sure you want to permanently delete '${doc.title}' from the vault?`)) {
      return;
    }
    try {
      await api.deleteDocument(doc.id);
      loadDocuments();
      loadStats();
    } catch (err: any) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  const handleUploadSuccess = () => {
    loadDocuments();
    loadStats();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F8FF] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-[#142B4D] tracking-wider uppercase">Loading Certibank Vault...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-[#F4F8FF] flex flex-col">
      {/* Top Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenEvaluationDocs={() => setEvalDocsOpen(true)}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          stats={stats}
          onOpenUpload={() => setUploadModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {currentTab === 'audit-trail' ? (
            <AuditTrailView />
          ) : currentTab === 'admin-dashboard' ? (
            <AdminDashboardView />
          ) : (
            <DashboardOverview
              documents={documents}
              stats={stats}
              selectedCategory={selectedCategoryFilter}
              onSelectCategory={setSelectedCategoryFilter}
              onUnlockDocument={handleUnlockClick}
              onShareDocument={handleShareClick}
              onDeleteDocument={handleDeleteClick}
              onOpenUpload={() => setUploadModalOpen(true)}
              onRefresh={() => {
                loadDocuments();
                loadStats();
              }}
              isLoading={isLoadingDocs}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <FileNameLockModal
        document={lockModalDoc}
        isOpen={!!lockModalDoc}
        onClose={() => setLockModalDoc(null)}
        onUnlocked={handleUnlockedSuccess}
      />

      <DocumentViewerModal
        document={viewerModalDoc}
        streamToken={viewerStreamToken}
        canDownload={viewerCanDownload}
        isOpen={!!viewerModalDoc}
        onClose={() => {
          setViewerModalDoc(null);
          setViewerStreamToken(null);
        }}
        onOpenSharing={(doc) => setAccessModalDoc(doc)}
      />

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <AccessManagementModal
        document={accessModalDoc}
        isOpen={!!accessModalDoc}
        onClose={() => setAccessModalDoc(null)}
        onGrantsUpdated={() => {
          loadDocuments();
          loadStats();
        }}
      />

      <EvaluationDocsModal
        isOpen={evalDocsOpen}
        onClose={() => setEvalDocsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
