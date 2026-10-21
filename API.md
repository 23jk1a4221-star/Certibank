# CERTIBANK — API SPECIFICATION (API.md)

This document defines the RESTful endpoints, authorization requirements, request/response schemas, and error codes for **Certibank — A Trust Vault**.

All endpoints are mounted under `/api`.

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates user credentials using salted PBKDF2 hash verification with constant-time equality check.
- **Request Body**:
  ```json
  {
    "username": "nujahath",
    "password": "--nujhath5--"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "token": "<base64_payload>.<hmac_signature>",
      "user": {
        "id": "usr_owner_nujahath",
        "username": "nujahath",
        "displayName": "Nujahath (Vault Owner)",
        "role": "OWNER",
        "status": "ACTIVE"
      }
    }
    ```
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: Account suspended.

---

### `POST /api/auth/voice-phrase-assist`
Recognizes spoken convenience phrase `"This is Nujahath."` for username autofill.
- **Request Body**:
  ```json
  {
    "phrase": "This is Nujahath."
  }
  ```
- **Response**:
  ```json
  {
    "matched": true,
    "suggestedUsername": "nujahath",
    "message": "Voice phrase verified. Please enter your vault password to complete zero-trust authentication."
  }
  ```

---

### `POST /api/auth/logout`
Revokes the caller's active session token.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`

---

## 2. Document Endpoints

### `GET /api/documents`
Lists accessible certificates. Filtered strictly by server-side authorization: returns only owned documents or documents with an active unexpired sharing grant.
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `category`: `GOVERNMENT | EDUCATIONAL | PROFESSIONAL | COURSES_TRAINING`
  - `search`: String query against title, issuer, category, tags
  - `scope`: `all | owned | shared`
- **Response**:
  ```json
  {
    "documents": [
      {
        "id": "doc_gov_birth",
        "title": "Date of Birth Registration Certificate",
        "category": "GOVERNMENT",
        "issuer": "Municipal Civil Registration Authority",
        "verificationStatus": "VERIFIED_ISSUER",
        "fileSize": 45120,
        "permissions": ["VIEW", "DOWNLOAD", "MANAGE_ACCESS"]
      }
    ]
  }
  ```

---

### `POST /api/documents/:id/unlock`
Validates File-Name Lock by comparing the entered title against the vault record. Issues a 60-second ephemeral stream token upon match.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "enteredName": "Date of Birth Registration Certificate"
  }
  ```
- **Response**:
  ```json
  {
    "unlocked": true,
    "streamToken": "<short_lived_token>",
    "expiresInSeconds": 60,
    "canDownload": true
  }
  ```

---

### `GET /api/documents/:id/stream`
Streams the raw certificate bytes (SVG, PDF, Image).
- **Query Parameter**: `token=<short_lived_token>` or `Authorization: Bearer <token>`
- **Security Headers**:
  - `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'`
  - `Cache-Control: private, no-cache, no-store, must-revalidate`
- **Responses**:
  - `200 OK`: File byte buffer with appropriate `Content-Type`.
  - `401 Unauthorized`: Missing or expired token.
  - `403 Forbidden`: Access denied (insufficient grant or revoked).

---

### `GET /api/documents/:id/download`
Downloads the original certificate file. Strictly requires `DOWNLOAD` permission.
- **Headers**: `Authorization: Bearer <token>`
- **Response**: Attachment stream with `Content-Disposition: attachment; filename="..."`.

---

### `POST /api/documents/upload`
Uploads a new certificate to private vault storage.
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Form Fields**: `file` (binary), `title`, `category`, `subCategory`, `issuer`, `issueDate`, `expiryDate`, `tags`.
- **Validation**: Magic bytes checked; PDF, PNG, JPEG, SVG permitted. Max 10MB.

---

## 3. Permissions & Access Control Endpoints

### `POST /api/permissions/grant`
Grants granular permissions to a registered user.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "documentId": "doc_edu_btech",
    "recipientUsername": "viewer_auditor",
    "permissions": ["VIEW", "DOWNLOAD"],
    "expiresAt": "2026-12-31T23:59:59Z"
  }
  ```

---

### `POST /api/permissions/revoke`
Immediately terminates an active sharing grant. Subsequent protected requests will fail immediately.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "grantId": "grant_seed_01"
  }
  ```

---

## 4. Audit & Governance Endpoints

### `GET /api/audit`
Queries the server-side audit trail. Admins see all events; non-admins see only events involving their account or owned documents.
- **Headers**: `Authorization: Bearer <token>`

---

### `GET /api/audit/verify`
Calculates and verifies the complete SHA-256 cryptographic chain from the genesis block to head.
- **Response**:
  ```json
  {
    "isValid": true,
    "totalRecords": 24,
    "message": "Cryptographic audit integrity verified: All 24 chain records are mathematically authentic."
  }
  ```
