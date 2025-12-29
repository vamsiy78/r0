# Design Document

## Overview

This design defines the core primitive of Reality-Signed Legal Approval: the Reality Signature and its verification. Everything else is implementation detail.

The design answers three questions:
1. Where does trust start? (Trust Boundaries)
2. What exactly do we sign? (Canonical Data Model)
3. How does a third party verify without trusting us? (Verification Flow)

No UI. No workflows. Just the truth guarantee.

---

## 1. System Architecture (Trust Boundaries)

```
                    UNTRUSTED                         TRUSTED
                    ─────────                         ───────
                         │
    [Client/CLI]         │         [Signature Engine]
         │               │                │
         ▼               │                ▼
    [Approval API] ──────┼────────► [System Root Key]
         │               │                │
         ▼               │                ▼
    [Presence Engine]    │         [Reality Signature]
         │               │                │
         ▼               │                │
    [Storage]            │                │
                         │                │
    ─────────────────────┼────────────────┼─────────────────
                         │                │
    [Verifier]           │                ▼
         │               │         [Verification Logic]
         ▼               │                │
    [Verification API] ──┼────────────────┘
                         │
                    TRUST BOUNDARY
```

### Trust Model

**Trusted Components:**
- Signature Engine: Holds the system root key, creates signatures
- System Root Key: Ed25519 private key, never exposed
- Verification Logic: Stateless, deterministic, can run anywhere

**Untrusted Components:**
- Client/CLI: Could be compromised, could send bad data
- Approval API: Validates input, but doesn't hold trust
- Presence Engine: Collects evidence, but evidence is verified by signature
- Storage: Could be tampered with, but signatures detect tampering

**Trust Boundary Crossings:**
1. Document bytes cross from untrusted client → hashed immediately
2. Approval request crosses → validated, frozen, stored
3. Presence proof crosses → included in signature payload
4. Signature request crosses → Signature Engine creates immutable signature
5. Verification request crosses → Verification Logic checks independently

**Key Insight:** The verifier never needs to trust the system. They only need:
- The original document
- The Reality Signature
- The verification algorithm (open, deterministic)

---

## 2. Canonical Data Model

### Reality Signature (The Atomic Unit)

This is the heart of the product. Get this wrong, rebuild the company.

```typescript
interface RealitySignature {
  // Schema version for future compatibility
  version: "1.0";
  
  // What was approved (hashes)
  document_hash: string;    // SHA-256 of document bytes, 64 hex chars
  intent_hash: string;      // SHA-256 of intent text UTF-8, 64 hex chars
  intent_text: string;      // Human-readable intent (for display)
  
  // Who approved
  approver_id: string;      // Unique identifier
  approver_name: string;    // Human-readable name
  
  // When approved
  timestamp: number;        // Unix epoch milliseconds
  
  // Proof of human presence
  presence_proof_id: string;
  
  // AI disclosure
  ai_flag: boolean;         // Default: false
  
  // Cryptographic proof
  signature: string;        // Ed25519 signature, base64
  public_key: string;       // Ed25519 public key, base64
}
```

### What Gets Hashed vs Signed vs Stored

| Field | Hashed | Signed | Stored | Derived |
|-------|--------|--------|--------|---------|
| version | - | ✓ | ✓ | - |
| document_hash | - | ✓ | ✓ | From document bytes |
| intent_hash | - | ✓ | ✓ | From intent text |
| intent_text | - | ✓ | ✓ | - |
| approver_id | - | ✓ | ✓ | - |
| approver_name | - | ✓ | ✓ | - |
| timestamp | - | ✓ | ✓ | - |
| presence_proof_id | - | ✓ | ✓ | - |
| ai_flag | - | ✓ | ✓ | - |
| signature | - | - | ✓ | From signing |
| public_key | - | - | ✓ | From key pair |

### Signature Payload (Canonical Form)

The payload MUST be constructed in this exact order for deterministic signing:

