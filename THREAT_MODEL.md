# Threat Model

> This document defines what Reality-Signed Legal Approval protects against, what it does not protect against, and what happens when things go wrong.

## Trust Assumptions

This system operates under explicit trust assumptions. Verification is only meaningful within these boundaries.

### What We Trust

1. **Cryptographic primitives**: SHA-256 and Ed25519 are secure
2. **System integrity**: The approval service code has not been tampered with
3. **Clock accuracy**: System timestamps are reasonably accurate (within seconds)
4. **Storage integrity**: Stored sessions and signatures have not been modified outside the system

### What We Do NOT Trust

1. **Identity claims**: `approver_id` and `approver_name` are system-asserted, not externally verified
2. **Intent beyond text**: We record what the approver saw, not what they understood
3. **Absence of coercion**: We cannot detect if someone was forced to approve
4. **Network security**: We assume TLS but do not guarantee it

---

## Threat Actors

### 1. Malicious Approver

**Goal**: Approve something, then deny they approved it.

**Attack vectors**:
- Claim "I never clicked approve"
- Claim "That wasn't me"
- Claim "The document was different"

**Mitigations**:
- Reality Signature binds document hash, intent, timestamp, and presence proof
- Signature is cryptographically verifiable
- Presence proof records explicit acknowledgments

**Residual risk**: If the approver's account was compromised, they may legitimately deny the approval. V0 does not verify identity externally.

---

### 2. Malicious Document Requester

**Goal**: Get an approval for Document A, then claim it was for Document B.

**Attack vectors**:
- Swap document after approval
- Modify document bytes while preserving appearance

**Mitigations**:
- Document hash (SHA-256) is bound into signature
- Any byte change produces different hash
- Verification fails if document doesn't match

**Residual risk**: None for byte-level integrity. Visual similarity attacks (different bytes, same appearance) are out of scope.

---

### 3. External Attacker

**Goal**: Forge an approval that never happened.

**Attack vectors**:
- Forge a Reality Signature
- Replay an old signature for a new document
- Modify signature fields

**Mitigations**:
- Ed25519 signatures cannot be forged without private key
- Document hash binding prevents replay across documents
- Timestamp binding prevents replay across time
- Any field modification invalidates signature

**Residual risk**: If system private key is compromised, attacker can forge signatures. See "Key Compromise" below.

---

### 4. Malicious System Operator

**Goal**: Create fake approvals or deny real ones.

**Attack vectors**:
- Generate signatures for approvals that never happened
- Delete or modify stored sessions
- Backdate timestamps

**Mitigations (V0)**: None. The system operator is trusted in V0.

**Future mitigations**:
- Key transparency logs (public record of all signatures)
- External timestamping (RFC 3161)
- Distributed witnesses
- User-held receipts

**Residual risk**: V0 requires trusting the system operator. This is the primary trust boundary.

---

## Compromise Scenarios

### Scenario A: System Private Key Leaks

**Impact**: Attacker can forge any Reality Signature.

**Detection**:
- Signatures appear for approvals that never happened
- Users report approvals they didn't make

**Response**:
1. Revoke compromised key immediately
2. Publish key revocation notice
3. All signatures made with compromised key are suspect
4. Require re-approval for critical documents

**Prevention (future)**:
- HSM or cloud KMS for key storage
- Key rotation policy
- Key transparency log (all valid keys are public)

---

### Scenario B: Presence Proof Bypassed

**Impact**: Approvals recorded without human presence verification.

**Detection**:
- Presence proofs with impossible timestamps
- Bulk approvals in short time windows
- Missing challenge completion data

**Response**:
1. Audit all approvals in affected time window
2. Flag signatures with suspicious presence proofs
3. Require re-approval if presence cannot be verified

**Prevention (future)**:
- Stronger presence challenges (CAPTCHA, biometrics, hardware tokens)
- Rate limiting per approver
- Anomaly detection on approval patterns

---

### Scenario C: Storage Compromised

**Impact**: Sessions or signatures modified or deleted.

