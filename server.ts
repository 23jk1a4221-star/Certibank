import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  users,
  usernameIndex,
  documents,
  permissions,
  fileStore,
  customCategories,
  seedDatabase,
} from './server/db.ts';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  revokeSessionToken,
  generateShortLivedDownloadToken,
  verifyShortLivedDownloadToken,
} from './server/auth.ts';
import {
  logAuditEvent,
  getAuditEvents,
  verifyAuditChainIntegrity,
} from './server/audit.ts';
import {
  authorizeDocumentAction,
} from './server/authorization.ts';
import type {
  User,
  VaultDocument,
  DocumentPermissionGrant,
  PermissionLevel,
  UserRole,
} from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize seed data
seedDatabase();

const app = express();
app.use(express.json({ limit: '5mb' }));

// Security Headers Middleware
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Configure Multer for secure in-memory file uploads with strict size limits
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`UNSUPPORTED_MEDIA_TYPE: File type ${file.mimetype} is not permitted.`));
    }
  },
});

// Augment Express Request interface with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

/**
 * Authentication Middleware: Extracts and validates Bearer token
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'UNAUTHENTICATED: Authentication token missing or invalid.' });
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'UNAUTHENTICATED: Token has expired or been revoked.' });
    return;
  }

  const user = users.get(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'UNAUTHENTICATED: User account no longer exists.' });
    return;
  }

  if (user.status === 'SUSPENDED') {
    res.status(403).json({ error: 'ACCOUNT_SUSPENDED: Your account has been suspended by an administrator.' });
    return;
  }

  req.user = user;
  req.token = token;
  next();
}

/**
 * Require ADMIN role middleware
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    logAuditEvent({
      actorId: req.user ? req.user.id : 'ANONYMOUS',
      actorUsername: req.user ? req.user.username : 'ANONYMOUS',
      actorRole: req.user ? req.user.role : 'ANONYMOUS',
      action: 'ACCESS_DENIED',
      resourceType: 'SYSTEM',
      outcome: 'DENIED',
      reasonCode: 'ADMIN_PRIVILEGE_REQUIRED',
      context: { details: `Non-admin user attempted admin endpoint ${req.path}`, ip: req.ip },
    });
    res.status(403).json({ error: 'FORBIDDEN: Administrative privileges required.' });
    return;
  }
  next();
}

/* ==========================================================================
   AUTHENTICATION ROUTES
   ========================================================================== */