```typescript
function buildSignaturePayload(sig: Omit<RealitySignature, 'signature' | 'public_key'>): string {
  // Fixed field order - NEVER change this
  const payload = {
    v: sig.version,
    dh: sig.document_hash,
    ih: sig.intent_hash,
    it: sig.intent_text,
    ai: sig.approver_id,
    an: sig.approver_name,
    ts: sig.timestamp,
    pp: sig.presence_proof_id,
    af: sig.ai_flag
  };
  return JSON.stringify(payload);
}
```

**Why fixed order?** JSON.stringify doesn't guarantee order. We enforce it to ensure the same signature fields always produce the same payload bytes, which produce the same signature.

### Serialized Format (For Export/Transfer)

```typescript
interface SerializedRealitySignature {
  v: "1.0";
  dh: string;   // document_hash
  ih: string;   // intent_hash
  it: string;   // intent_text
  ai: string;   // approver_id
  an: string;   // approver_name
  ts: number;   // timestamp
  pp: string;   // presence_proof_id
  af: boolean;  // ai_flag
  sg: string;   // signature (base64)
  pk: string;   // public_key (base64)
}
```

### Presence Proof

```typescript
interface PresenceProof {
  id: string;
  session_id: string;
  challenge_completed: boolean;
  challenge_completed_at: number;  // Unix epoch ms
  acknowledgments: {
    understands_approval: boolean;
    is_authorized: boolean;
    acting_knowingly: boolean;
  };
  acknowledged_at: number;  // Unix epoch ms
}
```

### Approval Session

```typescript
interface ApprovalSession {
  id: string;
  secure_token: string;           // For approver link
  document_hash: string;
  document_path: string;          // Where document is stored
  document_name: string;
  intent_text: string;
  intent_hash: string;
  status: "pending" | "approved" | "expired";
  created_at: number;
  expires_at: number;
  approved_at: number | null;
  signature_id: string | null;
}
```

---

## 3. Verification Flow

This is what makes it real infrastructure. A third party can verify without trusting us.

### Inputs

1. `document`: The original document bytes (PDF, DOCX, any file)
2. `signature`: The Reality Signature (JSON or serialized format)

### Algorithm

```
VERIFY(document, signature):

  1. PARSE signature
     - If malformed → FAIL("invalid_signature_format")
  
  2. COMPUTE document_hash = SHA256(document)
  
  3. CHECK document_hash == signature.document_hash
     - If mismatch → FAIL("document_altered", computed_hash, expected_hash)
  
  4. RECONSTRUCT payload = buildSignaturePayload(signature fields)
  
  5. VERIFY Ed25519(payload, signature.signature, signature.public_key)
     - If invalid → FAIL("signature_not_authentic")
  
  6. RETURN SUCCESS {
       valid: true,
       approver_id: signature.approver_id,
       approver_name: signature.approver_name,
       timestamp: signature.timestamp,
       document_integrity: "intact",
       ai_used: signature.ai_flag
     }
```

### Outputs

**Success:**
```typescript
{
  valid: true,
  approver_id: string,
  approver_name: string,
  timestamp: number,
  document_integrity: "intact",
  ai_used: boolean
}
```

**Failure - Document Altered:**
```typescript
{
  valid: false,
  error: "document_altered",
  document_integrity: "altered",
  computed_hash: string,
  expected_hash: string
}
```

**Failure - Invalid Signature:**
```typescript
{
  valid: false,
  error: "signature_not_authentic",
  document_integrity: "unknown"
}
```

**Failure - Malformed:**
```typescript
{
  valid: false,
  error: "invalid_signature_format",
  document_integrity: "unknown"
}
```

### Verification Properties (Invariants)

These MUST hold for the system to be correct:

1. **Determinism**: Same inputs → same output, always
2. **Independence**: Verifier needs no network access, no database, no auth
3. **Tamper Detection**: Any change to document → verification fails
4. **Signature Binding**: Any change to signature fields → verification fails
5. **No False Positives**: Invalid signatures never verify as valid

---

## 4. Cryptographic Primitives

### Hashing

- **Algorithm**: SHA-256
- **Document hash**: `SHA256(document_bytes)` → 64 lowercase hex chars
- **Intent hash**: `SHA256(UTF8_encode(intent_text))` → 64 lowercase hex chars

