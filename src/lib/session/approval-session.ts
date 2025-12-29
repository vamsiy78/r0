import { v4 as uuidv4 } from 'uuid';
import { ApprovalSession, ApprovalSessionStatus } from '../types';
import { hashIntent } from '../crypto/hash';

/** Default session expiration time: 24 hours in milliseconds */
const DEFAULT_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Creates a new approval session in pending state.
 * 
 * Requirements: 8.1, 8.2
 * 
 * @param documentHash - SHA-256 hash of the document
 * @param documentPath - Storage path where document is stored
 * @param documentName - Original filename of the document
 * @param intentText - Human-readable approval intent
 * @returns A new ApprovalSession in pending state
 */
export function createSession(
  documentHash: string,
  documentPath: string,
  documentName: string,
  intentText: string
): ApprovalSession {
  const now = Date.now();
  
  return {
    id: uuidv4(),
    secure_token: uuidv4(),
    document_hash: documentHash,
    document_path: documentPath,
    document_name: documentName,
    intent_text: intentText,
    intent_hash: hashIntent(intentText),
    status: 'pending',
    created_at: now,
    expires_at: now + DEFAULT_EXPIRATION_MS,
    approved_at: null,
    signature_id: null,
  };
}

/**
 * Transitions a session to approved state with a signature reference.
 * 
 * Requirements: 8.3, 8.5
 * 
 * @param session - The session to approve
 * @param signatureId - Reference to the Reality Signature
 * @returns A new ApprovalSession in approved state
 * @throws Error if session cannot be approved (not pending or expired)
 */
export function approveSession(
  session: ApprovalSession,
  signatureId: string
): ApprovalSession {
  if (!canApprove(session)) {
    throw new Error(
      session.status === 'expired'
        ? 'SESSION_EXPIRED'
        : 'SESSION_ALREADY_APPROVED'
    );
  }
  
  return {
    ...session,
    status: 'approved',
    approved_at: Date.now(),
    signature_id: signatureId,
  };
}

/**
 * Transitions a session to expired state.
 * 
 * Requirements: 8.4
 * 
 * @param session - The session to expire
 * @returns A new ApprovalSession in expired state
 */
export function expireSession(session: ApprovalSession): ApprovalSession {
  return {
    ...session,
    status: 'expired',
  };
}

/**
 * Checks if a session can be approved.
 * A session can only be approved if it is in pending state and not expired.
 * 
 * Requirements: 8.4, 8.5
 * 
 * @param session - The session to check
 * @returns true if the session can be approved, false otherwise
 */
export function canApprove(session: ApprovalSession): boolean {
  // Only pending sessions can be approved
  if (session.status !== 'pending') {
    return false;
  }
  
  // Check if session has expired based on time
  if (Date.now() > session.expires_at) {
    return false;
  }
  
  return true;
}
