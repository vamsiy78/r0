/**
 * Signature Payload Builder
 * 
 * Constructs the canonical payload for signing Reality Signatures.
 * The payload MUST be constructed in a fixed field order to ensure
 * deterministic signing - the same fields always produce the same payload bytes.
 * 
 * Requirements: 4.1, 4.2, 4.3
 */

import { SignaturePayloadFields } from '../types';

/**
 * Canonical payload structure with abbreviated field names.
 * Field order is FIXED and must never change.
 */
interface CanonicalPayload {
  v: string;      // version
  dh: string;     // document_hash
  ih: string;     // intent_hash
  it: string;     // intent_text
  ai: string;     // approver_id
  an: string;     // approver_name
  ts: number;     // timestamp
  pp: string;     // presence_proof_id
  pph: string;    // presence_proof_hash
  af: boolean;    // ai_flag
}

/**
 * Builds the canonical signature payload from signature fields.
 * 
 * The payload is constructed with fields in a FIXED order to ensure
 * deterministic JSON stringification. This is critical because:
 * - JSON.stringify doesn't guarantee field order
 * - The same signature fields must always produce the same payload bytes
 * - The same payload bytes must produce the same signature
 * 
 * Field order: v, dh, ih, it, ai, an, ts, pp, pph, af
 * 
 * @param fields - The signature fields (excluding signature and public_key)
 * @returns JSON string of the canonical payload
 * 
 * Requirements: 4.1, 4.2, 4.3
 */
export function buildSignaturePayload(fields: SignaturePayloadFields): string {
  // Construct payload with FIXED field order - NEVER change this order
  const payload: CanonicalPayload = {
    v: fields.version,
    dh: fields.document_hash,
    ih: fields.intent_hash,
    it: fields.intent_text,
    ai: fields.approver_id,
    an: fields.approver_name,
    ts: fields.timestamp,
    pp: fields.presence_proof_id,
    pph: fields.presence_proof_hash,
    af: fields.ai_flag
  };

  // JSON.stringify with explicit key order via object literal construction
  // The object is constructed in the exact order we want
  return JSON.stringify(payload);
}

/**
 * Extracts payload fields from a RealitySignature for verification.
 * Used when reconstructing the payload to verify a signature.
 * 
 * @param signature - Partial signature containing the payload fields
 * @returns SignaturePayloadFields ready for buildSignaturePayload
 */
export function extractPayloadFields(signature: {
  version: "1.0";
  document_hash: string;
  intent_hash: string;
  intent_text: string;
  approver_id: string;
  approver_name: string;
  timestamp: number;
  presence_proof_id: string;
  presence_proof_hash: string;
  ai_flag: boolean;
}): SignaturePayloadFields {
  return {
    version: signature.version,
    document_hash: signature.document_hash,
    intent_hash: signature.intent_hash,
    intent_text: signature.intent_text,
    approver_id: signature.approver_id,
    approver_name: signature.approver_name,
    timestamp: signature.timestamp,
    presence_proof_id: signature.presence_proof_id,
    presence_proof_hash: signature.presence_proof_hash,
    ai_flag: signature.ai_flag
  };
}