/**
 * POST /api/auth/login
 * Secure username/password verification using PBKDF2 and timing-safe comparison
 */
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress;

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'INVALID_CREDENTIALS: Username and password are required.' });
    return;
  }

  const normalized = username.trim().toLowerCase();
  const userId = usernameIndex.get(normalized);
  const user = userId ? users.get(userId) : null;

  if (!user) {
    logAuditEvent({
      actorId: 'ANONYMOUS',
      actorUsername: normalized,
      actorRole: 'ANONYMOUS',
      action: 'LOGIN_FAILURE',
      resourceType: 'AUTH',
      outcome: 'FAILURE',
      reasonCode: 'USER_NOT_FOUND',
      context: { ip: clientIp, userAgent: req.headers['user-agent'] },
    });
    res.status(401).json({ error: 'INVALID_CREDENTIALS: The username or password entered is incorrect.' });
    return;
  }

  if (user.status === 'SUSPENDED') {
    logAuditEvent({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'LOGIN_FAILURE',
      resourceType: 'AUTH',
      outcome: 'DENIED',
      reasonCode: 'ACCOUNT_SUSPENDED',
      context: { ip: clientIp, userAgent: req.headers['user-agent'] },
    });
    res.status(403).json({ error: 'ACCOUNT_SUSPENDED: This account has been suspended by an administrator.' });
    return;
  }

  const isValidPassword = verifyPassword(password, user.passwordHash, user.salt);

  if (!isValidPassword) {
    logAuditEvent({
      actorId: user.id,
      actorUsername: user.username,
      actorRole: user.role,
      action: 'LOGIN_FAILURE',
      resourceType: 'AUTH',
      outcome: 'FAILURE',
      reasonCode: 'INVALID_PASSWORD',
      context: { ip: clientIp, userAgent: req.headers['user-agent'] },
    });
    res.status(401).json({ error: 'INVALID_CREDENTIALS: The username or password entered is incorrect.' });
    return;
  }

  // Update last login
  user.lastLoginAt = new Date().toISOString();
  users.set(user.id, user);

  const token = createSessionToken(user);

  logAuditEvent({
    actorId: user.id,
    actorUsername: user.username,
    actorRole: user.role,
    action: 'LOGIN_SUCCESS',
    resourceType: 'AUTH',
    outcome: 'SUCCESS',
    reasonCode: 'AUTHENTICATED',
    context: { ip: clientIp, userAgent: req.headers['user-agent'] },
  });

  const { passwordHash: _ph, salt: _s, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

/**
 * POST /api/auth/voice-phrase-assist
 * Convenience voice phrase recognition assistant
 */
app.post('/api/auth/voice-phrase-assist', (req: Request, res: Response) => {
  const { phrase } = req.body;
  const clientIp = req.ip;

  if (!phrase || typeof phrase !== 'string') {
    res.status(400).json({ error: 'Phrase is required.' });
    return;
  }

  const normalized = phrase.trim().toLowerCase().replace(/[.,!?;:]/g, '');
  const targetPhrase = 'this is nujahath';

  if (normalized === targetPhrase || normalized.includes('nujahath')) {
    logAuditEvent({
      actorId: 'ANONYMOUS',
      actorUsername: 'nujahath',
      actorRole: 'ANONYMOUS',
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      outcome: 'SUCCESS',
      reasonCode: 'VOICE_PHRASE_MATCHED',
      context: { details: 'Voice phrase matched Nujahath; proceeding to password verification', ip: clientIp },
    });
    res.json({
      matched: true,
      suggestedUsername: 'nujahath',
      message: 'Voice phrase verified. Please enter your vault password to complete zero-trust authentication.',
    });
    return;
  }

  res.status(400).json({
    matched: false,
    message: 'Voice phrase did not match required verification phrase ("This is Nujahath."). Please try again or use manual login.',
  });
});

/**
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (req.token) {
    revokeSessionToken(req.token);
  }
  if (req.user) {
    logAuditEvent({
      actorId: req.user.id,
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'LOGOUT',
      resourceType: 'AUTH',
      outcome: 'SUCCESS',
      context: { ip: req.ip },
    });
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/me
 */
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }
  const { passwordHash: _ph, salt: _s, ...safeUser } = req.user as any;
  res.json({ user: safeUser });
});

/* ==========================================================================
   DOCUMENT ROUTES
   ========================================================================== */

/**
 * GET /api/documents
 * List accessible documents filtered strictly by server-side authorization
 */
app.get('/api/documents', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const { category, search, scope, sort = 'newest' } = req.query;

  const accessibleDocs: Array<VaultDocument & { permissions: PermissionLevel[] }> = [];

  for (const doc of documents.values()) {
    const authz = authorizeDocumentAction(actor, doc.id, 'LIST');
    if (authz.authorized) {
      // Scope filtering
      if (scope === 'owned' && doc.ownerId !== actor.id) continue;
      if (scope === 'shared' && doc.ownerId === actor.id) continue;

      // Category filtering
      if (category && category !== 'ALL' && doc.category !== category) continue;

      // Search filtering
      if (search && typeof search === 'string' && search.trim().length > 0) {
        const q = search.trim().toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesIssuer = doc.issuer.toLowerCase().includes(q);
        const matchesCategory = doc.category.toLowerCase().includes(q);
        const matchesSubCat = doc.subCategory ? doc.subCategory.toLowerCase().includes(q) : false;
        const matchesTags = doc.tags ? doc.tags.some((t) => t.toLowerCase().includes(q)) : false;

        if (!matchesTitle && !matchesIssuer && !matchesCategory && !matchesSubCat && !matchesTags) {
          continue;
        }
      }

      accessibleDocs.push({
        ...doc,
        permissions: authz.grantedPermissions || [],
      });
    }
  }

  // Sorting
  accessibleDocs.sort((a, b) => {
    if (sort === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sort === 'title') {
      return a.title.localeCompare(b.title);
    }
    // Default: newest
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  res.json({ documents: accessibleDocs });
});

/**
 * GET /api/documents/:id
 * Retrieve document metadata after authorization check
 */
app.get('/api/documents/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const docId = req.params.id;

  const authz = authorizeDocumentAction(actor, docId, 'VIEW', { ip: req.ip, userAgent: req.headers['user-agent'] });
  if (!authz.authorized || !authz.document) {
    res.status(403).json({ error: `ACCESS_DENIED: ${authz.reasonCode}` });
    return;
  }

  res.json({
    document: {
      ...authz.document,
      permissions: authz.grantedPermissions || [],
    },
  });
});

