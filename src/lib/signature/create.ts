/**
 * Reality Signature Factory
 * 
 * Creates cryptographically signed Reality Signatures - the atomic unit of proof
 * that a specific human knowingly approved a legal action at a specific time.
 * 
 * TRUST BOUNDARY (GUARDRAIL 2 - DO NOT CHANGE):
 * The system key represents the integrity of the approval service, NOT the approver.
 * The key attests that this service witnessed and recorded an approval event.
 * Future versions may use HSM, KMS, key rotation, or key transparency logs,
 * but the semantic meaning of the key remains: "the service attests to this event".
 * 
 * Requirements: 3.1-3.11, 5.1, 5.2, 5.3
 */

import { RealitySignature, RealitySignatureParams, SignaturePayloadFields } from '../types';
import { buildSignaturePayload } from './payload';
import { sign } from '../crypto/signing';
import * as ed from '@noble/ed25519';

/**
 * Creates a Reality Signature from the provided parameters.
 * 
 * This function:
 * 1. Constructs the canonical payload from the signature fields
 * 2. Signs the payload using Ed25519 with the provided private key
 * 3. Derives the public key from the private key
 * 4. Returns the complete Reality Signature with all fields
 * 
 * @param params - The signature parameters (document hash, intent, approver info, etc.)
 * @param privateKey - The Ed25519 private key for signing
 * @returns Complete RealitySignature with cryptographic proof
 * 
 * Requirements: 3.1-3.11, 5.1, 5.2, 5.3
 */
export function createRealitySignature(
  params: RealitySignatureParams,
  privateKey: Uint8Array
): RealitySignature {
  // Build the payload fields with version and default ai_flag
  const payloadFields: SignaturePayloadFields = {
    version: "1.0",
    document_hash: params.document_hash,
    intent_hash: params.intent_hash,
    intent_text: params.intent_text,
    approver_id: params.approver_id,
    approver_name: params.approver_name,
    timestamp: params.timestamp,
    presence_proof_id: params.presence_proof_id,
    presence_proof_hash: params.presence_proof_hash,
    ai_flag: params.ai_flag ?? false
  };

  // Build the canonical payload string
  const payload = buildSignaturePayload(payloadFields);

  // Sign the payload with Ed25519
  const signature = sign(payload, privateKey);

  // Derive the public key from the private key
  const publicKeyBytes = ed.getPublicKey(privateKey);
  const publicKey = Buffer.from(publicKeyBytes).toString('base64');

  // Construct and return the complete Reality Signature
  return {
    version: "1.0",
    document_hash: params.document_hash,
    intent_hash: params.intent_hash,
    intent_text: params.intent_text,
    approver_id: params.approver_id,
    approver_name: params.approver_name,
    timestamp: params.timestamp,
    presence_proof_id: params.presence_proof_id,
    presence_proof_hash: params.presence_proof_hash,
    ai_flag: params.ai_flag ?? false,
    signature,
    public_key: publicKey
  };
}

/**
 * Serializes a Reality Signature to the compact transfer format.
 * 
 * @param sig - The Reality Signature to serialize
 * @returns Serialized format with abbreviated field names
 */
export function serializeRealitySignature(sig: RealitySignature): string {
  const serialized = {
    v: sig.version,
    dh: sig.document_hash,
    ih: sig.intent_hash,
    it: sig.intent_text,
    ai: sig.approver_id,
    an: sig.approver_name,
    ts: sig.timestamp,
    pp: sig.presence_proof_id,
    pph: sig.presence_proof_hash,
    af: sig.ai_flag,
    sg: sig.signature,
    pk: sig.public_key
  };
  return JSON.stringify(serialized);
}

/**
 * Deserializes a Reality Signature from the compact transfer format.
 * 
 * @param json - The serialized JSON string
 * @returns The deserialized Reality Signature
 * @throws Error if the JSON is malformed or missing required fields
 */
export function deserializeRealitySignature(json: string): RealitySignature {
  const parsed = JSON.parse(json);
  
  // Validate required fields
  if (parsed.v !== "1.0") {
    throw new Error('Invalid signature version');
  }
  
  return {
    version: parsed.v,
    document_hash: parsed.dh,
    intent_hash: parsed.ih,
    intent_text: parsed.it,
    approver_id: parsed.ai,
    approver_name: parsed.an,
    timestamp: parsed.ts,
    presence_proof_id: parsed.pp,
    presence_proof_hash: parsed.pph,
    ai_flag: parsed.af,
    signature: parsed.sg,
    public_key: parsed.pk
  };
}
