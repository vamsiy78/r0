# How to Verify a Reality-Signed Approval

> This document explains how to independently verify an approval, without trusting the issuing system.

## What You Need

1. **The original document** (PDF, DOCX, or other file that was approved)
2. **The Reality Signature JSON** (the `.json` file produced at approval time)
3. **The verifier** (CLI tool or static verifier)

You do not need access to the original approval system. Verification is fully independent.

---

## Verification Steps

### Step 1: Obtain the Original Document

Get the exact document that was approved. Not a copy, not a re-export — the original file bytes.

If the document has been modified in any way (even a single byte), verification will fail.

### Step 2: Obtain the Reality Signature

The signature is a JSON file containing:
- Document hash
- Intent text
- Approver information
- Timestamp
- Cryptographic signature

### Step 3: Run the Verifier

```bash
npx ts-node cli/verify.ts <document> <signature.json>
```

Example:
```bash
npx ts-node cli/verify.ts contract.pdf approval-signature.json
```

### Step 4: Interpret the Result

**PASS** means:
- The document has not been altered since signing
- The signature is cryptographically valid
- The signature was produced by a system holding the signing key

**FAIL** means one of:
- The document has been altered
- The signature is malformed
- The signature is not authentic

---

## What Verification Proves

✅ **Document integrity**: The document bytes are identical to what was approved

✅ **Signature authenticity**: The signature was produced by a valid signing key

✅ **Timestamp recorded**: The approval occurred at the stated time (as recorded by the system)

✅ **Intent recorded**: The stated intent was presented to the approver

✅ **Approver identity recorded**: The system recorded who approved (system-asserted identity)

✅ **Presence proof bound**: A presence verification was performed and cryptographically bound

---

## What Verification Does NOT Prove

❌ **Legal identity**: The `approver_id` is system-asserted, not externally verified. It proves "the same entity approved X and Y", not "this is legally John Doe".

❌ **Legal enforceability**: This is cryptographic attestation, not a legal signature. Legal validity depends on jurisdiction and context.

❌ **Absence of coercion**: The system cannot detect if someone was forced to approve.

❌ **Document content accuracy**: Verification proves the document wasn't altered, not that its contents are true.

❌ **Intent understanding**: The system records what intent text was shown, not whether the approver understood it.

❌ **System operator honesty**: In V0, the system operator is trusted. A malicious operator could theoretically create false approvals.

---

## Common Failure Cases

### Document Altered

```
❌ FAIL - Document has been altered

CHECKS:
  Document Integrity:  ✗ FAIL
  Signature Validity:  ✓ PASS
```

**Meaning**: The document bytes don't match the hash in the signature. The document was modified after approval.

**Action**: Obtain the original, unmodified document.

---

### Signature Malformed

```
❌ FAIL - Invalid signature format

CHECKS:
  Format Valid:  ✗ FAIL
```

**Meaning**: The signature JSON is corrupted or missing required fields.

**Action**: Obtain the original signature file.

---

### Signature Not Authentic

```
❌ FAIL - Signature is not authentic

CHECKS:
  Document Integrity:  ✓ PASS
  Signature Validity:  ✗ FAIL
```

**Meaning**: The cryptographic signature doesn't verify. Either:
- The signature was tampered with
- The signature was created with a different key
- The signature is forged

**Action**: This approval cannot be trusted.

---

## Understanding the Output

```
============================================================
  r0 VERIFICATION RESULT
============================================================

  ✅ PASS - Approval is valid

  CHECKS:
    Document Integrity:  ✓ PASS
    Signature Validity:  ✓ PASS
    Format Valid:        ✓ PASS

  DETAILS:
    Approver ID:    user-123
    Approver Name:  John Doe
    Timestamp:      2025-12-29T10:07:50.884Z
    Intent:         Approve Master Service Agreement with ACME Corp
    AI Used:        No

============================================================
  TRUST ASSUMPTIONS:
  - Document integrity verified (SHA-256)
  - Signature authenticity verified (Ed25519)
  - Identity is system-asserted, not externally verified
  - This does not prove legal enforceability
============================================================
```

### Fields Explained

| Field | Meaning |
|-------|---------|
| Approver ID | System-internal identifier for the approver |
| Approver Name | Human-readable name (as recorded by system) |
| Timestamp | When the approval was recorded (UTC) |
| Intent | What the approver was told they were approving |
| AI Used | Whether AI assistance was flagged during approval |

---

## Legal Interpretation Guidance

This section is for legal teams, auditors, and compliance officers.

### What This System Is

Reality-Signed Approval is a **cryptographic attestation system**. It provides:

1. **Tamper-evident records**: Any modification to the document or signature is detectable
2. **Cryptographic proof**: Verification uses industry-standard algorithms (SHA-256, Ed25519)
3. **Audit trail**: Each approval records who, what, when, and stated intent

### What This System Is Not

This system is **not** a legal signature system by itself. It does not:

- Verify legal identity (no ID verification, no notarization)
- Guarantee legal enforceability (depends on jurisdiction)
- Replace compliance requirements (e-signature laws vary by jurisdiction)
- Prove intent beyond what was displayed

### Recommended Use

Use Reality Signatures as **one layer** of evidence in an approval workflow:

1. **Primary evidence**: The cryptographic attestation proves the approval event occurred
2. **Supporting evidence**: Combine with identity verification, audit logs, witness records as needed
3. **Legal review**: Consult legal counsel for jurisdiction-specific requirements

### Trust Boundary

The trust boundary of this system is:

- **Trusted**: Cryptographic primitives (SHA-256, Ed25519)
- **Trusted**: Document integrity (hash binding)
- **System-asserted**: Approver identity (not externally verified in V0)
- **System-asserted**: Timestamp (system clock, not external authority)
- **Trusted in V0**: System operator (no external verification of operator honesty)

### Questions for Legal Review

When evaluating a Reality Signature for legal purposes, consider:

1. Is cryptographic attestation sufficient for this use case?
2. What additional identity verification is required?
3. Does this jurisdiction recognize electronic approvals?
4. What is the evidentiary weight of this record?
5. Are there retention requirements for the signature and document?

---

## Cryptographic Details (For Technical Auditors)

### Algorithms

- **Document hash**: SHA-256 (256-bit, hex-encoded)
- **Signature**: Ed25519 (Edwards-curve Digital Signature Algorithm)
- **Payload**: JSON with fixed field order for deterministic signing

### Payload Field Order

```
v → dh → ih → it → ai → an → ts → pp → pph → af
```

### Verification Process

1. Read document bytes
2. Compute SHA-256 hash
3. Compare to `dh` (document_hash) in signature
4. Reconstruct canonical payload from signature fields
5. Verify Ed25519 signature against payload and public key

### Key Management (V0)

In V0, keys are ephemeral (generated at server startup). Production deployments should use:
- HSM or cloud KMS
- Key rotation policies
- Key transparency logs

---

## Version

This document describes Reality Signature format version `1.0`.

Verification is backward-compatible: newer verifiers can verify older signatures.