/**
 * POST /api/documents/:id/unlock
 * File-Name Lock verification: User must enter exact document title to unlock viewer
 */
app.post('/api/documents/:id/unlock', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const docId = req.params.id;
  const { enteredName } = req.body;

  if (!enteredName || typeof enteredName !== 'string') {
    res.status(400).json({ error: 'Document name confirmation is required.' });
    return;
  }

  // 1. Authorize actor
  const authz = authorizeDocumentAction(actor, docId, 'VIEW', { ip: req.ip, userAgent: req.headers['user-agent'] });
  if (!authz.authorized || !authz.document) {
    res.status(403).json({ error: `ACCESS_DENIED: ${authz.reasonCode}` });
    return;
  }

  const doc = authz.document;
  const normalizedEntered = enteredName.trim().toLowerCase();
  const normalizedTitle = doc.title.trim().toLowerCase();
  const normalizedOriginalFileName = doc.originalFileName.trim().toLowerCase();

  // Match title or original filename
  const isMatch =
    normalizedEntered === normalizedTitle ||
    normalizedEntered === normalizedOriginalFileName ||
    normalizedEntered === normalizedTitle.replace(/\s+/g, ' ');

  if (!isMatch) {
    logAuditEvent({
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: actor.role,
      action: 'FILENAME_LOCK_FAILURE',
      resourceId: docId,
      resourceType: 'DOCUMENT',
      outcome: 'FAILURE',
      reasonCode: 'NAME_MISMATCH',
      context: {
        fileNameEntered: enteredName.slice(0, 100),
        details: 'Incorrect document name entered at lock screen',
        ip: req.ip,
      },
    });

    res.status(400).json({
      error: 'NAME_MISMATCH: The entered document name does not match the vault record. Please verify and try again.',
    });
    return;
  }

  // Generate short-lived signed access token (valid for 60 seconds)
  const shortLivedToken = generateShortLivedDownloadToken(docId, actor.id, 60);

  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'FILENAME_LOCK_SUCCESS',
    resourceId: docId,
    resourceType: 'DOCUMENT',
    outcome: 'SUCCESS',
    reasonCode: 'NAME_CONFIRMED',
    context: { details: 'Document successfully unlocked via name confirmation', ip: req.ip },
  });

  res.json({
    unlocked: true,
    streamToken: shortLivedToken,
    expiresInSeconds: 60,
    canDownload: authz.grantedPermissions?.includes('DOWNLOAD') ?? false,
  });
});

/**
 * GET /api/documents/:id/stream
 * Protected document streaming endpoint (never exposes public URLs)
 */
app.get('/api/documents/:id/stream', (req: Request, res: Response) => {
  const docId = req.params.id;
  const token = (req.query.token as string) || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    res.status(401).json({ error: 'UNAUTHENTICATED: Access token required for secure stream.' });
    return;
  }

  // Verify either session token or short-lived signed download token
  let actor: User | null = null;
  const session = verifySessionToken(token);

  if (session) {
    actor = users.get(session.userId) || null;
  } else {
    // Check if it's a short-lived download token
    try {
      const parts = token.split('.');
      if (parts.length === 2) {
        const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        if (payload.docId === docId && payload.uid) {
          if (verifyShortLivedDownloadToken(token, docId, payload.uid)) {
            actor = users.get(payload.uid) || null;
          }
        }
      }
    } catch {
      actor = null;
    }
  }

  if (!actor || actor.status === 'SUSPENDED') {
    res.status(401).json({ error: 'UNAUTHENTICATED: Valid active session or token required.' });
    return;
  }

  // Enforce zero-trust authorization
  const authz = authorizeDocumentAction(actor, docId, 'VIEW', { ip: req.ip, userAgent: req.headers['user-agent'] });
  if (!authz.authorized || !authz.document) {
    res.status(403).json({ error: `ACCESS_DENIED: ${authz.reasonCode}` });
    return;
  }

  const doc = authz.document;
  const fileEntry = fileStore.get(doc.storageKey);

  if (!fileEntry) {
    res.status(404).json({ error: 'FILE_NOT_FOUND: Document content could not be located in secure store.' });
    return;
  }

  // Audit view
  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'DOCUMENT_VIEW',
    resourceId: docId,
    resourceType: 'DOCUMENT',
    outcome: 'SUCCESS',
    context: { ip: req.ip, userAgent: req.headers['user-agent'] },
  });

  // Strict headers preventing caching and execution
  res.setHeader('Content-Type', fileEntry.mimeType);
  res.setHeader('Content-Length', fileEntry.buffer.length);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");

  res.send(fileEntry.buffer);
});

