# Certibank — A Trust Vault

> Enterprise-grade digital certificate vault with zero-trust document security, per-document permissions (ABAC), voice-assisted login, and tamper-evident cryptographic audit trail.

---

## 1. Overview & Architecture

**Certibank** is a full-stack certificate management and trust verification application designed for security-critical environments. Built using React, TypeScript, Express, and modern cryptographic primitives, it ensures that civil, academic, and professional credentials remain strictly private and verifiable.

### Core Architectural Pillars
- **Zero-Trust Document Security**: Every protected byte stream (`/api/documents/:id/stream`) and download request independently validates the user's active session, ownership or explicit unexpired sharing grant, and account status.
- **Granular Attribute-Based Access Control (ABAC)**: Document owners can grant distinct permission levels (`VIEW`, `DOWNLOAD`, `MANAGE_ACCESS`) with optional expiration timestamps. `VIEW` does not grant `DOWNLOAD`.
- **Immediate Access Revocation**: Once a grant is revoked, subsequent streaming or download requests are terminated instantly on the server.
- **File-Name Lock Confirmation**: An extra layer of confirmation prompts users to enter the exact document name before decrypting the ephemeral stream URL.
- **Tamper-Evident SHA-256 Chained Audit Trail**: Server-controlled append-only event ledger chaining cryptographic hashes from the genesis block. Chain verification mathematically proves that no records have been altered.
- **Voice-Assisted Login**: Web Speech API assistant recognizing the required spoken phrase `"This is Nujahath."` for rapid username autofill without bypassing password verification.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Node.js, Express, Multer (in-memory secure multipart handling with magic-byte inspection).
- **Authentication**: PBKDF2 with unique salts (100,000 iterations, SHA-512), timing-safe comparisons, and HMAC-SHA256 signed bearer tokens.
- **Database & Storage**: Authoritative server store with pre-seeded synthetic certificates, plus production-ready `firebase-blueprint.json`, `firestore.rules`, and `storage.rules`.
- **Testing**: Automated zero-trust security test suite with mutation testing simulation (`tests/security.test.ts`).

---

## 3. Development Accounts (100-Mark Evaluation)

Certibank comes pre-configured with three distinct development evaluation accounts:

| Role | Username | Password | Privileges |
| :--- | :--- | :--- | :--- |
| **OWNER** | `nujahath` | `--nujhath5--` | Full vault ownership, upload certificates, edit metadata, grant/revoke permissions, view audit history |
| **VIEWER** | `viewer_auditor` | `--viewerPass9--` | View and download only explicitly shared certificates; zero access to unshared documents |
| **ADMIN** | `certi_admin` | `--adminVault7--` | User management, account suspension/reactivation, security event monitoring; **no automated backdoor access to private certificates** |

---

## 4. Getting Started

### Prerequisites
- Node.js 20+
- npm or bun

### Installation
```bash
npm install
```

### Running the Application
```bash
# Starts full-stack Express server with Vite middleware on port 3000
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Automated Security Tests
```bash
npm test
```
Executes all 18 security tests covering Authentication, IDOR, Granular Permissions, Storage, Audit Integrity, and Mutation testing.

---

## 5. Security & Verification Rules

- **Firestore Rules**: Hardened in `firestore.rules` adhering to the Eight Pillars of Zero-Trust Security.
- **Storage Rules**: Configured in `storage.rules` disabling anonymous reads and restricting file sizes to 10MB.
- **Threat Model**: Documented in `THREATS.md` covering 21 threat scenarios.
- **Traceability Matrix**: Viewable directly in-app via the **Evaluation & Demo** top navbar button.
