import { describe, it, expect } from 'vitest';
import { createSession, approveSession, expireSession, canApprove } from './approval-session';

describe('Approval Session', () => {
  const testDocumentHash = 'a'.repeat(64);
  const testDocumentPath = '/uploads/test.pdf';
  const testDocumentName = 'test.pdf';
  const testIntentText = 'Approve contract with ACME Corp';

  describe('createSession', () => {
    it('creates a session in pending state with null signature', () => {
      const session = createSession(testDocumentHash, testDocumentPath, testDocumentName, testIntentText);
      
      expect(session.status).toBe('pending');
      expect(session.signature_id).toBeNull();
      expect(session.approved_at).toBeNull();
      expect(session.document_hash).toBe(testDocumentHash);
      expect(session.document_path).toBe(testDocumentPath);
      expect(session.document_name).toBe(testDocumentName);
      expect(session.intent_text).toBe(testIntentText);
      expect(session.intent_hash).toHaveLength(64);
      expect(session.id).toBeDefined();
      expect(session.secure_token).toBeDefined();
      expect(session.created_at).toBeLessThanOrEqual(Date.now());
      expect(session.expires_at).toBeGreaterThan(session.created_at);
    });
  });

  describe('approveSession', () => {
    it('transitions pending session to approved with signature reference', () => {
      const session = createSession(testDocumentHash, testDocumentPath, testDocumentName, testIntentText);
      const signatureId = 'sig-123';
      
      const approved = approveSession(session, signatureId);
      
      expect(approved.status).toBe('approved');
      expect(approved.signature_id).toBe(signatureId);
      expect(approved.approved_at).not.toBeNull();
    });

    it('throws error when approving already approved session', () => {
      const session = createSession(testDocumentHash, testDocumentPath, testDocumentName, testIntentText);
      const approved = approveSession(session, 'sig-123');
      
      expect(() => approveSession(approved, 'sig-456')).toThrow('SESSION_ALREADY_APPROVED');
    });

    it('throws error when approving expired session', () => {
      const session = createSession(testDocumentHash, testDocumentPath, testDocumentName, testIntentText);
      const expired = expireSession(session);
      
      expect(() => approveSession(expired, 'sig-123')).toThrow('SESSION_EXPIRED');
    });
  });

  describe('expireSession', () => {
    it('transitions session to expired state', () => {
      const session = createSession(testDocumentHash, testDocumentPath, testDocumentName, testIntentText);
      const expired = expireSession(session);
      
      expect(expired.status).toBe('expired');
    });
  });

  describe('canApprove', () => {
    it('returns true for pending session', () => {
      const session = createSession(testDocumentHash, testDocumentPath, testDocumentName, testIntentText);
      expect(canApprove(session)).toBe(true);
    });

    it('returns false for approved session', () => {
      const session = createSession(testDocumentHash, testDocumentPath, testDocumentName, testIntentText);
      const approved = approveSession(session, 'sig-123');
      expect(canApprove(approved)).toBe(false);
    });

    it('returns false for expired session', () => {
      const session = createSession(testDocumentHash, testDocumentPath, testDocumentName, testIntentText);
      const expired = expireSession(session);
      expect(canApprove(expired)).toBe(false);
    });
  });
});
