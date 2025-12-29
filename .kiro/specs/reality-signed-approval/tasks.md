# Implementation Plan: Reality-Signed Legal Approval

## Overview

Build the core primitive bottom-up: crypto utilities → data models → services → API routes. No UI. Test everything via CLI/curl.

## Tasks

- [x] 1. Set up testing and crypto dependencies
  - [x] 1.1 Install dependencies
    - Add to package.json: vitest, fast-check, @noble/ed25519, uuid
    - Configure vitest.config.ts for TypeScript
    - _Requirements: Testing Strategy_

- [x] 2. Implement hash utilities
  - [x] 2.1 Create hash module
    - Create `src/lib/crypto/hash.ts`
    - Implement `hashDocument(buffer: Buffer): string` using SHA-256
    - Implement `hashString(text: string): string` using SHA-256 on UTF-8 bytes
    - Return 64-char lowercase hex strings
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_

  - [ ]* 2.2 Write property tests for hash utilities
    - **Property 1: Hash Determinism**
    - **Property 2: Hash Uniqueness**
    - **Property 3: Hash Format**
    - **Validates: Requirements 1.2, 1.3, 1.4, 2.2, 2.3**

- [x] 3. Implement signing utilities
  - [x] 3.1 Create signing module
    - Create `src/lib/crypto/signing.ts`
    - Implement `generateKeyPair(): { privateKey: Uint8Array, publicKey: string }`
    - Implement `sign(payload: string, privateKey: Uint8Array): string`
    - Implement `verify(payload: string, signature: string, publicKey: string): boolean`
    - Use Ed25519 via @noble/ed25519
    - _Requirements: 5.1, 5.3, 5.4, 5.5_

  - [ ]* 3.2 Write property tests for signing utilities
    - **Property 6: Signature Round-Trip**
    - **Property 7: Signature Tamper Detection**
    - **Validates: Requirements 4.4, 5.4, 5.5**

- [x] 4. Implement Reality Signature
  - [x] 4.1 Create types and interfaces
    - Create `src/lib/types.ts`
    - Define RealitySignature, SerializedRealitySignature, PresenceProof, ApprovalSession interfaces
    - _Requirements: 3.1-3.11, 7.1-7.6, 8.1_

  - [x] 4.2 Create signature payload builder
    - Create `src/lib/signature/payload.ts`
    - Implement `buildSignaturePayload(fields): string` with fixed field order
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 4.3 Write property tests for payload builder
    - **Property 5: Payload Determinism**
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [x] 4.4 Create signature factory
    - Create `src/lib/signature/create.ts`
    - Implement `createRealitySignature(params, privateKey): RealitySignature`
    - Build payload, sign, attach public key
    - _Requirements: 3.1-3.11, 5.1, 5.2, 5.3_

  - [ ]* 4.5 Write property tests for signature creation
    - **Property 4: Signature Completeness**
    - **Validates: Requirements 3.1-3.11**

- [x] 5. Checkpoint - Crypto primitives complete
  - Ensure all tests pass, ask the user if questions arise.
  - Test via CLI: `npx vitest run`

- [-] 6. Implement Verification Service
  - [x] 6.1 Create verification module
    - Create `src/lib/verification/verify.ts`
    - Implement `verify(document: Buffer, signature: RealitySignature): VerificationResult`
    - Compute document hash, compare, verify crypto signature
    - Return success with approver details or failure with reason
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 6.2 Write property tests for verification
    - **Property 8: Verification Correctness**
    - **Property 9: Verification Failure - Document Altered**
    - **Property 10: Verification Failure - Invalid Signature**
    - **Validates: Requirements 6.2, 6.3, 6.5, 6.6, 6.7**

- [x] 7. Implement Presence Proof
  - [x] 7.1 Create presence proof module
    - Create `src/lib/presence/presence-proof.ts`
    - Implement `createPresenceProof(sessionId, challengeResult, acknowledgments): PresenceProof`
    - Validate all acknowledgments are true
    - _Requirements: 7.1-7.7_

  - [ ]* 7.2 Write property tests for presence proof
    - **Property 11: Presence Proof Completeness**
    - **Property 12: Acknowledgment Requirement**
    - **Validates: Requirements 7.1-7.7**

- [x] 8. Implement Approval Session
  - [x] 8.1 Create session module
    - Create `src/lib/session/approval-session.ts`
    - Implement `createSession(documentHash, documentPath, documentName, intentText): ApprovalSession`
    - Implement `approveSession(session, signatureId): ApprovalSession`
    - Implement `expireSession(session): ApprovalSession`
    - Implement `canApprove(session): boolean`
    - _Requirements: 8.1-8.5_

  - [ ]* 8.2 Write property tests for session state
    - **Property 13: State Transition Rules**
    - **Validates: Requirements 8.1-8.5**

- [x] 9. Checkpoint - All core modules complete
  - Ensure all tests pass, ask the user if questions arise.
  - Test via CLI: `npx vitest run`

- [x] 10. Implement in-memory storage (V0)
  - [x] 10.1 Create storage module
    - Create `src/lib/storage/memory-store.ts`
    - Implement typed stores for sessions, signatures, presence proofs
    - CRUD operations: create, get, update, delete
    - _Requirements: 8.1_

  - [x] 10.2 Create file storage for documents
    - Create `src/lib/storage/file-store.ts`
    - Implement `saveDocument(buffer, filename): string` (returns path)
    - Implement `getDocument(path): Buffer`
    - Store in `uploads/` directory
    - _Requirements: 1.3_

- [x] 11. Implement API routes
  - [x] 11.1 Create POST /api/approvals
    - Create `src/app/api/approvals/route.ts`
    - Accept multipart: document file + intent string
    - Validate file type (PDF, DOCX) and size
    - Hash document, store file, create session
    - Return: { session_id, secure_token, document_hash }
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 11.2 Create GET /api/approvals/[id]
    - Create `src/app/api/approvals/[id]/route.ts`
    - Return session details (for approver to see what they're approving)
    - _Requirements: 8.1_

  - [x] 11.3 Create POST /api/approvals/[id]/approve
    - Create `src/app/api/approvals/[id]/approve/route.ts`
    - Accept: approver_id, approver_name, acknowledgments, presence_proof_id
    - Validate session state, acknowledgments
    - Create Reality Signature
    - Return: serialized signature JSON
    - _Requirements: 3.1-3.11, 7.7, 8.3, 8.4, 8.5_

  - [x] 11.4 Create POST /api/verify
    - Create `src/app/api/verify/route.ts`
    - Accept multipart: document file + signature JSON
    - No authentication required
    - Return verification result
    - _Requirements: 6.1-6.9_

- [x] 12. Final checkpoint - CLI testing
  - Ensure all tests pass
  - Test full flow via curl:
    1. POST /api/approvals with document + intent
    2. POST /api/approvals/{id}/approve with acknowledgments
    3. POST /api/verify with document + signature
  - Verify tamper detection works

## Notes

- Tasks marked with `*` are optional property tests (can skip for faster MVP)
- No UI tasks — test everything via CLI/curl
- V0 uses in-memory storage; production will use database
- System root key loaded from environment variables