/**
 * GET /api/documents/:id/download
 * Protected download endpoint (strictly requires DOWNLOAD permission)
 */
app.get('/api/documents/:id/download', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const docId = req.params.id;

  const authz = authorizeDocumentAction(actor, docId, 'DOWNLOAD', { ip: req.ip, userAgent: req.headers['user-agent'] });
  if (!authz.authorized || !authz.document) {
    res.status(403).json({ error: `ACCESS_DENIED: ${authz.reasonCode}. Download permission is required.` });
    return;
  }

  const doc = authz.document;
  const fileEntry = fileStore.get(doc.storageKey);

  if (!fileEntry) {
    res.status(404).json({ error: 'FILE_NOT_FOUND: Document content missing.' });
    return;
  }

  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'DOCUMENT_DOWNLOAD',
    resourceId: docId,
    resourceType: 'DOCUMENT',
    outcome: 'SUCCESS',
    context: { ip: req.ip, details: `Downloaded ${doc.originalFileName}` },
  });

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalFileName)}"`);
  res.setHeader('Content-Type', fileEntry.mimeType);
  res.setHeader('Content-Length', fileEntry.buffer.length);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

  res.send(fileEntry.buffer);
});

/**
 * POST /api/documents/upload
 * Real file upload to private vault storage with metadata validation
 */
app.post('/api/documents/upload', authenticateToken, upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;

  // Only OWNER can upload their own certificates
  if (actor.role !== 'OWNER' && actor.role !== 'ADMIN') {
    res.status(403).json({ error: 'FORBIDDEN: Only vault owners can upload certificates.' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'BAD_REQUEST: No file uploaded.' });
    return;
  }

  const { title, category, subCategory, issuer, issueDate, expiryDate, description, tags } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    res.status(400).json({ error: 'BAD_REQUEST: Document title is required.' });
    return;
  }

  if (!category || typeof category !== 'string') {
    res.status(400).json({ error: 'BAD_REQUEST: Document category is required.' });
    return;
  }

  if (!issuer || typeof issuer !== 'string' || issuer.trim().length === 0) {
    res.status(400).json({ error: 'BAD_REQUEST: Certificate issuer is required.' });
    return;
  }

  // Validate magic bytes / file signatures to prevent MIME spoofing
  const buffer = file.buffer;
  let detectedMime = file.mimetype;

  if (buffer.length < 4) {
    res.status(400).json({ error: 'INVALID_FILE: File is empty or malformed.' });
    return;
  }

  // PDF signature: %PDF (0x25 0x50 0x44 0x46)
  const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  // PNG signature: 89 50 4E 47
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  // JPEG signature: FF D8 FF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  // SVG signature (contains '<svg')
  const isSvg = buffer.toString('utf8', 0, Math.min(buffer.length, 100)).includes('<svg');

  if (!isPdf && !isPng && !isJpeg && !isSvg) {
    res.status(400).json({
      error: 'FILE_SIGNATURE_MISMATCH: File magic bytes do not match declared format. Rejected for security.',
    });
    return;
  }

  const docId = `doc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const storageKey = `storage_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  // Store in private storage
  fileStore.set(storageKey, {
    buffer: file.buffer,
    mimeType: detectedMime,
    originalName: file.originalname,
  });

  const parsedTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  const newDoc: VaultDocument = {
    id: docId,
    ownerId: actor.id,
    ownerUsername: actor.username,
    title: title.trim(),
    normalizedTitle: title.trim().toLowerCase(),
    category: category.trim(),
    subCategory: subCategory ? subCategory.trim() : undefined,
    issuer: issuer.trim(),
    issueDate: issueDate || undefined,
    expiryDate: expiryDate || undefined,
    verificationStatus: 'SELF_ASSERTED', // Verified status only when genuine verified issuer confirms
    storageKey,
    mimeType: detectedMime,
    fileSize: file.size,
    originalFileName: file.originalname,
    description: description ? description.trim() : undefined,
    tags: parsedTags,
    createdAt: now,
    updatedAt: now,
    isLocked: true,
  };

  documents.set(docId, newDoc);

  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'DOCUMENT_UPLOAD',
    resourceId: docId,
    resourceType: 'DOCUMENT',
    outcome: 'SUCCESS',
    context: {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: detectedMime,
      category,
      ip: req.ip,
    },
  });

  res.status(201).json({
    document: {
      ...newDoc,
      permissions: ['VIEW', 'DOWNLOAD', 'MANAGE_ACCESS'],
    },
    message: 'Certificate uploaded and secured in vault successfully.',
  });
});

