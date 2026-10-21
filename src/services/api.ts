import type {
  User,
  VaultDocument,
  DocumentPermissionGrant,
  AuditEvent,
  SecurityStats,
  PermissionLevel,
} from '../types/index.ts';

const BASE_URL = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('certibank_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('certibank_token', res.token);
    return res;
  },

  voicePhraseAssist: async (phrase: string): Promise<{ matched: boolean; suggestedUsername: string; message: string }> => {
    return request('/auth/voice-phrase-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrase }),
    });
  },

  logout: async (): Promise<void> => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem('certibank_token');
    }
  },

  getMe: async (): Promise<{ user: User }> => {
    return request<{ user: User }>('/auth/me');
  },

  // Documents
  getDocuments: async (params?: {
    category?: string;
    search?: string;
    scope?: 'all' | 'owned' | 'shared';
    sort?: string;
  }): Promise<{ documents: Array<VaultDocument & { permissions: PermissionLevel[] }> }> => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.scope) query.append('scope', params.scope);
    if (params?.sort) query.append('sort', params.sort);
    const qs = query.toString();
    return request(`/documents${qs ? `?${qs}` : ''}`);
  },

  getDocument: async (id: string): Promise<{ document: VaultDocument & { permissions: PermissionLevel[] } }> => {
    return request(`/documents/${id}`);
  },

  unlockDocument: async (
    id: string,
    enteredName: string
  ): Promise<{ unlocked: boolean; streamToken: string; expiresInSeconds: number; canDownload: boolean }> => {
    return request(`/documents/${id}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enteredName }),
    });
  },

  getStreamUrl: (docId: string, streamToken?: string): string => {
    const token = streamToken || localStorage.getItem('certibank_token') || '';
    return `${BASE_URL}/documents/${docId}/stream?token=${encodeURIComponent(token)}`;
  },

  downloadDocument: async (docId: string, filename: string): Promise<void> => {
    const token = localStorage.getItem('certibank_token');
    const response = await fetch(`${BASE_URL}/documents/${docId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      let err = 'Download failed';
      try {
        const d = await response.json();
        err = d.error || err;
      } catch {}
      throw new Error(err);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  uploadDocument: async (formData: FormData): Promise<{ document: VaultDocument; message: string }> => {
    const token = localStorage.getItem('certibank_token');
    const response = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      let err = 'Upload failed';
      try {
        const d = await response.json();
        err = d.error || err;
      } catch {}
      throw new Error(err);
    }

    return response.json();
  },

  updateDocumentMetadata: async (id: string, updates: Partial<VaultDocument>): Promise<{ document: VaultDocument }> => {
    return request(`/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },

  deleteDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    return request(`/documents/${id}`, { method: 'DELETE' });
  },

  // Permissions & Sharing
  getDocumentGrants: async (docId: string): Promise<{ grants: DocumentPermissionGrant[] }> => {
    return request(`/permissions/document/${docId}`);
  },

  getSharedWithMe: async (): Promise<{ grants: DocumentPermissionGrant[] }> => {
    return request('/permissions/shared-with-me');
  },

  getSharedByMe: async (): Promise<{ grants: DocumentPermissionGrant[] }> => {
    return request('/permissions/shared-by-me');
  },

  grantPermission: async (data: {
    documentId: string;
    recipientUsername: string;
    permissions: PermissionLevel[];
    expiresAt?: string;
  }): Promise<{ grant: DocumentPermissionGrant; message: string }> => {
    return request('/permissions/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  revokePermission: async (grantId: string): Promise<{ success: boolean; message: string }> => {
    return request('/permissions/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grantId }),
    });
  },

  // Audit
  getAuditTrail: async (params?: { action?: string; outcome?: string; limit?: number }): Promise<{ events: AuditEvent[] }> => {
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.outcome) query.append('outcome', params.outcome);
    if (params?.limit) query.append('limit', params.limit.toString());
    const qs = query.toString();
    return request(`/audit${qs ? `?${qs}` : ''}`);
  },

  verifyAuditIntegrity: async (): Promise<{
    isValid: boolean;
    totalRecords: number;
    brokenIndex?: number;
    message: string;
  }> => {
    return request('/audit/verify');
  },

  // Admin
  getAdminUsers: async (): Promise<{ users: User[] }> => {
    return request('/admin/users');
  },

  updateUserStatus: async (id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<{ success: boolean; message: string }> => {
    return request(`/admin/users/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },

  updateUserRole: async (id: string, role: string): Promise<{ success: boolean; message: string }> => {
    return request(`/admin/users/${id}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
  },

  getAdminStats: async (): Promise<any> => {
    return request('/admin/stats');
  },

  // Categories & General Stats
  getCategories: async (): Promise<{ categories: string[] }> => {
    return request('/categories');
  },

  addCategory: async (name: string): Promise<{ categories: string[]; newCategory: string }> => {
    return request('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  },

  getStats: async (): Promise<SecurityStats> => {
    return request<SecurityStats>('/stats');
  },
};