**Detection**:
- Signature verification fails for previously valid signatures
- Sessions disappear or change state unexpectedly
- Audit log gaps

**Response**:
1. Restore from backup if available
2. Re-verify all signatures against original documents
3. Flag any signatures that cannot be verified

**Prevention (future)**:
- Immutable audit log (append-only)
- External backup of signature hashes
- Merkle tree of all signatures for tamper detection

---

### Scenario D: Clock Manipulation

**Impact**: Timestamps do not reflect actual approval time.

**Detection**:
- Timestamps in the future
- Timestamps inconsistent with other system logs
- Approval sequences out of order

**Response**:
1. Flag signatures with suspicious timestamps
2. Cross-reference with external time sources

**Prevention (future)**:
- External timestamping authority (RFC 3161)
- Multiple independent time sources
- Timestamp bounds checking

---

## Attacks Explicitly Out of Scope

The following attacks are acknowledged but not addressed by this system:

### 1. Social Engineering
- Tricking someone into approving something they shouldn't
- Misrepresenting what a document contains
- **Why out of scope**: This is a human problem, not a cryptographic one

### 2. Legal Validity
- Whether a Reality Signature constitutes a legal signature
- Jurisdictional requirements for electronic signatures
- **Why out of scope**: Legal validity depends on context and jurisdiction

### 3. Document Content Analysis
- Whether the document contains what it claims
- Whether the intent matches the document content
- **Why out of scope**: We attest to approval events, not document semantics

### 4. Coercion Detection
- Whether the approver was forced to approve
- Whether the approver was under duress
- **Why out of scope**: Cannot be detected cryptographically

### 5. Identity Verification
- Whether `approver_id` corresponds to a real person
- Whether the person is who they claim to be
- **Why out of scope**: V0 uses system-asserted identity only

### 6. Network-Level Attacks
- Man-in-the-middle during approval
- DNS hijacking
- **Why out of scope**: Assumed to be handled by TLS at infrastructure level

---

## Security Properties Summary

| Property | V0 Status | Notes |
|----------|-----------|-------|
| Document integrity | ✅ Guaranteed | SHA-256 hash binding |
| Signature authenticity | ✅ Guaranteed | Ed25519 verification |
| Timestamp accuracy | ⚠️ Trusted | System clock only |
| Approver identity | ⚠️ System-asserted | No external verification |
| Presence verification | ⚠️ Basic | Acknowledgment flags only |
| Non-repudiation | ⚠️ Partial | Depends on identity trust |
| Operator honesty | ❌ Trusted | No external verification |

---

## Verification Checklist (For Auditors)

When verifying a Reality Signature:

1. **Obtain the original document** (not a copy from the signer)
2. **Obtain the Reality Signature JSON**
3. **Compute SHA-256 of document bytes**
4. **Compare to `document_hash` in signature** → Must match exactly
5. **Reconstruct canonical payload** from signature fields
6. **Verify Ed25519 signature** against payload and public key
7. **Check timestamp** is within expected range
8. **Check presence proof hash** is valid format (64 hex chars)
9. **Review intent text** matches expected approval context

If any step fails, the signature is invalid.

---

## Future Hardening Roadmap

### Phase 1: Key Security
- [ ] HSM or cloud KMS integration
- [ ] Key rotation mechanism
- [ ] Key revocation list

### Phase 2: External Verification
- [ ] RFC 3161 timestamping
- [ ] Key transparency log
- [ ] Public signature registry

### Phase 3: Identity Integration
- [ ] SSO/SAML integration
- [ ] Certificate-based identity
- [ ] Identity provider attestation

### Phase 4: Presence Strengthening
- [ ] Hardware token support
- [ ] Biometric integration
- [ ] Video attestation option

---

## Conclusion

This system provides cryptographic attestation of approval events. It is honest about what it proves and what it does not prove.

**It proves**:
- A specific document was approved
- At a specific time
- By a specific system-asserted identity
- With explicit acknowledgments recorded

**It does not prove**:
- Legal identity of the approver
- Absence of coercion
- Legal enforceability
- Operator honesty (in V0)

Use accordingly.