/**
 * PATCH /api/documents/:id
 * Update permitted metadata
 */
app.patch('/api/documents/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const docId = req.params.id;

  const authz = authorizeDocumentAction(actor, docId, 'EDIT_METADATA', { ip: req.ip });
  if (!authz.authorized || !authz.document) {
    res.status(403).json({ error: `ACCESS_DENIED: ${authz.reasonCode}. Only the owner can modify metadata.` });
    return;
  }

  const doc = authz.document;
  const { title, issuer, issueDate, expiryDate, category, subCategory, description } = req.body;

  if (title) {
    doc.title = title.trim();
    doc.normalizedTitle = title.trim().toLowerCase();
  }
  if (issuer) doc.issuer = issuer.trim();
  if (issueDate !== undefined) doc.issueDate = issueDate;
  if (expiryDate !== undefined) doc.expiryDate = expiryDate;
  if (category) doc.category = category;
  if (subCategory !== undefined) doc.subCategory = subCategory;
  if (description !== undefined) doc.description = description;

  doc.updatedAt = new Date().toISOString();
  documents.set(docId, doc);

  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'METADATA_UPDATE',
    resourceId: docId,
    resourceType: 'DOCUMENT',
    outcome: 'SUCCESS',
    context: { details: 'Updated document metadata', ip: req.ip },
  });

  res.json({ document: doc, message: 'Document metadata updated successfully.' });
});

/**
 * DELETE /api/documents/:id
 * Delete document and revoke all active grants
 */
app.delete('/api/documents/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const docId = req.params.id;

  const authz = authorizeDocumentAction(actor, docId, 'DELETE', { ip: req.ip });
  if (!authz.authorized || !authz.document) {
    res.status(403).json({ error: `ACCESS_DENIED: ${authz.reasonCode}. Only the owner can delete this document.` });
    return;
  }

  const doc = authz.document;

  // Remove storage file
  fileStore.delete(doc.storageKey);

  // Revoke all grants
  for (const [gId, g] of permissions.entries()) {
    if (g.documentId === docId) {
      permissions.delete(gId);
    }
  }

  documents.delete(docId);

  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'DOCUMENT_DELETE',
    resourceId: docId,
    resourceType: 'DOCUMENT',
    outcome: 'SUCCESS',
    context: { title: doc.title, ip: req.ip },
  });

  res.json({ success: true, message: 'Document removed from vault.' });
});

/* ==========================================================================
   PERMISSIONS & ACCESS MANAGEMENT ROUTES
   ========================================================================== */

/**
 * GET /api/permissions/document/:id
 * List active and historical grants for a document
 */
app.get('/api/permissions/document/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const docId = req.params.id;

  const authz = authorizeDocumentAction(actor, docId, 'MANAGE_ACCESS', { ip: req.ip });
  if (!authz.authorized) {
    res.status(403).json({ error: `ACCESS_DENIED: ${authz.reasonCode}. MANAGE_ACCESS permission required.` });
    return;
  }

  const docGrants = Array.from(permissions.values()).filter((g) => g.documentId === docId);
  res.json({ grants: docGrants });
});

/**
 * GET /api/permissions/shared-with-me
 */
app.get('/api/permissions/shared-with-me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const now = new Date();

  const shared = Array.from(permissions.values()).filter(
    (g) => g.recipientId === actor.id && g.status === 'ACTIVE' && (!g.expiresAt || new Date(g.expiresAt) > now)
  );

  res.json({ grants: shared });
});

/**
 * GET /api/permissions/shared-by-me
 */
app.get('/api/permissions/shared-by-me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const shared = Array.from(permissions.values()).filter((g) => g.grantedBy === actor.id);
  res.json({ grants: shared });
});

