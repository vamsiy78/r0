/**
 * Verification Service
 * 
 * Provides independent verification of Reality Signatures.
 * A third party can verify without trusting the system - they only need:
 * - The original document
 * - The Reality Signature
 * - This verification algorithm (open, deterministic)
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { RealitySignature } from '../types';
import { hashDocument } from '../crypto/hash';
import { verify as verifySignature } from '../crypto/signing';
import { buildSignaturePayload, extractPayloadFields } from '../signature/payload';

/**
 * Successful verification result.
 * Requirements: 6.7
 */
export interface VerificationSuccess {
  valid: true;
  approver_id: string;
  approver_name: string;
  timestamp: number;
  document_integrity: "intact";
  ai_used: boolean;
}

/**
 * Verification failure due to document alteration.
 * Requirements: 6.3
 */
export interface VerificationFailureDocumentAltered {
  valid: false;
  error: "document_altered";
  document_integrity: "altered";
  computed_hash: string;
  expected_hash: string;
}

/**
 * Verification failure due to invalid cryptographic signature.
 * Requirements: 6.6
 */
export interface VerificationFailureInvalidSignature {
  valid: false;
  error: "signature_not_authentic";
  document_integrity: "unknown";
}

/**
 * Verification failure due to malformed signature format.
 */
export interface VerificationFailureMalformed {
  valid: false;
  error: "invalid_signature_format";
  document_integrity: "unknown";
  message?: string;
}

/**
 * Union type of all possible verification results.
 */
export type VerificationResult =
  | VerificationSuccess
  | VerificationFailureDocumentAltered
  | VerificationFailureInvalidSignature
  | VerificationFailureMalformed;

/**
 * Validates that a signature has all required fields with correct types.
 * @param signature - The signature object to validate
 * @returns true if valid, false otherwise
 */
function isValidSignatureFormat(signature: unknown): signature is RealitySignature {
  if (typeof signature !== 'object' || signature === null) {
    return false;
  }

  const sig = signature as Record<string, unknown>;

  // Check version
  if (sig.version !== "1.0") return false;

  // Check document_hash (64 hex chars)
  if (typeof sig.document_hash !== 'string' || !/^[0-9a-f]{64}$/.test(sig.document_hash)) {
    return false;
  }

  // Check intent_hash (64 hex chars)
  if (typeof sig.intent_hash !== 'string' || !/^[0-9a-f]{64}$/.test(sig.intent_hash)) {
    return false;
  }

  // Check intent_text (non-empty string)
  if (typeof sig.intent_text !== 'string' || sig.intent_text.length === 0) {
    return false;
  }

  // Check approver_id (non-empty string)
  if (typeof sig.approver_id !== 'string' || sig.approver_id.length === 0) {
    return false;
  }

  // Check approver_name (non-empty string)
  if (typeof sig.approver_name !== 'string' || sig.approver_name.length === 0) {
    return false;
  }

  // Check timestamp (positive integer)
  if (typeof sig.timestamp !== 'number' || !Number.isInteger(sig.timestamp) || sig.timestamp <= 0) {
    return false;
  }

  // Check presence_proof_id (non-empty string)
  if (typeof sig.presence_proof_id !== 'string' || sig.presence_proof_id.length === 0) {
    return false;
  }

  // Check presence_proof_hash (64 hex chars)
  if (typeof sig.presence_proof_hash !== 'string' || !/^[0-9a-f]{64}$/.test(sig.presence_proof_hash)) {
    return false;
  }

  // Check ai_flag (boolean)
  if (typeof sig.ai_flag !== 'boolean') {
    return false;
  }

  // Check signature (non-empty base64)
  if (typeof sig.signature !== 'string' || sig.signature.length === 0) {
    return false;
  }

  // Check public_key (non-empty base64)
  if (typeof sig.public_key !== 'string' || sig.public_key.length === 0) {
    return false;
  }

  return true;
}

/**
 * Verifies a Reality Signature against a document.
 * 
 * Algorithm:
 * 1. PARSE signature - If malformed → FAIL("invalid_signature_format")
 * 2. COMPUTE document_hash = SHA256(document)
 * 3. CHECK document_hash == signature.document_hash
 *    - If mismatch → FAIL("document_altered", computed_hash, expected_hash)
 * 4. RECONSTRUCT payload = buildSignaturePayload(signature fields)
 * 5. VERIFY Ed25519(payload, signature.signature, signature.public_key)
 *    - If invalid → FAIL("signature_not_authentic")
 * 6. RETURN SUCCESS with approver details
 * 
 * @param document - The original document bytes
 * @param signature - The Reality Signature to verify
 * @returns VerificationResult indicating success or failure with details
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
export function verify(document: Buffer, signature: RealitySignature | unknown): VerificationResult {
  // Step 1: Validate signature format
  if (!isValidSignatureFormat(signature)) {
    return {
      valid: false,
      error: "invalid_signature_format",
      document_integrity: "unknown"
    };
  }

  // Step 2: Compute document hash (Requirement 6.1)
  const computedHash = hashDocument(document);

  // Step 3: Compare document hashes (Requirements 6.2, 6.3)
  if (computedHash !== signature.document_hash) {
    return {
      valid: false,
      error: "document_altered",
      document_integrity: "altered",
      computed_hash: computedHash,
      expected_hash: signature.document_hash
    };
  }

  // Step 4: Reconstruct canonical payload (Requirement 6.4)
  const payloadFields = extractPayloadFields(signature);
  const payload = buildSignaturePayload(payloadFields);

  // Step 5: Verify cryptographic signature (Requirements 6.5, 6.6)
  const isSignatureValid = verifySignature(payload, signature.signature, signature.public_key);

  if (!isSignatureValid) {
    return {
      valid: false,
      error: "signature_not_authentic",
      document_integrity: "unknown"
    };
  }

  // Step 6: Return success with approver details (Requirement 6.7)
  return {
    valid: true,
    approver_id: signature.approver_id,
    approver_name: signature.approver_name,
    timestamp: signature.timestamp,
    document_integrity: "intact",
    ai_used: signature.ai_flag
  };
}
