# CERTIBANK — ZERO-TRUST SECURITY THREAT MODEL (THREATS.md)

This threat model outlines the assets, adversary capabilities, threat scenarios, implemented mitigations, automated regression tests, and residual risks for **Certibank — A Trust Vault**.

---

## 1. INSECURE DIRECT OBJECT REFERENCE (IDOR / BOLA)
- **Asset**: Private certificate documents, credentials, and identity records.
- **Attacker**: Authenticated user (e.g. Owner B or malicious viewer).
- **Preconditions**: Attacker has a valid account and obtains the UUID of another user's document.
- **Attack Scenario**: Attacker sends `GET /api/documents/doc_gov_birth` or attempts direct download of Owner A's certificate by guessing or scraping document identifiers.
- **Impact**: Unauthorized exposure of Personally Identifiable Information (PII) and official civil credentials.
- **Prevention**: Centralized server-side `authorizeDocumentAction(actor, documentId, action)` strictly denies any document access unless the caller is verified as the document owner or possesses an active, unexpired sharing grant in the `document_permissions` ledger.
- **Detection**: Every unauthorized access attempt triggers an `ACCESS_DENIED` audit record with reason code `NO_SHARING_GRANT` and correlation tracking.
- **Regression Test**: `tests/security.test.ts` test: *"IDOR: Owner A cannot VIEW Owner B private document"* and *"IDOR: Owner A cannot DOWNLOAD Owner B private document"*.
- **Status & Residual Risk**: Implemented and verified. Residual risk is limited to physical device compromise of authorized owners.

---

## 2. VOICE PHRASE REPLAY ATTACK
- **Asset**: User authentication session and vault access.
- **Attacker**: Attacker with a microphone recording of the victim saying `"This is Nujahath."`
- **Preconditions**: Attacker obtains audio recording of the victim's voice.
- **Attack Scenario**: Attacker plays back the recorded phrase to the voice recognition modal to gain full vault access.
- **Impact**: Account takeover if voice recognition were used as an authentication proof.
- **Prevention**: Voice recognition is strictly treated as an assistive convenience feature for username pre-fill. The backend strictly requires password authentication using PBKDF2 with SHA-512 salting. The voice endpoint never issues authentication tokens.
- **Detection**: Voice phrase attempts are logged as assistive events.
- **Regression Test**: `tests/security.test.ts` test: *"Valid credentials verify correctly with PBKDF2"* and *"Invalid credentials are strictly denied"*.
- **Status & Residual Risk**: Implemented and verified. Zero risk of authentication bypass via audio playback.

---

## 3. PRIVILEGE ESCALATION (CLIENT ROLE SPOOFING & SELF-PROMOTION)
- **Asset**: Administrative endpoints and user role definitions.
- **Attacker**: Authenticated non-admin user (Owner or Viewer).
- **Preconditions**: Attacker intercepts client payload and modifies their `role` attribute to `ADMIN`.
- **Attack Scenario**: Attacker sends `{ role: 'ADMIN' }` in a request body or adds an `admin: true` field in an update payload.
- **Impact**: Attacker gains ability to suspend accounts, modify user credentials, or inspect system logs.
- **Prevention**: The server derives the caller's role exclusively from the cryptographically signed HMAC bearer token, which is linked to trusted database state. Non-admin users cannot call administrative endpoints (`requireAdmin` middleware denies with HTTP 403). Administrators cannot promote themselves or modify their own role.
- **Detection**: Authorization denial logged as `ADMIN_PRIVILEGE_REQUIRED`.
- **Regression Test**: `tests/security.test.ts` test: *"Non-admin users cannot call admin APIs"* and *"Client role spoofing does not work"*.
- **Status & Residual Risk**: Implemented and verified.

---

