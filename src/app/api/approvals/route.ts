/**
 * POST /api/approvals
 * 
 * Creates a new approval session for a document.
 * 
 * Accepts multipart form data:
 * - document: The file to be approved (PDF or DOCX)
 * - intent: The approval intent text
 * 
 * Returns:
 * - session_id: Unique identifier for the session
 * - secure_token: Token for the approver link
 * - document_hash: SHA-256 hash of the document
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { hashDocument, canonicalizeIntent } from '@/src/lib/crypto/hash';
import { saveDocument } from '@/src/lib/storage/file-store';
import { createSession } from '@/src/lib/session/approval-session';
import { sessionStore } from '@/src/lib/storage/memory-store';

/** Allowed file types */
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
];

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

/** Maximum file size: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validates the file type based on MIME type and extension.
 */
function isValidFileType(file: File): boolean {
  // Check MIME type
  if (ALLOWED_TYPES.includes(file.type)) {
    return true;
  }
  
  // Fallback: check extension
  const name = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext));
}

/**
 * Error response helper.
 */
function errorResponse(code: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { error: code, message },
    { status }
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    
    const documentFile = formData.get('document');
    const intent = formData.get('intent');
    
    // Validate document file exists
    if (!documentFile || !(documentFile instanceof File)) {
      return errorResponse('INVALID_FILE', 'Document file is required');
    }
    
    // Validate intent exists and is non-empty
    if (!intent || typeof intent !== 'string' || intent.trim().length === 0) {
      return errorResponse('INVALID_INTENT', 'Intent text is required');
    }
    
    // Validate file type (Requirements: 1.5 - PDF, DOCX)
    if (!isValidFileType(documentFile)) {
      return errorResponse('INVALID_FILE_TYPE', 'Document must be PDF or DOCX');
    }
    
    // Validate file size
    if (documentFile.size > MAX_FILE_SIZE) {
      return errorResponse('FILE_TOO_LARGE', 'Document exceeds maximum size of 10MB');
    }
    
    // Read file bytes
    const arrayBuffer = await documentFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Compute document hash (Requirements: 1.1, 1.2, 1.4)
    const documentHash = hashDocument(buffer);
    
    // Store document (Requirement: 1.3)
    const documentPath = saveDocument(buffer, documentFile.name);
    
    // Create approval session with canonicalized intent
    const canonicalIntent = canonicalizeIntent(intent);
    const session = createSession(
      documentHash,
      documentPath,
      documentFile.name,
      canonicalIntent
    );
    
    // Store session in memory
    sessionStore.create(session);
    
    // Return session details
    return NextResponse.json({
      session_id: session.id,
      secure_token: session.secure_token,
      document_hash: documentHash,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating approval session:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to create approval session',
      500
    );
  }
}