/**
 * POST /api/permissions/grant
 * Grant per-document permissions to a specific registered user
 */
app.post('/api/permissions/grant', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const { documentId, recipientUsername, permissions: requestedPerms, expiresAt } = req.body;

  if (!documentId || !recipientUsername || !Array.isArray(requestedPerms) || requestedPerms.length === 0) {
    res.status(400).json({ error: 'BAD_REQUEST: documentId, recipientUsername, and permissions array are required.' });
    return;
  }

  // 1. Authorize actor
  const authz = authorizeDocumentAction(actor, documentId, 'GRANT_ACCESS', { ip: req.ip });
  if (!authz.authorized || !authz.document) {
    res.status(403).json({ error: `ACCESS_DENIED: ${authz.reasonCode}. You cannot grant access to this document.` });
    return;
  }

  // 2. Lookup recipient
  const normRecipient = recipientUsername.trim().toLowerCase();
  const recipientId = usernameIndex.get(normRecipient);
  const recipient = recipientId ? users.get(recipientId) : null;

  if (!recipient) {
    res.status(404).json({ error: `RECIPIENT_NOT_FOUND: User '${recipientUsername}' does not exist in Certibank.` });
    return;
  }

  if (recipient.id === actor.id) {
    res.status(400).json({ error: 'INVALID_RECIPIENT: You cannot grant access to yourself (you already own the document).' });
    return;
  }

  // Validate permission levels
  const validLevels: PermissionLevel[] = ['VIEW', 'DOWNLOAD', 'MANAGE_ACCESS'];
  const sanitizedPerms = requestedPerms.filter((p: any) => validLevels.includes(p)) as PermissionLevel[];

  if (sanitizedPerms.length === 0) {
    res.status(400).json({ error: 'INVALID_PERMISSIONS: Must specify at least VIEW, DOWNLOAD, or MANAGE_ACCESS.' });
    return;
  }

  // Expiration check
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    res.status(400).json({ error: 'INVALID_EXPIRY: Expiration timestamp must be in the future.' });
    return;
  }

  const grantId = `grant_${crypto.randomUUID()}`;
  const newGrant: DocumentPermissionGrant = {
    id: grantId,
    documentId,
    documentTitle: authz.document.title,
    recipientId: recipient.id,
    recipientUsername: recipient.username,
    grantedBy: actor.id,
    permissions: sanitizedPerms,
    grantedAt: new Date().toISOString(),
    expiresAt: expiresAt || undefined,
    status: 'ACTIVE',
  };

  permissions.set(grantId, newGrant);

  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'PERMISSION_GRANT',
    resourceId: documentId,
    resourceType: 'PERMISSION',
    outcome: 'SUCCESS',
    context: {
      targetUserId: recipient.id,
      recipientUsername: recipient.username,
      permissionsGranted: sanitizedPerms,
      expiresAt,
      ip: req.ip,
    },
  });

  res.status(201).json({
    grant: newGrant,
    message: `Access successfully granted to ${recipient.username}.`,
  });
});

/**
 * POST /api/permissions/revoke
 * Immediately revoke an active grant
 */
app.post('/api/permissions/revoke', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const { grantId } = req.body;

  if (!grantId) {
    res.status(400).json({ error: 'BAD_REQUEST: grantId is required.' });
    return;
  }

  const grant = permissions.get(grantId);
  if (!grant) {
    res.status(404).json({ error: 'GRANT_NOT_FOUND: Permission record does not exist.' });
    return;
  }

  // Verify that actor can revoke (must be document owner or original grantor)
  const doc = documents.get(grant.documentId);
  if (!doc) {
    permissions.delete(grantId);
    res.json({ success: true, message: 'Orphaned grant removed.' });
    return;
  }

  const isOwner = doc.ownerId === actor.id;
  const isGrantor = grant.grantedBy === actor.id;

  if (!isOwner && !isGrantor && actor.role !== 'ADMIN') {
    logAuditEvent({
      actorId: actor.id,
      actorUsername: actor.username,
      actorRole: actor.role,
      action: 'ACCESS_DENIED',
      resourceId: grantId,
      resourceType: 'PERMISSION',
      outcome: 'DENIED',
      reasonCode: 'UNAUTHORIZED_REVOCATION_ATTEMPT',
      context: { details: `User ${actor.username} attempted unauthorized revocation of grant ${grantId}`, ip: req.ip },
    });
    res.status(403).json({ error: 'FORBIDDEN: You do not have authority to revoke this grant.' });
    return;
  }

  // Persist revocation
  grant.status = 'REVOKED';
  grant.revokedAt = new Date().toISOString();
  permissions.set(grantId, grant);

  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'PERMISSION_REVOKE',
    resourceId: grant.documentId,
    resourceType: 'PERMISSION',
    outcome: 'SUCCESS',
    context: {
      grantId,
      revokedFromUser: grant.recipientUsername,
      ip: req.ip,
      note: 'Revocation active immediately on subsequent requests. Existing cached device downloads cannot be erased.',
    },
  });

  res.json({
    success: true,
    message: `Access for ${grant.recipientUsername} has been revoked immediately.`,
  });
});

