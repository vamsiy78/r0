/**
 * Unit tests for the verification module.
 * Tests the core verification logic with real signatures.
 */

import { describe, it, expect } from 'vitest';
import { verify, VerificationResult } from './verify';
import { createRealitySignature } from '../signature/create';
import { generateKeyPair } from '../crypto/signing';
import { hashDocument, hashString, hashIntent } from '../crypto/hash';

describe('verify', () => {
  // Helper to create a valid signature for testing
  function createTestSignature(document: Buffer, intentText: string) {
    const keyPair = generateKeyPair();
    const documentHash = hashDocument(document);
    const intentHash = hashIntent(intentText);
    // Create a mock presence proof hash (64 hex chars)
    const presenceProofHash = hashString(JSON.stringify({
      id: 'presence-proof-456',
      session_id: 'test-session',
      challenge_completed: true
    }));

    return createRealitySignature({
      document_hash: documentHash,
      intent_hash: intentHash,
      intent_text: intentText,
      approver_id: 'test-approver-123',
      approver_name: 'Test Approver',
      timestamp: Date.now(),
      presence_proof_id: 'presence-proof-456',
      presence_proof_hash: presenceProofHash,
      ai_flag: false
    }, keyPair.privateKey);
  }

  it('should return valid=true for unmodified document and valid signature', () => {
    const document = Buffer.from('Test document content');
    const signature = createTestSignature(document, 'Approve this test document');

    const result = verify(document, signature);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.document_integrity).toBe('intact');
      expect(result.approver_id).toBe('test-approver-123');
      expect(result.approver_name).toBe('Test Approver');
      expect(result.ai_used).toBe(false);
    }
  });

  it('should return document_altered when document is modified', () => {
    const originalDocument = Buffer.from('Original content');
    const signature = createTestSignature(originalDocument, 'Approve original');

    const modifiedDocument = Buffer.from('Modified content');
    const result = verify(modifiedDocument, signature);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('document_altered');
      expect(result.document_integrity).toBe('altered');
    }
  });

  it('should return signature_not_authentic when signature is tampered', () => {
    const document = Buffer.from('Test document');
    const signature = createTestSignature(document, 'Approve test');

    // Tamper with the signature by using a completely different key's signature
    const differentKeyPair = generateKeyPair();
    const tamperedSignature = {
      ...signature,
      // Use the public key from a different key pair (signature won't match)
      public_key: differentKeyPair.publicKey
    };

    const result = verify(document, tamperedSignature);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('signature_not_authentic');
    }
  });

  it('should return invalid_signature_format for malformed signature', () => {
    const document = Buffer.from('Test document');

    const result = verify(document, { invalid: 'signature' });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('invalid_signature_format');
      expect(result.document_integrity).toBe('unknown');
    }
  });

  it('should return invalid_signature_format for null signature', () => {
    const document = Buffer.from('Test document');

    const result = verify(document, null);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe('invalid_signature_format');
    }
  });

  it('should correctly report ai_used flag', () => {
    const document = Buffer.from('AI-assisted document');
    const keyPair = generateKeyPair();
    const documentHash = hashDocument(document);
    const intentHash = hashIntent('Approve with AI');
    const presenceProofHash = hashString(JSON.stringify({
      id: 'pp-ai',
      session_id: 'test-session',
      challenge_completed: true
    }));

    const signature = createRealitySignature({
      document_hash: documentHash,
      intent_hash: intentHash,
      intent_text: 'Approve with AI',
      approver_id: 'ai-user',
      approver_name: 'AI User',
      timestamp: Date.now(),
      presence_proof_id: 'pp-ai',
      presence_proof_hash: presenceProofHash,
      ai_flag: true
    }, keyPair.privateKey);

    const result = verify(document, signature);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.ai_used).toBe(true);
    }
  });
});