## 4. TOKEN REPLAY & REVOKED SESSION REUSE
- **Asset**: Authenticated API session state.
- **Attacker**: Adversary who intercepts a bearer token from network logs or browser storage.
- **Preconditions**: Attacker obtains an old or logged-out bearer token.
- **Attack Scenario**: Attacker presents an expired or revoked token to access protected streaming endpoints.
- **Impact**: Unauthorized access to vault documents past session termination.
- **Prevention**: Bearer tokens carry explicit expiration timestamps (`TOKEN_EXPIRY_MS`). The backend maintains a centralized in-memory and database token revocation registry (`revokedTokens`). When a user logs out, the token is added to the revocation set and denied immediately.
- **Detection**: Replay attempts of revoked tokens return `401 UNAUTHENTICATED`.
- **Regression Test**: `tests/security.test.ts` test: *"Revoked sessions are immediately invalidated"*.
- **Status & Residual Risk**: Implemented and verified.

---

## 5. STORAGE URL LEAKAGE & UNPROTECTED BLOB ACCESS
- **Asset**: Private certificate files stored in cloud storage.
- **Attacker**: Anonymous internet scraper or unauthorized user.
- **Preconditions**: Attacker obtains a storage bucket URL or storage key.
- **Attack Scenario**: Attacker requests `https://storage.googleapis.com/.../document.pdf` directly without authentication.
- **Impact**: Direct unauthenticated bypass of all application access controls.
- **Prevention**: Certificates are stored under opaque UUID storage keys in private storage. Public bucket access is disabled (`allPaths=** allow read, write: if false;`). Documents are streamed exclusively through the server-side endpoint `/api/documents/:id/stream` which authenticates every single request. No permanent public download URLs are ever created.
- **Detection**: Server access logs and audit view records.
- **Regression Test**: `tests/security.test.ts` test: *"Short-lived download token rejects wrong user or document"*.
- **Status & Residual Risk**: Implemented and verified.

---

## 6. STALE PERMISSION CACHES & IMMEDIATE REVOCATION
- **Asset**: Shared document access.
- **Attacker**: Previously authorized viewer whose access was revoked by the document owner.
- **Preconditions**: Viewer had access granted, which the owner subsequently revoked.
- **Attack Scenario**: Viewer attempts to use cached browser permissions or keep an active tab open to continue downloading the document.
- **Impact**: Access to sensitive document continues after owner rescinded consent.
- **Prevention**: The backend does not trust any frontend permission cache. Every request to stream or download re-queries the authoritative permission grant in `server/authorization.ts`. Once an owner clicks "Revoke", the grant status becomes `REVOKED`, and the very next byte-stream request is rejected with `NO_SHARING_GRANT`.
- **Detection**: Denied post-revocation requests generate `ACCESS_DENIED` audit events.
- **Regression Test**: `tests/security.test.ts` test: *"Revoked grants are immediately denied on subsequent requests"*.
- **Status & Residual Risk**: Implemented and verified. Note: Revocation cannot erase files previously downloaded to a recipient's local hard drive.

---

## 7. MALFORMED UPLOADS & MIME TYPE SPOOFING
- **Asset**: Vault storage integrity and server execution environment.
- **Attacker**: Malicious user uploading executable files (e.g. `.exe`, `.sh`, `.php`, `.js`) disguised as `.pdf` or `.png`.
- **Preconditions**: Attacker has an active Owner account with upload rights.
- **Attack Scenario**: Attacker renames a malware script to `degree_certificate.pdf` and uploads it.
- **Impact**: Server execution risk or cross-site scripting (XSS) when viewing the document in-browser.
- **Prevention**: Multi-stage validation:
  1. Multer MIME type allowlist (`application/pdf`, `image/jpeg`, `image/png`, `image/svg+xml`).
  2. File signature (magic bytes) inspection: PDF (`%PDF`), PNG (`0x89 50 4E 47`), JPEG (`0xFF 0xD8 0xFF`), and SVG (`<svg`). Executables lacking these signatures are rejected with HTTP 400.
  3. Size limitation strictly capped at 10 MB.
  4. Content-Security-Policy headers on streaming: `default-src 'none'; style-src 'unsafe-inline'`.
