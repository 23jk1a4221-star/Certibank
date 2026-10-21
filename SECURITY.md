# CERTIBANK — SECURITY POLICY & INCIDENT RESPONSE (SECURITY.md)

## 1. Security Philosophy: Zero-Trust by Default
Certibank enforces zero-trust architecture across all layers:
- **No Implicit Trust**: Being an administrator or having authenticated in the past does not confer access to private document contents.
- **Continuous Evaluation**: Every stream request independently checks session validity, grant status, grant expiration, and user account status.
- **Defense in Depth**: File-Name Lock confirmation prevents accidental exposure; cryptographic watermarks discourage unauthorized screen captures; ephemeral tokens limit link reuse.

---

## 2. Secrets Management & Credential Protection
- **No Plaintext Passwords**: User passwords are never stored in cleartext. Credentials use PBKDF2 with unique cryptographic salts (100,000 rounds, SHA-512).
- **No Secrets in Frontend**: Service account keys, database master secrets, and token signing secrets reside exclusively in server-side environment configurations.
- **Sanitized Telemetry**: Audit log contexts explicitly scrub `password`, `token`, and `authorization` headers to eliminate accidental credential leakage into logging infrastructure.

---

## 3. Vulnerability Reporting
If you discover a security vulnerability in Certibank:
1. Please do not open a public issue.
2. Contact the security team at `security@certibank.internal`.
3. Include detailed steps to reproduce, affected endpoints, and payload examples.
4. We aim to acknowledge reports within 24 hours and issue patches promptly.
