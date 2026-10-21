# CERTIBANK — DEPLOYMENT GUIDE (DEPLOYMENT.md)

This guide covers building, packaging, hosting configuration, smoke testing, and rollback procedures for **Certibank — A Trust Vault**.

---

## 1. Environment Configuration

Define all runtime variables in `.env` (refer to `.env.example`):
```bash
PORT=3000
NODE_ENV=production
SESSION_SECRET="your-32-byte-cryptographic-hex-secret"
APP_URL="https://ais-dev-sq6jz3w6oxnrrlrgdezq45-980837075887.asia-east1.run.app"
```

---

## 2. Production Build

To produce an optimized production distribution:
```bash
# 1. Clean dist directory
npm run clean

# 2. Build Vite frontend bundles
npm run build

# 3. Verify TypeScript types and linter
npm run lint

# 4. Run automated security test suite
npm test
```

---

## 3. Cloud Run / Production Hosting

Certibank is configured to run as a unified full-stack Node.js Express server (`server.ts`) hosting the protected REST API and serving the optimized frontend SPA assets from `dist/`:

### Cloud Run Deployment Command
```bash
gcloud run deploy certibank-trust-vault \
  --source . \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 3000
```

### Live URLs
- **Development App URL**: `https://ais-dev-sq6jz3w6oxnrrlrgdezq45-980837075887.asia-east1.run.app`
- **Shared App URL**: `https://ais-pre-sq6jz3w6oxnrrlrgdezq45-980837075887.asia-east1.run.app`

---

## 4. Post-Deployment Smoke Tests

Execute these verification checks after deploying to production:
1. **Health Check**: `GET /api/categories` returns HTTP 200 with standard categories list.
2. **Authentication Smoke Test**:
   - `POST /api/auth/login` with `nujahath` / `--nujhath5--` returns valid bearer token and User object.
   - `POST /api/auth/login` with incorrect credentials returns HTTP 401 with `INVALID_CREDENTIALS`.
3. **Authorization & IDOR Smoke Test**:
   - Caller with Viewer token attempting to GET unshared document receives HTTP 403 `NO_SHARING_GRANT`.
4. **File-Name Lock & Stream**:
   - `POST /api/documents/:id/unlock` with exact title returns `unlocked: true` and 60-second stream token.
   - `GET /api/documents/:id/stream?token=...` streams file bytes with zero-trust security headers.
5. **Tamper Integrity Audit**:
   - `GET /api/audit/verify` confirms that the SHA-256 chain is 100% valid.

---

## 5. Rollback Procedure
If any smoke test fails:
1. Revert deployment revision in Cloud Run console (`gcloud run services update-traffic certibank-trust-vault --to-revisions=PREVIOUS_REVISION=100`).
2. Verify rollback health via `GET /api/categories`.