/* ==========================================================================
   AUDIT & INTEGRITY ROUTES
   ========================================================================== */

/**
 * GET /api/audit
 * Retrieve authorized audit trail
 */
app.get('/api/audit', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const { action, outcome, limit } = req.query;

  let events = getAuditEvents({
    action: action as any,
    outcome: outcome as any,
    limit: limit ? parseInt(limit as string, 10) : 100,
  });

  // Filter based on role:
  // Non-admins only see audit records where they are the actor OR that involve documents they own
  if (actor.role !== 'ADMIN') {
    const ownedDocIds = new Set(
      Array.from(documents.values())
        .filter((d) => d.ownerId === actor.id)
        .map((d) => d.id)
    );

    events = events.filter((e) => e.actorId === actor.id || (e.resourceId && ownedDocIds.has(e.resourceId)));
  }

  res.json({ events });
});

/**
 * GET /api/audit/verify
 * Cryptographic verification of tamper-evident SHA-256 audit chain
 */
app.get('/api/audit/verify', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const result = verifyAuditChainIntegrity();

  logAuditEvent({
    actorId: req.user!.id,
    actorUsername: req.user!.username,
    actorRole: req.user!.role,
    action: 'INTEGRITY_CHECK',
    resourceType: 'SYSTEM',
    outcome: result.isValid ? 'SUCCESS' : 'FAILURE',
    reasonCode: result.isValid ? 'CHAIN_VALID' : 'CHAIN_CORRUPTED',
    context: { details: result.message, totalRecords: result.totalRecords, ip: req.ip },
  });

  res.json(result);
});

/* ==========================================================================
   ADMINISTRATION ROUTES
   ========================================================================== */

/**
 * GET /api/admin/users
 */
app.get('/api/admin/users', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const list = Array.from(users.values()).map(({ passwordHash: _ph, salt: _s, ...safe }) => safe);
  res.json({ users: list });
});

/**
 * POST /api/admin/users/:id/status
 * Suspend or reactivate user accounts
 */
app.post('/api/admin/users/:id/status', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const targetId = req.params.id;
  const { status } = req.body;

  if (targetId === actor.id) {
    res.status(400).json({ error: 'ADMIN_SAFETY: You cannot suspend your own administrative account.' });
    return;
  }

  const targetUser = users.get(targetId);
  if (!targetUser) {
    res.status(404).json({ error: 'USER_NOT_FOUND' });
    return;
  }

  if (status !== 'ACTIVE' && status !== 'SUSPENDED') {
    res.status(400).json({ error: 'INVALID_STATUS: Status must be ACTIVE or SUSPENDED.' });
    return;
  }

  targetUser.status = status;
  targetUser.updatedAt = new Date().toISOString();
  users.set(targetId, targetUser);

  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: status === 'SUSPENDED' ? 'USER_SUSPEND' : 'USER_ACTIVATE',
    resourceId: targetId,
    resourceType: 'USER',
    outcome: 'SUCCESS',
    context: { targetUsername: targetUser.username, newStatus: status, ip: req.ip },
  });

  res.json({ success: true, user: targetUser, message: `User status changed to ${status}.` });
});

/**
 * POST /api/admin/users/:id/role
 * Manage user roles (prevent self-promotion/self-demotion)
 */
