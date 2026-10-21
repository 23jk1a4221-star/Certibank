import React, { useState } from 'react';
import {
  Shield,
  FileCheck,
  Search,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Layers,
  Key,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import type { UserRole } from '../types/index.ts';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenEvaluationDocs: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenEvaluationDocs,
}) => {
  const { user, logout, switchDevAccount } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Key className="w-3 h-3 text-blue-600" /> OWNER
          </span>
        );
      case 'VIEWER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <FileCheck className="w-3 h-3 text-emerald-600" /> VIEWER
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <ShieldAlert className="w-3 h-3 text-purple-600" /> ADMIN
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#DCE6F5] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#142B4D] to-[#2563EB] flex items-center justify-center text-white shadow-sm ring-2 ring-blue-100">
              <div className="relative">
                <Shield className="w-6 h-6 stroke-[2.2]" />
                <FileCheck className="w-3.5 h-3.5 absolute -bottom-0.5 -right-1 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-[#142B4D] tracking-tight">CERTIBANK</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  Trust Vault
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] font-medium leading-none">Zero-Trust Document Security</p>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-lg hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search certificates by title, issuer, category, tags..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-[#F4F8FF] border border-[#DCE6F5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent text-[#142B4D] placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-3">
            {/* 100-Marks Rubric & Demo Button */}
            <button
              onClick={onOpenEvaluationDocs}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors shadow-xs"
              title="View 100-Mark Rubric, Traceability Matrix, and Demo Script"
            >
              <Layers className="w-3.5 h-3.5 text-amber-700" />
              <span>Evaluation & Demo (100 Marks)</span>
            </button>

            {/* Account Switcher for Test Evaluators */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F4F8FF] border border-[#DCE6F5] hover:bg-blue-50/60 transition-colors text-[#142B4D]"
              >
                <span className="text-slate-500 hidden sm:inline">Role:</span>
                {user ? getRoleBadge(user.role) : null}
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-[#DCE6F5] py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Test Account
                  </div>
                  <button
                    onClick={() => {
                      switchDevAccount('OWNER');
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      user?.role === 'OWNER' ? 'bg-blue-50/70 font-bold' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Nujahath (Owner)</div>
                      <div className="text-[11px] text-slate-500">nujahath • Full Vault Control</div>
                    </div>
                    {user?.role === 'OWNER' && <span className="text-blue-600 text-xs">Active</span>}
                  </button>
                  <button
                    onClick={() => {
                      switchDevAccount('VIEWER');
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      user?.role === 'VIEWER' ? 'bg-blue-50/70 font-bold' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Auditor (Viewer)</div>
                      <div className="text-[11px] text-slate-500">viewer_auditor • Shared Only</div>
                    </div>
                    {user?.role === 'VIEWER' && <span className="text-blue-600 text-xs">Active</span>}
                  </button>
                  <button
                    onClick={() => {
                      switchDevAccount('ADMIN');
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      user?.role === 'ADMIN' ? 'bg-blue-50/70 font-bold' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-900">Security Administrator</div>
                      <div className="text-[11px] text-slate-500">certi_admin • System Audits</div>
                    </div>
                    {user?.role === 'ADMIN' && <span className="text-blue-600 text-xs">Active</span>}
                  </button>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#142B4D] text-white flex items-center justify-center font-bold text-xs">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#DCE6F5] py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-[#142B4D]">{user?.displayName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">@{user?.username}</p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Zero-Trust Authenticated</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      onOpenEvaluationDocs();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4 text-slate-400" />
                    <span>Evaluation Traceability</span>
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