### Signing

- **Algorithm**: Ed25519
- **Key size**: 256-bit private key, 256-bit public key
- **Signature size**: 64 bytes (512 bits)
- **Encoding**: Base64 for storage/transfer

### Why Ed25519?

- Fast: ~15,000 signatures/second on commodity hardware
- Secure: No known practical attacks
- Small: 64-byte signatures (vs 256+ for RSA)
- Deterministic: Same key + message → same signature
- Widely supported: Node.js, browsers, every language

### Key Management (V0)

For V0, the system root key is stored as environment variables:
- `SIGNING_PRIVATE_KEY`: Base64-encoded Ed25519 private key
- `SIGNING_PUBLIC_KEY`: Base64-encoded Ed25519 public key

Production will use HSM or cloud KMS.

---

## 5. Testing Without UI

The primitive is tested via CLI/API, not screens.

### Test 1: Hash Determinism
```bash
# Same document → same hash
echo "test" | sha256sum
echo "test" | sha256sum
# Must be identical

# Different document → different hash
echo "test1" | sha256sum
echo "test2" | sha256sum
# Must be different
```

### Test 2: Signature Round-Trip
```bash
# Create signature
curl -X POST /api/approvals \
  -F document=@contract.pdf \
  -F intent="Approve MSA with ACME"
# Returns: { session_id, secure_token }

# Complete approval (mock presence for testing)
curl -X POST /api/approvals/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{"approver_id":"test","approver_name":"Test User","acknowledgments":{"understands_approval":true,"is_authorized":true,"acting_knowingly":true}}'
# Returns: reality_signature.json

# Verify
curl -X POST /api/verify \
  -F document=@contract.pdf \
  -F signature=@reality_signature.json
# Returns: { valid: true, approver_id, timestamp, ... }
```

### Test 3: Tamper Detection
```bash
# Modify document after signing
echo "extra" >> contract.pdf

# Verify again
curl -X POST /api/verify \
  -F document=@contract.pdf \
  -F signature=@reality_signature.json
# Returns: { valid: false, error: "document_altered" }
```

### Test 4: Signature Tampering
```bash
# Modify signature JSON (change timestamp)
jq '.ts = 0' reality_signature.json > tampered.json

# Verify
curl -X POST /api/verify \
  -F document=@contract.pdf \
  -F signature=@tampered.json
# Returns: { valid: false, error: "signature_not_authentic" }
```



---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

These properties define what "correct" means for Reality-Signed Legal Approval. If any property fails, the system is broken.

### Property 1: Hash Determinism

*For any* byte sequence (document or UTF-8 encoded string), computing the SHA-256 hash multiple times SHALL always produce the identical result.

**Validates: Requirements 1.2, 2.2**

### Property 2: Hash Uniqueness

*For any* two different byte sequences, their SHA-256 hashes SHALL be different.

**Validates: Requirements 1.3, 2.3**

### Property 3: Hash Format

*For any* computed hash, it SHALL be exactly 64 characters of lowercase hexadecimal (0-9, a-f).

**Validates: Requirements 1.4**

### Property 4: Signature Completeness

*For any* Reality Signature, it SHALL contain all required fields with correct types: version (string "1.0"), document_hash (64 hex chars), intent_hash (64 hex chars), intent_text (non-empty string), approver_id (non-empty string), approver_name (non-empty string), timestamp (positive integer), presence_proof_id (non-empty string), ai_flag (boolean), signature (non-empty base64), public_key (non-empty base64).

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**

### Property 5: Payload Determinism

*For any* set of signature fields (excluding signature and public_key), constructing the payload multiple times SHALL produce identical JSON strings with fields in the exact order: v, dh, ih, it, ai, an, ts, pp, af.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: Signature Round-Trip

*For any* valid payload signed with Ed25519, verifying the signature with the corresponding public key SHALL succeed.

**Validates: Requirements 4.4, 5.4**

### Property 7: Signature Tamper Detection

*For any* signed payload, modifying any byte of the payload or signature SHALL cause verification to fail.

**Validates: Requirements 5.5**

### Property 8: Verification Correctness