app.post('/api/admin/users/:id/role', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  const targetId = req.params.id;
  const { role } = req.body;

  if (targetId === actor.id) {
    res.status(400).json({ error: 'ADMIN_SAFETY: You cannot modify your own role.' });
    return;
  }

  const targetUser = users.get(targetId);
  if (!targetUser) {
    res.status(404).json({ error: 'USER_NOT_FOUND' });
    return;
  }

  const validRoles: UserRole[] = ['OWNER', 'VIEWER', 'ADMIN'];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: 'INVALID_ROLE: Must be OWNER, VIEWER, or ADMIN.' });
    return;
  }

  const oldRole = targetUser.role;
  targetUser.role = role;
  targetUser.updatedAt = new Date().toISOString();
  users.set(targetId, targetUser);

  logAuditEvent({
    actorId: actor.id,
    actorUsername: actor.username,
    actorRole: actor.role,
    action: 'USER_ROLE_CHANGE',
    resourceId: targetId,
    resourceType: 'USER',
    outcome: 'SUCCESS',
    context: { targetUsername: targetUser.username, oldRole, newRole: role, ip: req.ip },
  });

  res.json({ success: true, user: targetUser, message: `User role updated to ${role}.` });
});

/**
 * GET /api/admin/stats
 */
app.get('/api/admin/stats', authenticateToken, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const totalUsers = users.size;
  const activeUsers = Array.from(users.values()).filter((u) => u.status === 'ACTIVE').length;
  const suspendedUsers = totalUsers - activeUsers;

  const totalDocs = documents.size;
  const totalGrants = permissions.size;
  const activeGrants = Array.from(permissions.values()).filter((g) => g.status === 'ACTIVE').length;

  const auditEvents = getAuditEvents();
  const deniedEvents = auditEvents.filter((e) => e.outcome === 'DENIED');
  const failedLogins = auditEvents.filter((e) => e.action === 'LOGIN_FAILURE');

  res.json({
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalDocs,
    totalGrants,
    activeGrants,
    totalAuditRecords: auditEvents.length,
    securityIncidents: deniedEvents.length + failedLogins.length,
    tamperIntegrityVerified: verifyAuditChainIntegrity().isValid,
  });
});

/* ==========================================================================
   CATEGORIES & DASHBOARD STATS
   ========================================================================== */

/**
 * GET /api/categories
 */
app.get('/api/categories', (_req: Request, res: Response) => {
  res.json({ categories: Array.from(customCategories) });
});

/**
 * POST /api/categories
 */
app.post('/api/categories', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }
  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  customCategories.add(clean);
  res.json({ categories: Array.from(customCategories), newCategory: clean });
});

/**
 * GET /api/stats
 */
app.get('/api/stats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.user!;
  let totalCertificates = 0;
  let governmentCount = 0;
  let educationalCount = 0;
  let professionalCount = 0;
  let courseCount = 0;
  let sharedWithMeCount = 0;
  let sharedByMeCount = 0;

  for (const doc of documents.values()) {
    const authz = authorizeDocumentAction(actor, doc.id, 'LIST');
    if (authz.authorized) {
      totalCertificates++;
      if (doc.category === 'GOVERNMENT') governmentCount++;
      if (doc.category === 'EDUCATIONAL') educationalCount++;
      if (doc.category === 'PROFESSIONAL') professionalCount++;
      if (doc.category === 'COURSES_TRAINING') courseCount++;
      if (doc.ownerId !== actor.id) sharedWithMeCount++;
    }
    if (doc.ownerId === actor.id) {
      // Check if document has active grants
      const hasGrants = Array.from(permissions.values()).some((g) => g.documentId === doc.id && g.status === 'ACTIVE');
      if (hasGrants) sharedByMeCount++;
    }
  }

  const activeGrantsCount = Array.from(permissions.values()).filter(
    (g) => (g.grantedBy === actor.id || g.recipientId === actor.id) && g.status === 'ACTIVE'
  ).length;

  const userAudits = getAuditEvents({ actorId: actor.id });
  const incidents = userAudits.filter((e) => e.outcome === 'DENIED').length;

  res.json({
    totalCertificates,
    governmentCount,
    educationalCount,
    professionalCount,
    courseCount,
    sharedWithMeCount,
    sharedByMeCount,
    activeGrantsCount,
    totalUsersCount: users.size,
    securityIncidentsCount: incidents,
    auditEventsCount: userAudits.length,
    tamperIntegrityVerified: verifyAuditChainIntegrity().isValid,
  });
});

/* ==========================================================================
   VITE DEV SERVER / PRODUCTION STATIC SERVING
   ========================================================================== */

const PORT = 3000;

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CERTIBANK] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
