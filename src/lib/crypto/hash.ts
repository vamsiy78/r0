import { createHash } from 'crypto';

/**
 * Computes SHA-256 hash of document bytes.
 * @param buffer - The document bytes to hash
 * @returns 64-character lowercase hexadecimal string
 */
export function hashDocument(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Computes SHA-256 hash of a string using UTF-8 encoding.
 * @param text - The string to hash
 * @returns 64-character lowercase hexadecimal string
 */
export function hashString(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Canonicalizes intent text before hashing.
 * 
 * Rules:
 * - UTF-8 normalized (NFC)
 * - Trimmed (leading/trailing whitespace removed)
 * - Newlines normalized to \n (no \r\n or \r)
 * - Consecutive whitespace collapsed to single space (except newlines)
 * 
 * This ensures two systems hashing "the same intent" produce identical hashes.
 * 
 * @param text - The raw intent text
 * @returns Canonicalized intent text
 */
export function canonicalizeIntent(text: string): string {
  return text
    .normalize('NFC')                    // Unicode NFC normalization
    .replace(/\r\n/g, '\n')              // Windows newlines → Unix
    .replace(/\r/g, '\n')                // Old Mac newlines → Unix
    .replace(/[^\S\n]+/g, ' ')           // Collapse whitespace (except newlines) to single space
    .trim();                             // Remove leading/trailing whitespace
}

/**
 * Computes SHA-256 hash of canonicalized intent text.
 * @param text - The intent text (will be canonicalized before hashing)
 * @returns 64-character lowercase hexadecimal string
 */
export function hashIntent(text: string): string {
  const canonical = canonicalizeIntent(text);
  return hashString(canonical);
}
