export type UserRole = 'OWNER' | 'VIEWER' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type CertificateCategory =
  | 'GOVERNMENT'
  | 'EDUCATIONAL'
  | 'PROFESSIONAL'
  | 'COURSES_TRAINING'
  | string;

export type VerificationStatus =
  | 'VERIFIED_ISSUER'
  | 'PENDING_VERIFICATION'
  | 'SELF_ASSERTED'
  | 'REJECTED';

export interface VaultDocument {
  id: string;
  ownerId: string;
  ownerUsername: string;
  title: string;
  normalizedTitle: string;
  category: CertificateCategory;
  subCategory?: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  verificationStatus: VerificationStatus;
  storageKey: string;
  mimeType: string;
  fileSize: number;
  originalFileName: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  isLocked: boolean;
}

export type PermissionLevel = 'VIEW' | 'DOWNLOAD' | 'MANAGE_ACCESS';

export interface DocumentPermissionGrant {
  id: string;
  documentId: string;
  documentTitle: string;
  recipientId: string;
  recipientUsername: string;
  grantedBy: string;
  permissions: PermissionLevel[];
  grantedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'DOCUMENT_UPLOAD'
  | 'DOCUMENT_VIEW'
  | 'DOCUMENT_DOWNLOAD'
  | 'METADATA_UPDATE'
  | 'DOCUMENT_DELETE'
  | 'PERMISSION_GRANT'
  | 'PERMISSION_REVOKE'
  | 'ACCESS_DENIED'
  | 'USER_ROLE_CHANGE'
  | 'USER_SUSPEND'
  | 'USER_ACTIVATE'
  | 'FILENAME_LOCK_SUCCESS'
  | 'FILENAME_LOCK_FAILURE'
  | 'INTEGRITY_CHECK';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorUsername: string;
  actorRole: UserRole | 'ANONYMOUS';
  action: AuditAction;
  resourceId?: string;
  resourceType?: 'DOCUMENT' | 'USER' | 'PERMISSION' | 'AUTH' | 'SYSTEM';
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
  reasonCode?: string;
  correlationId: string;
  context: {
    ip?: string;
    userAgent?: string;
    targetUserId?: string;
    attemptedPermission?: PermissionLevel;
    fileNameEntered?: string;
    details?: string;
    [key: string]: any;
  };
  previousHash: string;
  hash: string;
}

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export interface SecurityStats {
  totalCertificates: number;
  governmentCount: number;
  educationalCount: number;
  professionalCount: number;
  courseCount: number;
  sharedWithMeCount: number;
  sharedByMeCount: number;
  activeGrantsCount: number;
  totalUsersCount: number;
  securityIncidentsCount: number;
  auditEventsCount: number;
  tamperIntegrityVerified: boolean;
}
