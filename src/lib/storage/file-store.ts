/**
 * File storage for documents.
 * 
 * Stores uploaded documents in the `uploads/` directory.
 * 
 * Requirements: 1.3
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';

/** Base directory for document uploads */
const UPLOADS_DIR = resolve(process.cwd(), 'uploads');

/**
 * Ensure the uploads directory exists.
 */
function ensureUploadsDir(): void {
  if (!existsSync(UPLOADS_DIR)) {
    mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Generate a unique filename to avoid collisions.
 * Format: {timestamp}-{random}-{originalFilename}
 */
function generateUniqueFilename(filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}-${filename}`;
}

/**
 * Save a document to the uploads directory.
 * 
 * @param buffer - The document bytes
 * @param filename - The original filename
 * @returns The relative path where the document was stored
 */
export function saveDocument(buffer: Buffer, filename: string): string {
  ensureUploadsDir();
  
  const uniqueFilename = generateUniqueFilename(filename);
  const fullPath = join(UPLOADS_DIR, uniqueFilename);
  const relativePath = join('uploads', uniqueFilename);
  
  writeFileSync(fullPath, buffer);
  
  return relativePath;
}

/**
 * Get a document from storage.
 * 
 * @param path - The relative path returned by saveDocument
 * @returns The document bytes
 * @throws Error if document not found
 */
export function getDocument(path: string): Buffer {
  const fullPath = resolve(process.cwd(), path);
  
  if (!existsSync(fullPath)) {
    throw new Error(`Document not found: ${path}`);
  }
  
  return readFileSync(fullPath);
}

/**
 * Delete a document from storage.
 * 
 * @param path - The relative path returned by saveDocument
 * @returns true if deleted, false if not found
 */
export function deleteDocument(path: string): boolean {
  const fullPath = resolve(process.cwd(), path);
  
  if (!existsSync(fullPath)) {
    return false;
  }
  
  unlinkSync(fullPath);
  return true;
}

/**
 * Check if a document exists.
 * 
 * @param path - The relative path returned by saveDocument
 * @returns true if exists, false otherwise
 */
export function documentExists(path: string): boolean {
  const fullPath = resolve(process.cwd(), path);
  return existsSync(fullPath);
}
