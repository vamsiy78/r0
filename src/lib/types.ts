/**
 * Core type definitions for Reality-Signed Legal Approval
 * 
 * These interfaces define the canonical data structures for:
 * - Reality Signatures (the atomic unit of proof)
 * - Presence Proofs (evidence of human presence)
 * - Approval Sessions (workflow state)
 */

/**
 * The atomic unit of proof - an immutable, cryptographically signed object
 * containing all evidence that a specific human knowingly approved a legal action.
 * 
 * Requirements: 3.1-3.11
 */
export interface RealitySignature {
  /** Schema version for future compatibility */
  version: "1.0";
  
  /** SHA-256 hash of the approved document bytes (64 lowercase hex chars) */
  document_hash: string;
  
  /** SHA-256 hash of the intent text UTF-8 bytes (64 lowercase hex chars) */
  intent_hash: string;
  
  /** Human-readable approval intent (for display) */
  intent_text: string;
  
  /** Unique identifier of the approver */
  approver_id: string;
  
  /** Human-readable name of the approver */
  approver_name: string;
  
  /** Unix epoch milliseconds when approval occurred */
  timestamp: number;
  
  /** Reference to the presence verification proof */
  presence_proof_id: string;
  
  /** SHA-256 hash of the presence proof artifact (64 lowercase hex chars) */
  presence_proof_hash: string;
  
  /** Boolean indicating AI involvement (default: false) */
  ai_flag: boolean;
  
  /** Ed25519 signature of canonical payload (base64) */
  signature: string;
  
  /** Ed25519 public key for independent verification (base64) */
  public_key: string;
}

/**
 * Compact serialized format for export/transfer of Reality Signatures.
 * Uses abbreviated field names to reduce payload size.
 * 
 * Requirements: 3.1-3.11
 */
export interface SerializedRealitySignature {
  /** version */
  v: "1.0";
  /** document_hash */
  dh: string;
  /** intent_hash */
  ih: string;
  /** intent_text */
  it: string;
  /** approver_id */
  ai: string;
  /** approver_name */
  an: string;
  /** timestamp */
  ts: number;
  /** presence_proof_id */
  pp: string;
  /** presence_proof_hash */
  pph: string;
  /** ai_flag */
  af: boolean;
  /** signature (base64) */
  sg: string;
  /** public_key (base64) */
  pk: string;
}

/**
 * Acknowledgment flags that must all be true for a valid approval.
 * 
 * Requirements: 7.5
 */
export interface Acknowledgments {
  /** Approver understands what they are approving */
  understands_approval: boolean;
  /** Approver is authorized to approve */
  is_authorized: boolean;
  /** Approver is acting knowingly and voluntarily */
  acting_knowingly: boolean;
}

/**
 * Cryptographic evidence that a human was present and confirmed their intent
 * at the time of approval.
 * 
 * Requirements: 7.1-7.6
 */
export interface PresenceProof {
  /** Unique identifier for this presence proof */
  id: string;
  
  /** The approval session this proof belongs to */
  session_id: string;
  
  /** Whether the presence challenge was completed */
  challenge_completed: boolean;
  
  /** Unix epoch milliseconds when challenge was completed */
  challenge_completed_at: number;
  
  /** All three acknowledgment flags */
  acknowledgments: Acknowledgments;
  
  /** Unix epoch milliseconds when acknowledgments were made */
  acknowledged_at: number;
}

/**
 * Approval session states.
 * 
 * Requirements: 8.1
 */
export type ApprovalSessionStatus = "pending" | "approved" | "expired";

/**
 * A frozen state containing the document and approval intent,
 * awaiting human approval.
 * 
 * Requirements: 8.1
 */
export interface ApprovalSession {
  /** Unique identifier for this session */
  id: string;
  
  /** Secure token for approver link */
  secure_token: string;
  
  /** SHA-256 hash of the document */
  document_hash: string;
  
  /** Storage path where document is stored */
  document_path: string;
  
  /** Original filename of the document */
  document_name: string;
  
  /** Human-readable approval intent */
  intent_text: string;
  
  /** SHA-256 hash of the intent text */
  intent_hash: string;
  
  /** Current session state */
  status: ApprovalSessionStatus;
  
  /** Unix epoch milliseconds when session was created */
  created_at: number;
  
  /** Unix epoch milliseconds when session expires */
  expires_at: number;
  
  /** Unix epoch milliseconds when approved (null if not approved) */
  approved_at: number | null;
  
  /** Reference to the Reality Signature (null if not approved) */
  signature_id: string | null;
}

/**
 * Input parameters for creating a Reality Signature.
 * Excludes signature and public_key which are generated during creation.
 */
export interface RealitySignatureParams {
  document_hash: string;
  intent_hash: string;
  intent_text: string;
  approver_id: string;
  approver_name: string;
  timestamp: number;
  presence_proof_id: string;
  presence_proof_hash: string;
  ai_flag?: boolean;
}

/**
 * Payload fields used for signature construction.
 * This is the canonical form that gets signed.
 */
export interface SignaturePayloadFields {
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
}
