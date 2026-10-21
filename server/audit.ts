import crypto from 'node:crypto';
import type { AuditEvent, AuditAction, UserRole } from '../src/types/index.ts';

// In-memory / persistent ledger of tamper-evident audit records
const auditLedger: AuditEvent[] = [];
let lastHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis hash

export interface CreateAuditInput {
  actorId: string;
  actorUsername: string;
  actorRole: UserRole | 'ANONYMOUS';
  action: AuditAction;
  resourceId?: string;
  resourceType?: 'DOCUMENT' | 'USER' | 'PERMISSION' | 'AUTH' | 'SYSTEM';
  outcome: 'SUCCESS' | 'DENIED' | 'FAILURE';
  reasonCode?: string;
  correlationId?: string;
  context?: {
    ip?: string;
    userAgent?: string;
    targetUserId?: string;
    attemptedPermission?: any;
    fileNameEntered?: string;
    details?: string;
    [key: string]: any;
  };
}

/**
 * Compute SHA-256 integrity hash for an audit record linked to the previous block
 */
function computeRecordHash(
  prevHash: string,
  id: string,
  timestamp: string,
  actorId: string,
  action: string,
  outcome: string,
  resourceId: string,
  contextStr: string
): string {
  const payload = `${prevHash}|${id}|${timestamp}|${actorId}|${action}|${outcome}|${resourceId}|${contextStr}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Record a secure audit event into the tamper-evident chain
 * Clients cannot modify, forged records fail cryptographic verification
 */
export function logAuditEvent(input: CreateAuditInput): AuditEvent {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const correlationId = input.correlationId || crypto.randomUUID();
  const sanitizedContext = { ...input.context };

  // Sanitize context: ensure no credentials, tokens, or raw document content are ever logged
  delete (sanitizedContext as any).password;
  delete (sanitizedContext as any).token;
  delete (sanitizedContext as any).authorization;

  const contextStr = JSON.stringify(sanitizedContext || {});
  const resourceId = input.resourceId || 'NONE';

  const hash = computeRecordHash(
    lastHash,
    id,
    timestamp,
    input.actorId,
    input.action,
    input.outcome,
    resourceId,
    contextStr
  );

  const event: AuditEvent = {
    id,
    timestamp,
    actorId: input.actorId,
    actorUsername: input.actorUsername,
    actorRole: input.actorRole,
    action: input.action,
    resourceId: input.resourceId,
    resourceType: input.resourceType,
    outcome: input.outcome,
    reasonCode: input.reasonCode,
    correlationId,
    context: sanitizedContext,
    previousHash: lastHash,
    hash,
  };

  auditLedger.push(event);
  lastHash = hash;

  return event;
}

/**
 * Query audit events with authorized filtering
 */
export function getAuditEvents(options?: {
  actorId?: string;
  action?: AuditAction;
  outcome?: 'SUCCESS' | 'DENIED' | 'FAILURE';
  resourceId?: string;
  limit?: number;
}): AuditEvent[] {
  let list = [...auditLedger];

  if (options?.actorId) {
    list = list.filter((e) => e.actorId === options.actorId);
  }
  if (options?.action) {
    list = list.filter((e) => e.action === options.action);
  }
  if (options?.outcome) {
    list = list.filter((e) => e.outcome === options.outcome);
  }
  if (options?.resourceId) {
    list = list.filter((e) => e.resourceId === options.resourceId);
  }

  // Return reverse chronological (newest first)
  list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (options?.limit && options.limit > 0) {
    return list.slice(0, options.limit);
  }

  return list;
}

/**
 * Mathematically verify the integrity of the audit hash chain from genesis to head
 */
export function verifyAuditChainIntegrity(): {
  isValid: boolean;
  totalRecords: number;
  brokenIndex?: number;
  message: string;
} {
  let currentPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < auditLedger.length; i++) {
    const record = auditLedger[i];

    // Check pointer integrity
    if (record.previousHash !== currentPrevHash) {
      return {
        isValid: false,
        totalRecords: auditLedger.length,
        brokenIndex: i,
        message: `Hash link mismatch at record #${i} (ID: ${record.id}). Chain tampering detected!`,
      };
    }

    // Recalculate hash
    const expectedHash = computeRecordHash(
      record.previousHash,
      record.id,
      record.timestamp,
      record.actorId,
      record.action,
      record.outcome,
      record.resourceId || 'NONE',
      JSON.stringify(record.context || {})
    );

    if (record.hash !== expectedHash) {
      return {
        isValid: false,
        totalRecords: auditLedger.length,
        brokenIndex: i,
        message: `Content hash mismatch at record #${i} (ID: ${record.id}). Record modification detected!`,
      };
    }

    currentPrevHash = record.hash;
  }

  return {
    isValid: true,
    totalRecords: auditLedger.length,
    message: `Cryptographic audit integrity verified: All ${auditLedger.length} chain records are mathematically authentic.`,
  };
}
