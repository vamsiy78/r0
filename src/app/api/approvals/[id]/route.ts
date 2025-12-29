/**
 * GET /api/approvals/[id]
 * 
 * Returns session details for an approval session.
 * Used by approvers to see what they're approving.
 * 
 * Requirements: 8.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/src/lib/storage/memory-store';

/**
 * Error response helper.
 */
function errorResponse(code: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { error: code, message },
    { status }
  );
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    // Get session from store
    const session = sessionStore.get(id);
    
    if (!session) {
      return errorResponse('SESSION_NOT_FOUND', 'Approval session not found', 404);
    }
    
    // Return session details (excluding sensitive internal fields)
    return NextResponse.json({
      id: session.id,
      document_name: session.document_name,
      document_hash: session.document_hash,
      intent_text: session.intent_text,
      intent_hash: session.intent_hash,
      status: session.status,
      created_at: session.created_at,
      expires_at: session.expires_at,
      approved_at: session.approved_at,
    });
    
  } catch (error) {
    console.error('Error fetching approval session:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to fetch approval session',
      500
    );
  }
}
