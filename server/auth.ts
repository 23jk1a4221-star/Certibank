import crypto from 'node:crypto';
import type { User, UserRole, AccountStatus } from '../src/types/index.ts';

// Secret key for HMAC token signing (kept strictly server-side)
const SERVER_TOKEN_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Revoked tokens store for logout and session invalidation
const revokedTokens = new Set<string>();

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

/**
 * Hash password using PBKDF2 with unique salt and SHA-512
 * Secure, zero plaintext storage
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
    .toString('hex');
  return { hash, salt };
}

/**
 * Verify password with constant-time comparison to prevent timing attacks
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    const computedBuf = Buffer.from(computedHash, 'hex');
    const expectedBuf = Buffer.from(hash, 'hex');
    if (computedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  exp: number;
  jti: string;
}

/**
 * Create cryptographically signed bearer token
 */
export function createSessionToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + TOKEN_EXPIRY_MS,
    jti: crypto.randomUUID(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SERVER_TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode bearer token, checking signature and expiration
 */
export function verifySessionToken(token: string): TokenPayload | null {
  if (!token || revokedTokens.has(token)) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, providedSig] = parts;

  // Verify HMAC signature with timing-safe comparison
  const expectedSig = crypto
    .createHmac('sha256', SERVER_TOKEN_SECRET)
    .update(payloadB64)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig);
  const expectedBuf = Buffer.from(expectedSig);

  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  try {
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: TokenPayload = JSON.parse(payloadStr);

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Revoke session token
 */
export function revokeSessionToken(token: string): void {
  if (token) {
    revokedTokens.add(token);
  }
}

/**
 * Generate short-lived signed download token for single-use or timed private file access
 */
export function generateShortLivedDownloadToken(documentId: string, userId: string, ttlSeconds = 60): string {
  const payload = {
    docId: documentId,
    uid: userId,
    exp: Date.now() + ttlSeconds * 1000,
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SERVER_TOKEN_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifyShortLivedDownloadToken(token: string, documentId: string, userId: string): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [b64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SERVER_TOKEN_SECRET).update(b64).digest('base64url');
  if (sig !== expectedSig) return false;

  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (payload.docId !== documentId || payload.uid !== userId) return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}
