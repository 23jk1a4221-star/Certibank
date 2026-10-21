# CERTIBANK — FIVE-MINUTE DEMONSTRATION SCRIPT (DEMO_SCRIPT.md)

This script provides a structured 5-minute evaluation walkthrough showcasing all core functional requirements and zero-trust controls for Certibank.

---

### Phase 1: Introduction & Architecture (0:00 – 0:30)
- **Goal**: Introduce Certibank and the security problem it solves.
- **Talking Points**:
  - *"Welcome to Certibank — A Trust Vault. Traditional document vaults suffer from static public URLs, IDOR vulnerabilities, and blanket administrative access."*
  - *"Certibank implements zero-trust architecture: every byte stream is ephemerally authorized, sharing is governed by Attribute-Based Access Control (ABAC), and every event is recorded in a tamper-evident SHA-256 chained audit ledger."*

---

### Phase 2: Login & Voice Assistance (0:30 – 1:10)
- **Goal**: Demonstrate zero-trust authentication and speech assistance.
- **Actions**:
  1. Open `/login` on [https://ais-dev-sq6jz3w6oxnrrlrgdezq45-980837075887.asia-east1.run.app](https://ais-dev-sq6jz3w6oxnrrlrgdezq45-980837075887.asia-east1.run.app).
  2. Click the **Voice Login** microphone button.
  3. Speak or click **Simulate Voice ("This is Nujahath.")**.
  4. Point out that the voice phrase fills the username but **does not grant access** without the secret password.
  5. Sign in as Owner (`nujahath` / `--nujhath5--`).
  6. Land on `/dashboard`.

---

### Phase 3: Certificate Categories & Upload (1:10 – 1:50)
- **Goal**: Demonstrate category organization and private file upload.
- **Actions**:
  1. Browse sidebar categories: **Government Certificates**, **Educational Certificates**, **Professional Certifications**, and **Courses & Training**.
  2. Click **Deposit Certificate** (or **Upload Certificate** in the sidebar).
  3. Enter document title (e.g. *"Postgraduate Diploma in Cloud Security"*), select category *"PROFESSIONAL"*, enter issuer *"Cloud Security Alliance"*.
  4. Select or generate a sample synthetic certificate.
  5. Click **Deposit & Seal in Vault**.
  6. Verify the certificate appears immediately in the grid with category badge and opaque storage key.

---

### Phase 4: File-Name Lock & Protected Document Viewer (1:50 – 2:30)
- **Goal**: Demonstrate File-Name Lock and ephemeral document streaming.
- **Actions**:
  1. Click **Unlock & View** on *"Date of Birth Registration Certificate"*.
  2. The File-Name Lock modal opens: *"Enter the exact document name to unlock this certificate."*
  3. Intentionally enter an incorrect title (e.g. *"random title"*) -> Verify the red error: `NAME_MISMATCH`.
  4. Enter the exact title: *"Date of Birth Registration Certificate"* and submit.
  5. The protected viewer opens with an ephemeral 60-second stream token.
  6. Highlight the **anti-screen-capture watermark** displaying `@nujahath` and the current date.
  7. Show the Document Passport on the right displaying issuing authority, verification status, and cryptographic storage ID.

---

### Phase 5: Granular Sharing & Instant Revocation (2:30 – 3:15)
- **Goal**: Demonstrate ABAC permissions and real-time revocation.
- **Actions**:
  1. On the CISSP certificate, click the **Share** button.
  2. Select recipient `@viewer_auditor` with **VIEW only** (uncheck DOWNLOAD). Click **Save & Authorize Grant**.
  3. In the top navbar, use the **Role Switcher** to switch to **Auditor (Viewer)** (`viewer_auditor`).
  4. Unlock the certificate as Viewer. Observe that the **Download button is disabled** ("View-Only, Download Restricted").
  5. Switch back to **Owner** (`nujahath`).
  6. Open the sharing modal and click **Revoke**.
  7. Switch back to **Auditor (Viewer)** and refresh: Observe that the document is no longer accessible, and attempts to view return `ACCESS_DENIED`.

---

### Phase 6: IDOR Protection & Admin Isolation (3:15 – 4:00)
- **Goal**: Prove that neither other owners nor administrators can snoop on private certificates.
- **Actions**:
  1. Use the Role Switcher to switch to **Security Administrator** (`certi_admin`).
  2. Open the **Admin Dashboard**: show user accounts list, status suspension, and role modification.
  3. Attempt to stream or access an unshared document directly as Admin: verify server denies access with HTTP 403 `NO_SHARING_GRANT`.
  4. Explain: *"Administrators govern users and audit health, but have zero backdoor access to citizen certificate files."*

---

### Phase 7: Tamper-Evident Audit & Automated Tests (4:00 – 5:00)
- **Goal**: Demonstrate forensic audit trail and test suite execution.
- **Actions**:
  1. Click **Audit Trail** in the sidebar.
  2. Review the chronological ledger showing logins, uploads, views, grants, and revocations with correlation IDs.
  3. Click **Verify Chain**: show the system dynamically recalculating SHA-256 block hashes from genesis to confirm 100% mathematical integrity.
  4. Click **Evaluation & Demo (100 Marks)** in the top navbar to display the full Requirements Traceability Matrix.
  5. Conclude with the passing test suite: 18/18 security tests verified.
