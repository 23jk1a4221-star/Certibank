import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Landmark,
  GraduationCap,
  Award,
  BookOpen,
  Share2,
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  KeyRound,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { SecurityStats } from '../types/index.ts';

export type NavigationTab =
  | 'overview'
  | 'all'
  | 'government'
  | 'educational'
  | 'educational-school'
  | 'educational-college'
  | 'professional'
  | 'courses'
  | 'shared-with-me'
  | 'shared-by-me'
  | 'access-management'
  | 'search'
  | 'audit-trail'
  | 'admin-dashboard';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  stats: SecurityStats | null;
  onOpenUpload: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  stats,
  onOpenUpload,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = user?.role === 'OWNER';

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'all', label: 'All Certificates', icon: FileText, count: stats?.totalCertificates },
    {
      id: 'government',
      label: 'Government Certificates',
      icon: Landmark,
      count: stats?.governmentCount,
      subCategories: ['Date of Birth', 'Birth Registration', 'Civil Certificates'],
    },
    {
      id: 'educational',
      label: 'Educational Certificates',
      icon: GraduationCap,
      count: stats?.educationalCount,
      children: [
        { id: 'educational-school', label: 'School & SSLC', icon: FileCheck2 },
        { id: 'educational-college', label: 'College & Degrees', icon: BookOpen },
      ],
    },
    {
      id: 'professional',
      label: 'Professional Certifications',
      icon: Award,
      count: stats?.professionalCount,
    },
    {
      id: 'courses',
      label: 'Courses and Training',
      icon: BookOpen,
      count: stats?.courseCount,
    },
    {
      id: 'shared-with-me',
      label: 'Shared With Me',
      icon: Users,
      count: stats?.sharedWithMeCount,
    },
    {
      id: 'shared-by-me',
      label: 'Shared By Me',
      icon: Share2,
      count: stats?.sharedByMeCount,
    },
    {
      id: 'access-management',
      label: 'Access Management',
      icon: KeyRound,
      count: stats?.activeGrantsCount,
    },
    { id: 'search', label: 'Search & Filter', icon: Search },
    {
      id: 'audit-trail',
      label: 'Audit Trail',
      icon: ShieldCheck,
      count: stats?.auditEventsCount,
      tamperCheck: stats?.tamperIntegrityVerified,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-[#DCE6F5] shrink-0 min-h-[calc(100vh-4rem)] flex flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Upload Button */}
        {isOwner && (
          <button
            onClick={onOpenUpload}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Upload Certificate</span>
          </button>
        )}

        {/* Navigation Section */}
        <div>
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-3 mb-2">
            Vault Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => onSelectTab(item.id as NavigationTab)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-[#2563EB] font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {item.tamperCheck && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Tamper-evident chain valid" />
                      )}
                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                            isActive ? 'bg-blue-200/60 text-blue-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Nested children (e.g., Educational School vs College) */}
                  {item.children && (currentTab === 'educational' || currentTab.startsWith('educational-')) && (
                    <div className="pl-6 space-y-1 border-l-2 border-blue-100 ml-4 my-1">
                      {item.children.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = currentTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => onSelectTab(sub.id as NavigationTab)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-colors ${
                              isSubActive
                                ? 'bg-blue-50 text-blue-700 font-bold'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <SubIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{sub.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Administration Section */}
        <div>
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider px-3 mb-2">
            Governance & Controls
          </div>
          <button
            onClick={() => onSelectTab('admin-dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'admin-dashboard'
                ? 'bg-purple-50 text-purple-700 font-bold'
                : 'text-slate-700 hover:bg-purple-50/50 hover:text-purple-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className={`w-4 h-4 ${currentTab === 'admin-dashboard' ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>Admin Dashboard</span>
            </div>
            {!isAdmin && (
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                Protected
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Security Health Box */}
      <div className="pt-4 border-t border-[#DCE6F5]">
        <div className="p-3 bg-[#F4F8FF] border border-[#DCE6F5] rounded-xl text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#142B4D]">VAULT INTEGRITY</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> SHA-256
            </span>
          </div>
          <p className="text-[11px] text-[#64748B]">Zero-trust ABAC active. All file streams require ephemeral authorization.</p>
        </div>
      </div>
    </aside>
  );
};
