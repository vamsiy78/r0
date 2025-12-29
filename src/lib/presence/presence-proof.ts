/**
 * Presence Proof Module
 * 
 * Creates cryptographic evidence that a human was present and confirmed
 * their intent at the time of approval.
 * 
 * EVOLUTION RULE (GUARDRAIL 3 - DO NOT CHANGE):
 * Presence proofs may evolve in strength (e.g., biometrics, hardware tokens,
 * video attestation), but their hashes MUST ALWAYS be bound into the signed
 * payload. This ensures backward compatibility, auditability, and prevents
 * retroactive weakening of proof requirements.
 * 
 * Requirements: 7.1-7.7
 */

import { v4 as uuidv4 } from 'uuid';
import { PresenceProof, Acknowledgments } from '../types';
import { hashString } from '../crypto/hash';

/**
 * Error thrown when acknowledgments are incomplete.
 */
export class AcknowledgmentsIncompleteError extends Error {
  constructor(message: string = 'All acknowledgment flags must be true') {
    super(message);
    this.name = 'AcknowledgmentsIncompleteError';
  }
}

/**
 * Result of a challenge completion.
 */
export interface ChallengeResult {
  /** Whether the challenge was completed successfully */
  completed: boolean;
  /** Unix epoch milliseconds when challenge was completed */
  completed_at: number;
}

/**
 * Validates that all acknowledgment flags are true.
 * 
 * Requirements: 7.7 - FOR ANY approval, all three acknowledgment flags SHALL be true
 * 
 * @param acknowledgments - The acknowledgment flags to validate
 * @returns true if all flags are true
 * @throws AcknowledgmentsIncompleteError if any flag is false
 */
export function validateAcknowledgments(acknowledgments: Acknowledgments): boolean {
  if (!acknowledgments.understands_approval) {
    throw new AcknowledgmentsIncompleteError('Approver must understand what they are approving');
  }
  if (!acknowledgments.is_authorized) {
    throw new AcknowledgmentsIncompleteError('Approver must be authorized to approve');
  }
  if (!acknowledgments.acting_knowingly) {
    throw new AcknowledgmentsIncompleteError('Approver must be acting knowingly and voluntarily');
  }
  return true;
}

/**
 * Creates a Presence Proof with validated acknowledgments.
 * 
 * Requirements:
 * - 7.1: SHALL contain a unique identifier
 * - 7.2: SHALL contain the session_id it belongs to
 * - 7.3: SHALL contain a challenge_completed flag
 * - 7.4: SHALL contain a challenge_completed_at timestamp
 * - 7.5: SHALL contain acknowledgment flags: understands_approval, is_authorized, acting_knowingly
 * - 7.6: SHALL contain an acknowledged_at timestamp
 * - 7.7: FOR ANY approval, all three acknowledgment flags SHALL be true
 * 
 * @param sessionId - The approval session this proof belongs to
 * @param challengeResult - Result of the presence challenge
 * @param acknowledgments - The acknowledgment flags (all must be true)
 * @returns A complete PresenceProof object
 * @throws AcknowledgmentsIncompleteError if any acknowledgment flag is false
 */
export function createPresenceProof(
  sessionId: string,
  challengeResult: ChallengeResult,
  acknowledgments: Acknowledgments
): PresenceProof {
  // Validate all acknowledgments are true (Requirement 7.7)
  validateAcknowledgments(acknowledgments);

  return {
    id: uuidv4(),
    session_id: sessionId,
    challenge_completed: challengeResult.completed,
    challenge_completed_at: challengeResult.completed_at,
    acknowledgments: {
      understands_approval: acknowledgments.understands_approval,
      is_authorized: acknowledgments.is_authorized,
      acting_knowingly: acknowledgments.acting_knowingly,
    },
    acknowledged_at: Date.now(),
  };
}


/**
 * Computes the SHA-256 hash of a PresenceProof for cryptographic binding.
 * 
 * The hash is computed over a canonical JSON representation of the proof,
 * ensuring the same proof always produces the same hash.
 * 
 * @param proof - The presence proof to hash
 * @returns 64-character lowercase hexadecimal SHA-256 hash
 */
export function hashPresenceProof(proof: PresenceProof): string {
  // Canonical representation with fixed field order
  const canonical = JSON.stringify({
    id: proof.id,
    sid: proof.session_id,
    cc: proof.challenge_completed,
    cca: proof.challenge_completed_at,
    ack: {
      ua: proof.acknowledgments.understands_approval,
      ia: proof.acknowledgments.is_authorized,
      ak: proof.acknowledgments.acting_knowingly,
    },
    aa: proof.acknowledged_at,
  });
  return hashString(canonical);
}
