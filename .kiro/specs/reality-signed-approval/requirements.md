# Requirements Document

## Introduction

Reality-Signed Legal Approval is a system that provides cryptographically verifiable proof that a specific human knowingly approved a legal action at a specific time, and that the approval has not been altered.

The core promise: "This proves that a specific human knowingly approved this legal action at this time, and the approval has not been altered."

If a feature does not strengthen this sentence → do not build it.

## Glossary

- **Reality_Signature**: The atomic unit of proof — an immutable, cryptographically signed object containing document hash, intent hash, approver identity, timestamp, presence proof reference, AI usage flag, and system signature
- **Approval_Session**: A frozen state containing the document and approval intent, awaiting human approval
- **Presence_Proof**: Cryptographic evidence that a human was present and confirmed their intent at approval time
- **Document_Hash**: SHA-256 cryptographic fingerprint of the uploaded legal document
- **Intent_Hash**: SHA-256 cryptographic fingerprint of the approval intent text
- **Signature_Engine**: The trusted component that creates and signs Reality Signatures
- **Verification_API**: The public, stateless API that proves reality without requiring authentication

## Requirements

### Requirement 1: Document Hashing

**User Story:** As the system, I want to compute deterministic hashes of documents, so that document integrity can be verified later.

#### Acceptance Criteria

1. WHEN a document is provided, THE System SHALL compute a SHA-256 hash of the document bytes
2. THE System SHALL produce identical hashes for identical document bytes
3. THE System SHALL produce different hashes for different document bytes
4. THE System SHALL represent hashes as 64-character lowercase hexadecimal strings

### Requirement 2: Intent Hashing

**User Story:** As the system, I want to compute deterministic hashes of approval intent text, so that intent integrity can be verified later.

#### Acceptance Criteria

1. WHEN an intent string is provided, THE System SHALL compute a SHA-256 hash of the UTF-8 encoded string
2. THE System SHALL produce identical hashes for identical intent strings
3. THE System SHALL produce different hashes for different intent strings

### Requirement 3: Reality Signature Structure

**User Story:** As the system, I want a canonical data structure for Reality Signatures, so that approvals are permanently verifiable.

#### Acceptance Criteria

1. THE Reality_Signature SHALL contain a version field for schema compatibility
2. THE Reality_Signature SHALL contain the document_hash (SHA-256 of approved document)
3. THE Reality_Signature SHALL contain the intent_hash (SHA-256 of approval intent)
4. THE Reality_Signature SHALL contain the intent_text (human-readable approval intent)
5. THE Reality_Signature SHALL contain the approver_id (identity reference)
6. THE Reality_Signature SHALL contain the approver_name (human-readable name)
7. THE Reality_Signature SHALL contain the timestamp (exact moment of approval as Unix epoch milliseconds)
8. THE Reality_Signature SHALL contain the presence_proof_id (reference to presence verification)
9. THE Reality_Signature SHALL contain the ai_flag (boolean indicating AI involvement, default false)
10. THE Reality_Signature SHALL contain the signature (Ed25519 signature of canonical payload)
11. THE Reality_Signature SHALL contain the public_key (for independent verification)

### Requirement 4: Signature Payload Construction

**User Story:** As the system, I want a canonical method to construct the signature payload, so that signatures are deterministic and verifiable.

#### Acceptance Criteria

1. THE Signature_Engine SHALL construct the payload by JSON-stringifying fields in a fixed order
2. THE Signature_Engine SHALL exclude the signature and public_key fields from the payload
3. THE Signature_Engine SHALL use the exact field order: version, document_hash, intent_hash, intent_text, approver_id, approver_name, timestamp, presence_proof_id, ai_flag
4. FOR ANY Reality_Signature, reconstructing the payload and verifying against the signature SHALL succeed if unmodified

### Requirement 5: Cryptographic Signing

**User Story:** As the system, I want to sign Reality Signatures with Ed25519, so that signatures are secure and compact.

#### Acceptance Criteria

1. THE Signature_Engine SHALL sign payloads using Ed25519
2. THE Signature_Engine SHALL use a system root key for signing
3. THE Signature_Engine SHALL include the public key in the Reality_Signature for independent verification
4. FOR ANY signed payload, verification with the included public key SHALL succeed
5. FOR ANY modified payload, verification SHALL fail

### Requirement 6: Verification Logic

**User Story:** As a verifier, I want to independently verify a Reality Signature, so that I can confirm the approval is authentic and unaltered.

#### Acceptance Criteria

1. WHEN a document and Reality_Signature are provided, THE Verification_API SHALL compute the document hash
2. WHEN the computed hash matches the signature's document_hash, THE Verification_API SHALL report document integrity as "intact"
3. WHEN the computed hash does not match, THE Verification_API SHALL report document integrity as "altered"
4. THE Verification_API SHALL verify the cryptographic signature against the canonical payload
5. WHEN the cryptographic signature is valid, THE Verification_API SHALL report the signature as "authentic"
6. WHEN the cryptographic signature is invalid, THE Verification_API SHALL report the signature as "not authentic"
7. WHEN verification succeeds, THE Verification_API SHALL return: approver_id, approver_name, timestamp, document_integrity, ai_flag
8. THE Verification_API SHALL NOT require authentication
9. THE Verification_API SHALL be stateless and read-only

### Requirement 7: Presence Proof Structure

**User Story:** As the system, I want to record evidence of human presence at approval time, so that approvals are legally defensible.

#### Acceptance Criteria

1. THE Presence_Proof SHALL contain a unique identifier
2. THE Presence_Proof SHALL contain the session_id it belongs to
3. THE Presence_Proof SHALL contain a challenge_completed flag
4. THE Presence_Proof SHALL contain a challenge_completed_at timestamp
5. THE Presence_Proof SHALL contain acknowledgment flags: understands_approval, is_authorized, acting_knowingly
6. THE Presence_Proof SHALL contain an acknowledged_at timestamp
7. FOR ANY approval, all three acknowledgment flags SHALL be true

### Requirement 8: Approval Session State

**User Story:** As the system, I want approval sessions to have clear states, so that the approval flow is controlled.

#### Acceptance Criteria

1. THE Approval_Session SHALL have states: pending, approved, expired
2. WHEN created, THE Approval_Session SHALL be in pending state with no signature
3. WHEN approved, THE Approval_Session SHALL transition to approved state with a signature reference
4. WHEN expired, THE Approval_Session SHALL reject approval attempts
5. WHILE in approved or expired state, THE Approval_Session SHALL reject further approval attempts
