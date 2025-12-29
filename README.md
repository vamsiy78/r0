# Reality-Signed Legal Approval

> **This system provides cryptographic attestation of approval events under explicit trust assumptions. It does not assert legal identity or enforceability.**

Cryptographically verifiable proof that a specific human knowingly approved a legal action at a specific time, and that the approval has not been altered.

## Core Promise

> "This proves that a specific human knowingly approved this legal action at this time, and the approval has not been altered."

## Trust Model

**Verification proves:**
- Document integrity (unchanged since signing)
- Signature authenticity (cryptographically valid)
- That this system attested to the approval event

**Verification does NOT prove:**
- Legal enforceability by itself
- Identity outside the system
- Absence of coercion

**Identity Disclaimer:**
Reality Signatures attest to continuity of approval identity within the system, not legal identity verification. The `approver_id` and `approver_name` fields are system-asserted identity references — they prove "the same entity approved X and Y", NOT "this proves John Doe is John Doe".

**Signing Authority:**
Reality Signatures are issued by the system, attesting to a verified human approval event. Humans do not directly sign cryptographic material in V0.

---

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

---

## API Reference

### 1. Create Approval Session

**POST** `/api/approvals`

Creates a new approval session for a document.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `document` | File | PDF or DOCX file (max 10MB) |
| `intent` | String | Human-readable approval intent |

**Response:**
```json
{
  "session_id": "uuid",
  "secure_token": "uuid",
  "document_hash": "64-char-hex-sha256"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/approvals \
  -F "document=@contract.pdf;type=application/pdf" \
  -F "intent=Approve Master Service Agreement with ACME Corp"
```

---

### 2. Get Session Details

**GET** `/api/approvals/{id}`

Returns session details for the approver to review.

**Response:**
```json
{
  "id": "uuid",
  "document_name": "contract.pdf",
  "document_hash": "64-char-hex",
  "intent_text": "Approve Master Service Agreement...",
  "status": "pending",
  "created_at": 1234567890123,
  "expires_at": 1234567890123
}
```

---

### 3. Complete Approval

**POST** `/api/approvals/{id}/approve`

Completes the approval and generates a Reality Signature.

**Request:** `application/json`
```json
{
  "approver_id": "user-123",
  "approver_name": "John Doe",
  "acknowledgments": {
    "understands_approval": true,
    "is_authorized": true,
    "acting_knowingly": true
  }
}
```

**Response:** Reality Signature (compact format)
```json
{
  "v": "1.0",
  "dh": "document_hash_64_hex",
  "ih": "intent_hash_64_hex",
  "it": "Approve Master Service Agreement...",
  "ai": "user-123",
  "an": "John Doe",
  "ts": 1234567890123,
  "pp": "presence_proof_id",
  "pph": "presence_proof_hash_64_hex",
  "af": false,
  "sg": "base64_ed25519_signature",
  "pk": "base64_public_key"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/approvals/{session_id}/approve \
  -H "Content-Type: application/json" \
  -d '{
    "approver_id": "user-123",
    "approver_name": "John Doe",
    "acknowledgments": {
      "understands_approval": true,
      "is_authorized": true,
      "acting_knowingly": true
    }
  }'
```

---

### 4. Verify Signature

**POST** `/api/verify`

Independently verifies a Reality Signature against a document. No authentication required.

**Request:** `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| `document` | File | The original document |
| `signature` | File/String | Reality Signature JSON |

**Success Response:**
```json
{
  "valid": true,
  "approver_id": "user-123",
  "approver_name": "John Doe",
  "timestamp": 1234567890123,
  "document_integrity": "intact",
  "ai_used": false
}
```

**Failure - Document Altered:**
```json
{
  "valid": false,
  "error": "document_altered",
  "document_integrity": "altered",
  "computed_hash": "...",
  "expected_hash": "..."
}
```

**Failure - Invalid Signature:**
```json
{
  "valid": false,
  "error": "signature_not_authentic",
  "document_integrity": "unknown"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/verify \
  -F "document=@contract.pdf;type=application/pdf" \
  -F "signature=@reality-signature.json;type=application/json"
```

---

## Complete Flow Example

```bash
# 1. Create approval session
curl -s -X POST http://localhost:3000/api/approvals \
  -F "document=@contract.pdf;type=application/pdf" \
  -F "intent=Approve MSA with ACME Corp" > session.json

# Extract session ID
SESSION_ID=$(cat session.json | jq -r '.session_id')

# 2. Complete approval
curl -s -X POST "http://localhost:3000/api/approvals/${SESSION_ID}/approve" \
  -H "Content-Type: application/json" \
  -d '{
    "approver_id": "user-123",
    "approver_name": "John Doe",
    "acknowledgments": {
      "understands_approval": true,
      "is_authorized": true,
      "acting_knowingly": true
    }
  }' > signature.json

# 3. Verify (should succeed)
curl -s -X POST http://localhost:3000/api/verify \
  -F "document=@contract.pdf" \
  -F "signature=@signature.json"
# Output: {"valid":true,"approver_id":"user-123",...}

# 4. Tamper detection (modify document, should fail)
echo "tampered" >> contract.pdf
curl -s -X POST http://localhost:3000/api/verify \
  -F "document=@contract.pdf" \
  -F "signature=@signature.json"
