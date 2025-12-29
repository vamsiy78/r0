/**
 * POST /api/verify
 * 
 * Verifies a Reality Signature against a document.
 * This is the public, stateless verification API.
 * 
 * Accepts multipart form data:
 * - document: The original document file
 * - signature: The Reality Signature JSON (as file or string)
 * 
 * Returns verification result:
 * - Success: { valid: true, approver_id, approver_name, timestamp, document_integrity, ai_used }
 * - Failure: { valid: false, error, document_integrity, ... }
 * 
 * Requirements: 6.1-6.9
 * - 6.8: SHALL NOT require authentication
 * - 6.9: SHALL be stateless and read-only
 */

import { NextRequest, NextResponse } from 'next/server';
import { verify } from '@/src/lib/verification/verify';
import { RealitySignature, SerializedRealitySignature } from '@/src/lib/types';

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
 * Deserializes a signature from either full or compact format.
 */
function parseSignature(json: string): RealitySignature {
  const parsed = JSON.parse(json);
  
  // Check if it's the compact serialized format (has 'v' instead of 'version')
  if ('v' in parsed && !('version' in parsed)) {
    const compact = parsed as SerializedRealitySignature;
    return {
      version: compact.v,
      document_hash: compact.dh,
      intent_hash: compact.ih,
      intent_text: compact.it,
      approver_id: compact.ai,
      approver_name: compact.an,
      timestamp: compact.ts,
      presence_proof_id: compact.pp,
      presence_proof_hash: compact.pph,
      ai_flag: compact.af,
      signature: compact.sg,
      public_key: compact.pk,
    };
  }
  
  // Assume it's the full format
  return parsed as RealitySignature;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    
    const documentFile = formData.get('document');
    const signatureData = formData.get('signature');
    
    // Validate document file exists
    if (!documentFile || !(documentFile instanceof File)) {
      return errorResponse('INVALID_FILE', 'Document file is required');
    }
    
    // Validate signature exists
    if (!signatureData) {
      return errorResponse('INVALID_SIGNATURE', 'Signature is required');
    }
    
    // Read document bytes
    const arrayBuffer = await documentFile.arrayBuffer();
    const documentBuffer = Buffer.from(arrayBuffer);
    
    // Parse signature JSON
    let signatureJson: string;
    
    if (signatureData instanceof File) {
      // Signature provided as file
      const sigArrayBuffer = await signatureData.arrayBuffer();
      signatureJson = Buffer.from(sigArrayBuffer).toString('utf-8');
    } else if (typeof signatureData === 'string') {
      // Signature provided as string
      signatureJson = signatureData;
    } else {
      return errorResponse('INVALID_SIGNATURE', 'Signature must be a file or JSON string');
    }
    
    // Parse and validate signature format
    let signature: RealitySignature;
    try {
      signature = parseSignature(signatureJson);
    } catch {
      return NextResponse.json({
        valid: false,
        error: 'invalid_signature_format',
        document_integrity: 'unknown',
        message: 'Failed to parse signature JSON',
      });
    }
    
    // Perform verification (Requirements: 6.1-6.7)
    const result = verify(documentBuffer, signature);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error verifying signature:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to verify signature',
      500
    );
  }
}
