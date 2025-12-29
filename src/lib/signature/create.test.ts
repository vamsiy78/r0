import { describe, it, expect } from 'vitest';
import { createRealitySignature, serializeRealitySignature, deserializeRealitySignature } from './create';
import { generateKeyPair, verify } from '../crypto/signing';
import { buildSignaturePayload } from './payload';
import { hashString, hashIntent } from '../crypto/hash';

describe('Reality Signature Creation', () => {
  it('creates a valid signature that can be verified', () => {
    const { privateKey } = generateKeyPair();
    const presenceProofHash = hashString(JSON.stringify({ id: 'proof-456', test: true }));
    
    const params = {
      document_hash: hashString('test document'),
      intent_hash: hashIntent('I approve this document'),
      intent_text: 'I approve this document',
      approver_id: 'user-123',
      approver_name: 'Test User',
      timestamp: Date.now(),
      presence_proof_id: 'proof-456',
      presence_proof_hash: presenceProofHash,
      ai_flag: false
    };

    const sig = createRealitySignature(params, privateKey);

    // Verify all fields are present
    expect(sig.version).toBe('1.0');
    expect(sig.document_hash).toBe(params.document_hash);
    expect(sig.intent_hash).toBe(params.intent_hash);
    expect(sig.intent_text).toBe(params.intent_text);
    expect(sig.approver_id).toBe(params.approver_id);
    expect(sig.approver_name).toBe(params.approver_name);
    expect(sig.timestamp).toBe(params.timestamp);
    expect(sig.presence_proof_id).toBe(params.presence_proof_id);
    expect(sig.presence_proof_hash).toBe(params.presence_proof_hash);
    expect(sig.ai_flag).toBe(false);
    expect(sig.signature).toBeTruthy();
    expect(sig.public_key).toBeTruthy();

    // Verify the signature is valid
    const payloadFields = {
      version: sig.version,
      document_hash: sig.document_hash,
      intent_hash: sig.intent_hash,
      intent_text: sig.intent_text,
      approver_id: sig.approver_id,
      approver_name: sig.approver_name,
      timestamp: sig.timestamp,
      presence_proof_id: sig.presence_proof_id,
      presence_proof_hash: sig.presence_proof_hash,
      ai_flag: sig.ai_flag
    };
    const payload = buildSignaturePayload(payloadFields);
    expect(verify(payload, sig.signature, sig.public_key)).toBe(true);
  });

  it('serializes and deserializes correctly', () => {
    const { privateKey } = generateKeyPair();
    const presenceProofHash = hashString(JSON.stringify({ id: 'proof-456', test: true }));
    
    const params = {
      document_hash: hashString('test document'),
      intent_hash: hashIntent('I approve this document'),
      intent_text: 'I approve this document',
      approver_id: 'user-123',
      approver_name: 'Test User',
      timestamp: 1234567890123,
      presence_proof_id: 'proof-456',
      presence_proof_hash: presenceProofHash,
      ai_flag: true
    };

    const sig = createRealitySignature(params, privateKey);
    const serialized = serializeRealitySignature(sig);
    const deserialized = deserializeRealitySignature(serialized);

    expect(deserialized).toEqual(sig);
  });
});
