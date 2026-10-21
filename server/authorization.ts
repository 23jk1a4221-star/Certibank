import type { User, VaultDocument, PermissionLevel } from '../src/types/index.ts';
import { documents, permissions } from './db.ts';
import { logAuditEvent } from './audit.ts';

export type ProtectedAction =
  | 'LIST'
  | 'VIEW'
  | 'DOWNLOAD'
  | 'EDIT_METADATA'
  | 'DELETE'
  | 'MANAGE_ACCESS'
  | 'GRANT_ACCESS'
  | 'REVOKE_ACCESS';

export interface AuthorizationResult {
  authorized: boolean;
  reasonCode: string;
  document?: VaultDocument;
  grantedPermissions?: PermissionLevel[];
}

/**
 * Centralized authorization engine for all document-level operations.
 * Enforces Zero-Trust, denies by default, prevents IDOR and privilege escalation.
 */
export function authorizeDocumentAction(
  actor: User,
  documentId: string,
  action: ProtectedAction,
  options?: { correlationId?: string; ip?: string; userAgent?: string }
): AuthorizationResult {
  const correlationId = options?.correlationId || crypto.randomUUID();

  // 1. Account status verification
  if (actor.status === 'SUSPENDED') {
    logAuditEvent({
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: actor.role,
      action: 'ACCESS_DENIED',
      resourceId: documentId,
      resourceType: 'DOCUMENT',
      outcome: 'DENIED',
      reasonCode: 'ACCOUNT_SUSPENDED',
      correlationId,
      context: { details: `Suspended user ${actor.username} attempted ${action} on ${documentId}`, ip: options?.ip, userAgent: options?.userAgent },
    });
    return { authorized: false, reasonCode: 'ACCOUNT_SUSPENDED' };
  }

  // 2. Document existence verification
  const document = documents.get(documentId);
  if (!document) {
    logAuditEvent({
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: actor.role,
      action: 'ACCESS_DENIED',
      resourceId: documentId,
      resourceType: 'DOCUMENT',
      outcome: 'DENIED',
      reasonCode: 'DOCUMENT_NOT_FOUND',
      correlationId,
      context: { details: `User ${actor.username} attempted ${action} on non-existent document ${documentId}`, ip: options?.ip, userAgent: options?.userAgent },
    });
    return { authorized: false, reasonCode: 'DOCUMENT_NOT_FOUND' };
  }

  // 3. Document Owner has full access
  if (document.ownerId === actor.id) {
    return {
      authorized: true,
      reasonCode: 'IS_OWNER',
      document,
      grantedPermissions: ['VIEW', 'DOWNLOAD', 'MANAGE_ACCESS'],
    };
  }

  // 4. Administrator constraints:
  // Administrators can manage accounts and system audit events,
  // but CANNOT read, download, or decrypt private certificate contents without an explicit grant!
  if (actor.role === 'ADMIN') {
    if (action === 'LIST') {
      // Admin may view metadata listing for system accounting only if requested, or we can enforce grant
      return {
        authorized: true,
        reasonCode: 'ADMIN_METADATA_INSPECTION',
        document,
        grantedPermissions: [],
      };
    }
    // For VIEW, DOWNLOAD, EDIT, DELETE, MANAGE_ACCESS -> Admin still requires explicit grant
  }

  // 5. Explicit Sharing Grants (Attribute-Based Access Control)
  let matchingGrant = null;
  const now = new Date();

  for (const grant of permissions.values()) {
    if (grant.documentId === documentId && grant.recipientId === actor.id) {
      // Check revocation status
      if (grant.status === 'REVOKED') {
        continue;
      }
      // Check expiration timestamp
      if (grant.expiresAt && new Date(grant.expiresAt) <= now) {
        continue;
      }
      matchingGrant = grant;
      break;
    }
  }

  if (!matchingGrant) {
    // Record security violation / authorization denial
    logAuditEvent({
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: actor.role,
      action: 'ACCESS_DENIED',
      resourceId: documentId,
      resourceType: 'DOCUMENT',
      outcome: 'DENIED',
      reasonCode: 'NO_SHARING_GRANT',
      correlationId,
      context: {
        details: `Unauthorized access attempt: ${actor.username} requested ${action} on document ${documentId} (Owner: ${document.ownerUsername})`,
        attemptedPermission: action as any,
        ip: options?.ip,
        userAgent: options?.userAgent,
      },
    });
    return { authorized: false, reasonCode: 'NO_SHARING_GRANT' };
  }

  const perms = matchingGrant.permissions || [];

  // Check specific permission gates
  switch (action) {
    case 'LIST':
    case 'VIEW':
      if (perms.includes('VIEW') || perms.includes('DOWNLOAD')) {
        return {
          authorized: true,
          reasonCode: 'GRANT_PERMITTED',
          document,
          grantedPermissions: perms,
        };
      }
      break;

    case 'DOWNLOAD':
      // VIEW does not grant DOWNLOAD
      if (perms.includes('DOWNLOAD')) {
        return {
          authorized: true,
          reasonCode: 'GRANT_PERMITTED',
          document,
          grantedPermissions: perms,
        };
      }
      break;

    case 'MANAGE_ACCESS':
    case 'GRANT_ACCESS':
    case 'REVOKE_ACCESS':
      // VIEW does not grant MANAGE_ACCESS
      if (perms.includes('MANAGE_ACCESS')) {
        return {
          authorized: true,
          reasonCode: 'GRANT_PERMITTED',
          document,
          grantedPermissions: perms,
        };
      }
      break;

    case 'EDIT_METADATA':
    case 'DELETE':
      // Non-owners can never edit or delete documents
      break;
  }

  // Permission level insufficient
  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'ACCESS_DENIED',
    resourceId: documentId,
    resourceType: 'DOCUMENT',
    outcome: 'DENIED',
    reasonCode: 'INSUFFICIENT_PERMISSION',
    correlationId,
    context: {
      details: `User ${actor.username} lacks required permission for ${action}. Holds: [${perms.join(', ')}]`,
      attemptedPermission: action as any,
      ip: options?.ip,
      userAgent: options?.userAgent,
    },
  });

  return { authorized: false, reasonCode: 'INSUFFICIENT_PERMISSION' };
}
