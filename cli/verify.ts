#!/usr/bin/env npx ts-node
/**
 * r0 Standalone Verifier
 * 
 * Verifies Reality Signatures independently - no server required.
 * 
 * Usage:
 *   npx ts-node cli/verify.ts <document> <signature.json>
 * 
 * Example:
 *   npx ts-node cli/verify.ts contract.pdf signature.json
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import * as ed from '@noble/ed25519';

// ============================================================================
// TYPES
// ============================================================================

interface RealitySignature {
  v: string;      // version
  dh: string;     // document_hash
  ih: string;     // intent_hash
  it: string;     // intent_text
  ai: string;     // approver_id
  an: string;     // approver_name
  ts: number;     // timestamp
  pp: string;     // presence_proof_id
  pph: string;    // presence_proof_hash
  af: boolean;    // ai_flag
  sg: string;     // signature
  pk: string;     // public_key
}

interface VerificationResult {
  valid: boolean;
  checks: {
    document_integrity: 'pass' | 'fail';
    signature_validity: 'pass' | 'fail';
    format_valid: 'pass' | 'fail';
  };
  details: {
    approver_id: string;
    approver_name: string;
    timestamp: string;
    intent: string;
    ai_used: boolean;
  } | null;
  error?: string;
}

// ============================================================================
// CRYPTO FUNCTIONS (standalone, no imports from src/)
// ============================================================================

function hashDocument(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function buildPayload(sig: RealitySignature): string {
  const fields = {
    v: sig.v,
    dh: sig.dh,
    ih: sig.ih,
    it: sig.it,
    ai: sig.ai,
    an: sig.an,
    ts: sig.ts,
    pp: sig.pp,
    pph: sig.pph,
    af: sig.af
  };
  return JSON.stringify(fields);
}

async function verifySignature(payload: string, signature: string, publicKey: string): Promise<boolean> {
  try {
    const signatureBytes = Buffer.from(signature, 'base64');
    const publicKeyBytes = Buffer.from(publicKey, 'base64');
    const messageBytes = new TextEncoder().encode(payload);
    return await ed.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function isValidHex64(str: string): boolean {
  return typeof str === 'string' && /^[a-f0-9]{64}$/.test(str);
}

function validateSignatureFormat(sig: unknown): sig is RealitySignature {
  if (!sig || typeof sig !== 'object') return false;
  const s = sig as Record<string, unknown>;
  
  return (
    s.v === '1.0' &&
    isValidHex64(s.dh as string) &&
    isValidHex64(s.ih as string) &&
    typeof s.it === 'string' &&
    typeof s.ai === 'string' &&
    typeof s.an === 'string' &&
    typeof s.ts === 'number' &&
    typeof s.pp === 'string' &&
    isValidHex64(s.pph as string) &&
    typeof s.af === 'boolean' &&
    typeof s.sg === 'string' &&
    typeof s.pk === 'string'
  );
}

// ============================================================================
// MAIN VERIFICATION
// ============================================================================

async function verify(documentPath: string, signaturePath: string): Promise<VerificationResult> {
  // Read files
  let documentBuffer: Buffer;
  let signatureJson: unknown;
  
  try {
    documentBuffer = fs.readFileSync(documentPath);
  } catch {
    return {
      valid: false,
      checks: { document_integrity: 'fail', signature_validity: 'fail', format_valid: 'fail' },
      details: null,
      error: `Cannot read document: ${documentPath}`
    };
  }
  
  try {
    const sigContent = fs.readFileSync(signaturePath, 'utf-8');
    signatureJson = JSON.parse(sigContent);
  } catch {
    return {
      valid: false,
      checks: { document_integrity: 'fail', signature_validity: 'fail', format_valid: 'fail' },
      details: null,
      error: `Cannot read or parse signature: ${signaturePath}`
    };
  }
  
  // Validate format
  if (!validateSignatureFormat(signatureJson)) {
    return {
      valid: false,
      checks: { document_integrity: 'fail', signature_validity: 'fail', format_valid: 'fail' },
      details: null,
      error: 'Invalid signature format'
    };
  }
  
  const sig = signatureJson;
  
  // Check document integrity
  const computedHash = hashDocument(documentBuffer);
  const documentIntegrity = computedHash === sig.dh ? 'pass' : 'fail';
  
  // Check signature validity
  const payload = buildPayload(sig);
  const signatureValid = await verifySignature(payload, sig.sg, sig.pk);
  const signatureValidity = signatureValid ? 'pass' : 'fail';
  
  const valid = documentIntegrity === 'pass' && signatureValidity === 'pass';
  
  return {
    valid,
    checks: {
      document_integrity: documentIntegrity,
      signature_validity: signatureValidity,
      format_valid: 'pass'
    },
    details: {
      approver_id: sig.ai,
      approver_name: sig.an,
      timestamp: new Date(sig.ts).toISOString(),
      intent: sig.it,
      ai_used: sig.af
    },
    error: !valid ? (documentIntegrity === 'fail' ? 'Document has been altered' : 'Signature is not authentic') : undefined
  };
}

// ============================================================================
// CLI OUTPUT
// ============================================================================

function printResult(result: VerificationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('  r0 VERIFICATION RESULT');
  console.log('='.repeat(60) + '\n');
  
  if (result.valid) {
    console.log('  ✅ PASS - Approval is valid\n');
  } else {
    console.log('  ❌ FAIL - ' + (result.error || 'Verification failed') + '\n');
  }
  
  console.log('  CHECKS:');
  console.log(`    Document Integrity:  ${result.checks.document_integrity === 'pass' ? '✓' : '✗'} ${result.checks.document_integrity.toUpperCase()}`);
  console.log(`    Signature Validity:  ${result.checks.signature_validity === 'pass' ? '✓' : '✗'} ${result.checks.signature_validity.toUpperCase()}`);
  console.log(`    Format Valid:        ${result.checks.format_valid === 'pass' ? '✓' : '✗'} ${result.checks.format_valid.toUpperCase()}`);
  
  if (result.details) {
    console.log('\n  DETAILS:');
    console.log(`    Approver ID:    ${result.details.approver_id}`);
    console.log(`    Approver Name:  ${result.details.approver_name}`);
    console.log(`    Timestamp:      ${result.details.timestamp}`);
    console.log(`    Intent:         ${result.details.intent}`);
    console.log(`    AI Used:        ${result.details.ai_used ? 'Yes' : 'No'}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('  TRUST ASSUMPTIONS:');
  console.log('  - Document integrity verified (SHA-256)');
  console.log('  - Signature authenticity verified (Ed25519)');
  console.log('  - Identity is system-asserted, not externally verified');
  console.log('  - This does not prove legal enforceability');
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.log('\nUsage: npx ts-node cli/verify.ts <document> <signature.json>\n');
    console.log('Example:');
    console.log('  npx ts-node cli/verify.ts contract.pdf signature.json\n');
    process.exit(1);
  }
  
  const [documentPath, signaturePath] = args;
  const result = await verify(documentPath, signaturePath);
  printResult(result);
  
  process.exit(result.valid ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