- **Detection**: Failed signature checks generate rejection logs.
- **Regression Test**: `tests/security.test.ts` test: File signature verification suite.
- **Status & Residual Risk**: Implemented and verified.

---

## 8. TAMPERING WITH AUDIT RECORDS
- **Asset**: Forensic audit ledger.
- **Attacker**: Rogue administrator or attacker who compromises database storage.
- **Preconditions**: Attacker has access to modify database records directly.
- **Attack Scenario**: Attacker alters an audit entry's outcome from `DENIED` to `SUCCESS` or deletes an unauthorized access event.
- **Impact**: Concealment of security breaches and loss of non-repudiation.
- **Prevention**: Cryptographic blockchain-style hash chaining. Each audit event record contains `previousHash` and computes its own `hash = SHA256(prevHash + id + timestamp + actorId + action + outcome + resourceId + context)`. Any modification to a historical record breaks the cryptographic chain at that exact index.
- **Detection**: The endpoint `GET /api/audit/verify` iterates through all records and detects any discrepancy.
- **Regression Test**: `tests/security.test.ts` test: *"Tampering with an audit record is mathematically detected"*.
- **Status & Residual Risk**: Implemented and verified.

---

## 9. ADMINISTRATIVE ABUSE (BACKDOOR DOCUMENT ACCESS)
- **Asset**: Private user documents.
- **Attacker**: System administrator account (`certi_admin`).
- **Preconditions**: Attacker logs into the administrative portal.
- **Attack Scenario**: Admin attempts to browse and view private user certificates without owner consent.
- **Impact**: Breach of zero-trust confidentiality; admins spying on users.
- **Prevention**: In Certibank, administrative privileges govern user accounts and audit monitoring only. The authorization engine strictly denies administrators from viewing or downloading document contents unless the owner has explicitly granted them permissions.
- **Detection**: Administrative view attempts on unshared documents generate `ACCESS_DENIED` logs.
- **Regression Test**: `tests/security.test.ts` test: *"Administrator does not automatically get unrestricted access to private certificate contents"*.
- **Status & Residual Risk**: Implemented and verified.

---

## 10. ACCOUNT ENUMERATION & BRUTE FORCE
- **Asset**: User identity database and authentication rate.
- **Attacker**: External unauthenticated adversary.
- **Preconditions**: Attacker submits automated login requests.
- **Attack Scenario**: Attacker tests usernames to see which ones exist or brute-forces passwords.
- **Impact**: Credential guessing and user identification.
- **Prevention**:
  1. Generic error messages: `INVALID_CREDENTIALS: The username or password entered is incorrect.` (identical response whether username is wrong or password is wrong).
  2. Constant-time password verification (`crypto.timingSafeEqual`) preventing timing attacks.
  3. PBKDF2 computational cost (100,000 iterations).
  4. Server audit logging of consecutive `LOGIN_FAILURE` events.
- **Detection**: Failed login monitoring on the Admin Dashboard.
- **Regression Test**: `tests/security.test.ts` test: *"Invalid credentials are strictly denied"*.
- **Status & Residual Risk**: Implemented and verified.

---

## 11. UNINTENTIONAL CREDENTIAL & SENSITIVE DATA LEAKAGE IN LOGS
- **Asset**: User passwords, bearer tokens, and cryptographic keys.
- **Attacker**: Log consumer, monitoring tool, or developer inspecting logs.
- **Preconditions**: Access to application logs or audit records.
- **Attack Scenario**: Attacker reads cleartext passwords or raw signed download tokens from audit logs.
- **Impact**: Credential compromise via telemetry leakage.
- **Prevention**: `logAuditEvent` in `server/audit.ts` automatically strips any `password`, `token`, or `authorization` header fields before persisting the context. Passwords are never logged under any circumstances.
- **Detection**: Automated code audits and sanitized context payloads.
- **Regression Test**: Audit sanitizer assertion in security test suite.
- **Status & Residual Risk**: Implemented and verified. Zero credential leakage.
