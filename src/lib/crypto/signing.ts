import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// Configure @noble/ed25519 to use sha512 for synchronous operations
ed.hashes.sha512 = (message: Uint8Array) => sha512(message);

/**
 * Generates an Ed25519 key pair for signing.
 * @returns Object containing privateKey as Uint8Array and publicKey as base64 string
 */
export function generateKeyPair(): { privateKey: Uint8Array; publicKey: string } {
  const { secretKey, publicKey: publicKeyBytes } = ed.keygen();
  const publicKey = Buffer.from(publicKeyBytes).toString('base64');
  return { privateKey: secretKey, publicKey };
}

/**
 * Signs a payload string using Ed25519.
 * @param payload - The string payload to sign
 * @param privateKey - The Ed25519 private key as Uint8Array
 * @returns Base64-encoded signature string
 */
export function sign(payload: string, privateKey: Uint8Array): string {
  const messageBytes = new TextEncoder().encode(payload);
  const signatureBytes = ed.sign(messageBytes, privateKey);
  return Buffer.from(signatureBytes).toString('base64');
}

/**
 * Verifies an Ed25519 signature against a payload.
 * @param payload - The original string payload
 * @param signature - The base64-encoded signature
 * @param publicKey - The base64-encoded public key
 * @returns true if signature is valid, false otherwise
 */
export function verify(payload: string, signature: string, publicKey: string): boolean {
  try {
    const messageBytes = new TextEncoder().encode(payload);
    const signatureBytes = Buffer.from(signature, 'base64');
    const publicKeyBytes = Buffer.from(publicKey, 'base64');
    return ed.verify(signatureBytes, messageBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