*For any* document and valid Reality Signature where the document hash matches the signature's document_hash and the cryptographic signature is valid, verification SHALL return: valid=true, document_integrity="intact", and all approver fields (approver_id, approver_name, timestamp, ai_flag).

**Validates: Requirements 6.2, 6.5, 6.7**

### Property 9: Verification Failure - Document Altered

*For any* document and Reality Signature where the document hash does NOT match the signature's document_hash, verification SHALL return: valid=false, document_integrity="altered".

**Validates: Requirements 6.3**

### Property 10: Verification Failure - Invalid Signature

*For any* document and Reality Signature where the cryptographic signature does not verify against the payload, verification SHALL return: valid=false, error="signature_not_authentic".

**Validates: Requirements 6.6**

### Property 11: Presence Proof Completeness

*For any* Presence Proof, it SHALL contain: id (non-empty string), session_id (non-empty string), challenge_completed (boolean), challenge_completed_at (positive integer), acknowledgments with all three flags (booleans), acknowledged_at (positive integer).

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6**

### Property 12: Acknowledgment Requirement

*For any* approval attempt, if any acknowledgment flag (understands_approval, is_authorized, acting_knowingly) is false, the approval SHALL be rejected.

**Validates: Requirements 7.7**

### Property 13: State Transition Rules

*For any* Approval Session:
- When created, status SHALL be "pending" and signature_id SHALL be null
- When approved, status SHALL transition to "approved" and signature_id SHALL be non-null
- When in "approved" or "expired" state, approval attempts SHALL be rejected

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

---

## Testing Strategy

### Property-Based Testing

We use **fast-check** for property-based testing in TypeScript. Each property above becomes a test that runs with 100+ random inputs.

**Test file structure:**
```
src/lib/
├── crypto/
│   ├── hash.ts
│   ├── hash.property.test.ts      # Properties 1, 2, 3
│   ├── signing.ts
│   └── signing.property.test.ts   # Properties 5, 6, 7
├── signature/
│   ├── reality-signature.ts
│   └── reality-signature.property.test.ts  # Property 4
├── verification/
│   ├── verify.ts
│   └── verify.property.test.ts    # Properties 8, 9, 10
├── presence/
│   ├── presence-proof.ts
│   └── presence-proof.property.test.ts  # Properties 11, 12
└── session/
    ├── approval-session.ts
    └── approval-session.property.test.ts  # Property 13
```

### Test Tagging

Each property test is tagged: `Feature: reality-signed-approval, Property N: [name]`

### Unit Tests

Unit tests cover:
- Edge cases (empty inputs, max-length inputs)
- Error conditions (malformed JSON, invalid base64)
- Specific examples for documentation

### CLI Testing

The primitive is tested via curl commands, not UI:

```bash
# Test hash determinism
node -e "const h = require('./src/lib/crypto/hash'); console.log(h.hashString('test') === h.hashString('test'))"

# Test signature round-trip
node -e "const s = require('./src/lib/crypto/signing'); const kp = s.generateKeyPair(); const sig = s.sign('payload', kp.privateKey); console.log(s.verify('payload', sig, kp.publicKey))"

# Test verification via API
curl -X POST http://localhost:3000/api/verify -F document=@test.pdf -F signature=@sig.json
```

---

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_SIGNATURE_FORMAT` | Signature JSON is malformed or missing fields |
| `DOCUMENT_ALTERED` | Document hash doesn't match signature |
| `SIGNATURE_NOT_AUTHENTIC` | Cryptographic signature verification failed |
| `SESSION_NOT_FOUND` | Approval session doesn't exist |
| `SESSION_EXPIRED` | Approval session has expired |
| `SESSION_ALREADY_APPROVED` | Session already has a signature |
| `ACKNOWLEDGMENTS_INCOMPLETE` | Not all acknowledgment flags are true |
| `INVALID_FILE_TYPE` | Document is not PDF or DOCX |
| `FILE_TOO_LARGE` | Document exceeds size limit |

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;      // Machine-readable code
  message: string;    // Human-readable description
  details?: object;   // Additional context (e.g., computed vs expected hash)
}
```