# Output: {"valid":false,"error":"document_altered",...}
```

---

## Reality Signature Format

### Full Format (Internal)
```typescript
interface RealitySignature {
  version: "1.0";
  document_hash: string;        // SHA-256, 64 hex chars
  intent_hash: string;          // SHA-256, 64 hex chars
  intent_text: string;          // Human-readable intent (canonicalized)
  approver_id: string;          // System-asserted identity reference
  approver_name: string;        // Human-readable name
  timestamp: number;            // Unix epoch milliseconds
  presence_proof_id: string;    // Reference to presence proof
  presence_proof_hash: string;  // SHA-256 hash of presence proof artifact
  ai_flag: boolean;             // AI involvement flag
  signature: string;            // Ed25519 signature, base64
  public_key: string;           // Ed25519 public key, base64
}
```

### Compact Format (API Response)
```typescript
interface SerializedRealitySignature {
  v: "1.0";       // version
  dh: string;     // document_hash
  ih: string;     // intent_hash
  it: string;     // intent_text
  ai: string;     // approver_id
  an: string;     // approver_name
  ts: number;     // timestamp
  pp: string;     // presence_proof_id
  pph: string;    // presence_proof_hash
  af: boolean;    // ai_flag
  sg: string;     // signature
  pk: string;     // public_key
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_FILE` | Document file is required |
| `INVALID_FILE_TYPE` | Document must be PDF or DOCX |
| `FILE_TOO_LARGE` | Document exceeds 10MB limit |
| `INVALID_INTENT` | Intent text is required |
| `SESSION_NOT_FOUND` | Approval session doesn't exist |
| `SESSION_EXPIRED` | Approval session has expired |
| `SESSION_ALREADY_APPROVED` | Session already has a signature |
| `ACKNOWLEDGMENTS_INCOMPLETE` | All acknowledgments must be true |
| `INVALID_SIGNATURE_FORMAT` | Signature JSON is malformed |
| `document_altered` | Document hash doesn't match |
| `signature_not_authentic` | Cryptographic verification failed |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── approvals/
│   │   │   ├── route.ts              # POST /api/approvals
│   │   │   └── [id]/
│   │   │       ├── route.ts          # GET /api/approvals/{id}
│   │   │       └── approve/
│   │   │           └── route.ts      # POST /api/approvals/{id}/approve
│   │   └── verify/
│   │       └── route.ts              # POST /api/verify
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
└── lib/
    ├── crypto/
    │   ├── hash.ts                   # SHA-256 hashing + intent canonicalization
    │   └── signing.ts                # Ed25519 signing/verification
    ├── signature/
    │   ├── payload.ts                # Canonical payload builder
    │   └── create.ts                 # Reality Signature factory
    ├── verification/
    │   └── verify.ts                 # Independent verification
    ├── presence/
    │   └── presence-proof.ts         # Presence proof creation + hashing
    ├── session/
    │   └── approval-session.ts       # Session state management
    ├── storage/
    │   ├── memory-store.ts           # In-memory storage (V0)
    │   └── file-store.ts             # Document file storage
    └── types.ts                      # TypeScript interfaces
```

---

## Cryptographic Details

### Hashing
- **Algorithm:** SHA-256
- **Document hash:** `SHA256(document_bytes)` → 64 lowercase hex chars
- **Intent hash:** `SHA256(canonicalize(intent_text))` → 64 lowercase hex chars
- **Presence proof hash:** `SHA256(canonical_json(presence_proof))` → 64 lowercase hex chars

### Intent Canonicalization
Intent text MUST be canonicalized before hashing to ensure deterministic results:
- UTF-8 normalized (NFC)
- Trimmed (leading/trailing whitespace removed)
- Newlines normalized to `\n` (no `\r\n` or `\r`)
- Consecutive whitespace collapsed to single space (except newlines)

### Signing
- **Algorithm:** Ed25519
- **Library:** `@noble/ed25519`
- **Key size:** 256-bit private key, 256-bit public key
- **Signature size:** 64 bytes (base64 encoded)

### Payload Construction
Fields are JSON-stringified in fixed order for deterministic signing:
```
v → dh → ih → it → ai → an → ts → pp → pph → af
```

### Presence Proof Binding
The `presence_proof_hash` field cryptographically binds the presence proof artifact to the signature. This ensures:
- The presence proof cannot be modified after signing
- Verification can confirm the exact presence proof that was used
- Critics cannot claim "you signed a claim about presence without proof"

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
- Hash determinism and uniqueness
- Intent canonicalization
- Signature round-trip verification
- Tamper detection (document and signature)
- Session state transitions
- Presence proof validation and hashing

---

## V0 Limitations

- **In-memory storage:** Sessions and signatures are lost on restart
- **Ephemeral keys:** System generates new keys each startup (no persistence)
- **No authentication:** API endpoints are open
- **No rate limiting:** No protection against abuse
- **No identity verification:** `approver_id` is system-asserted, not externally verified

### Production Requirements
- Database storage (PostgreSQL, etc.)
- HSM or cloud KMS for key management
- Authentication/authorization (SSO, certificates, identity providers)
- Rate limiting and abuse protection
- Audit logging
- External identity verification integration

---

## Philosophical Principle

**Reality Infrastructure does not claim truth. It claims verifiability under defined assumptions.**

Any future feature that:
- "detects lies"
- "guarantees authenticity"
- "proves intent beyond context"

...will rot the core. This system proves what it can prove, nothing more.

---

## Security

See [THREAT_MODEL.md](./THREAT_MODEL.md) for:
- Trust assumptions and boundaries
- Threat actors and attack vectors
- Compromise scenarios and responses
- Explicit out-of-scope attacks
- Verification checklist for auditors

---

## License

MIT
