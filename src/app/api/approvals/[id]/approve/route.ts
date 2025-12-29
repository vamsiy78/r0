/**
 * POST /api/approvals/[id]/approve
 * 
 * Completes an approval session by creating a Reality Signature.
 * 
 * Accepts JSON body:
 * - approver_id: Unique identifier of the approver
 * - approver_name: Human-readable name of the approver
 * - acknowledgments: { understands_approval, is_authorized, acting_knowingly }
 * - presence_proof_id: (optional) Reference to presence verification
 * 
 * Returns:
 * - Serialized Reality Signature JSON
 * 
 * Requirements: 3.1-3.11, 7.7, 8.3, 8.4, 8.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionStore, signatureStore, presenceProofStore } from '@/src/lib/storage/memory-store';
import { approveSession, canApprove } from '@/src/lib/session/approval-session';
import { createPresenceProof, validateAcknowledgments, AcknowledgmentsIncompleteError, hashPresenceProof } from '@/src/lib/presence/presence-proof';
import { createRealitySignature, serializeRealitySignature } from '@/src/lib/signature/create';
import { generateKeyPair } from '@/src/lib/crypto/signing';
import { Acknowledgments } from '@/src/lib/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Error response helper.
 */
function errorResponse(code: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { error: code, message },
    { status }
  );
}

/**
 * Get the system signing key.
 * In V0, we generate a new key pair if not provided via environment.
 * Production should use HSM or cloud KMS.
 */
function getSystemKey(): Uint8Array {
  const envKey = process.env.SIGNING_PRIVATE_KEY;
  if (envKey) {
    return Buffer.from(envKey, 'base64');
  }
  // V0 fallback: generate ephemeral key (not for production!)
  const { privateKey } = generateKeyPair();
  return privateKey;
}

interface ApproveRequestBody {
  approver_id: string;
  approver_name: string;
  acknowledgments: Acknowledgments;
  presence_proof_id?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    // Parse request body
    let body: ApproveRequestBody;
    try {
      body = await request.json();
    } catch {
      return errorResponse('INVALID_JSON', 'Request body must be valid JSON');
    }
    
    const { approver_id, approver_name, acknowledgments, presence_proof_id } = body;
    
    // Validate required fields
    if (!approver_id || typeof approver_id !== 'string' || approver_id.trim().length === 0) {
      return errorResponse('INVALID_APPROVER_ID', 'Approver ID is required');
    }
    
    if (!approver_name || typeof approver_name !== 'string' || approver_name.trim().length === 0) {
      return errorResponse('INVALID_APPROVER_NAME', 'Approver name is required');
    }
    
    if (!acknowledgments || typeof acknowledgments !== 'object') {
      return errorResponse('INVALID_ACKNOWLEDGMENTS', 'Acknowledgments object is required');
    }
    
    // Get session from store
    const session = sessionStore.get(id);
    
    if (!session) {
      return errorResponse('SESSION_NOT_FOUND', 'Approval session not found', 404);
    }
    
    // Check if session can be approved (Requirements: 8.4, 8.5)
    if (!canApprove(session)) {
      if (session.status === 'expired' || Date.now() > session.expires_at) {
        return errorResponse('SESSION_EXPIRED', 'Approval session has expired', 400);
      }
      if (session.status === 'approved') {
        return errorResponse('SESSION_ALREADY_APPROVED', 'Session already has a signature', 400);
      }
      return errorResponse('SESSION_CANNOT_APPROVE', 'Session cannot be approved', 400);
    }
    
    // Validate acknowledgments (Requirement: 7.7)
    try {
      validateAcknowledgments(acknowledgments);
    } catch (error) {
      if (error instanceof AcknowledgmentsIncompleteError) {
        return errorResponse('ACKNOWLEDGMENTS_INCOMPLETE', error.message);
      }
      throw error;
    }
    
    // Create or use existing presence proof
    let presenceProofIdToUse = presence_proof_id;
    let presenceProofHashToUse: string;
    
    if (!presenceProofIdToUse) {
      // Create a new presence proof
      const presenceProof = createPresenceProof(
        session.id,
        { completed: true, completed_at: Date.now() },
        acknowledgments
      );
      presenceProofStore.create(presenceProof);
      presenceProofIdToUse = presenceProof.id;
      presenceProofHashToUse = hashPresenceProof(presenceProof);
    } else {
      // Use existing presence proof - fetch and hash it
      const existingProof = presenceProofStore.get(presenceProofIdToUse);
      if (!existingProof) {
        return errorResponse('PRESENCE_PROOF_NOT_FOUND', 'Referenced presence proof not found', 400);
      }
      presenceProofHashToUse = hashPresenceProof(existingProof);
    }
    
    // Get system signing key
    const privateKey = getSystemKey();
    
    // Create Reality Signature (Requirements: 3.1-3.11)
    const realitySignature = createRealitySignature(
      {
        document_hash: session.document_hash,
        intent_hash: session.intent_hash,
        intent_text: session.intent_text,
        approver_id: approver_id.trim(),
        approver_name: approver_name.trim(),
        timestamp: Date.now(),
        presence_proof_id: presenceProofIdToUse,
        presence_proof_hash: presenceProofHashToUse,
        ai_flag: false,
      },
      privateKey
    );
    
    // Store signature with generated ID
    const signatureId = uuidv4();
    signatureStore.create({
      id: signatureId,
      ...realitySignature,
    });
    
    // Update session to approved state (Requirements: 8.3)
    const approvedSession = approveSession(session, signatureId);
    sessionStore.update(session.id, approvedSession);
    
    // Return serialized signature
    const serialized = serializeRealitySignature(realitySignature);
    
    return NextResponse.json(JSON.parse(serialized), { status: 200 });
    
  } catch (error) {
    console.error('Error approving session:', error);
    
    // Handle known error types
    if (error instanceof Error) {
      if (error.message === 'SESSION_EXPIRED') {
        return errorResponse('SESSION_EXPIRED', 'Approval session has expired');
      }
      if (error.message === 'SESSION_ALREADY_APPROVED') {
        return errorResponse('SESSION_ALREADY_APPROVED', 'Session already has a signature');
      }
    }
    
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to approve session',
      500
    );
  }
}
