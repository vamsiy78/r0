/**
 * In-memory storage for V0 implementation.
 * 
 * Provides typed stores for sessions, signatures, and presence proofs
 * with CRUD operations: create, get, update, delete.
 * 
 * Requirements: 8.1
 */

import type { ApprovalSession, RealitySignature, PresenceProof } from '../types';

/**
 * Generic in-memory store with CRUD operations.
 */
class MemoryStore<T extends { id: string }> {
  private store: Map<string, T> = new Map();

  /**
   * Create a new item in the store.
   * @throws Error if item with same id already exists
   */
  create(item: T): T {
    if (this.store.has(item.id)) {
      throw new Error(`Item with id '${item.id}' already exists`);
    }
    this.store.set(item.id, item);
    return item;
  }

  /**
   * Get an item by id.
   * @returns The item or undefined if not found
   */
  get(id: string): T | undefined {
    return this.store.get(id);
  }

  /**
   * Update an existing item.
   * @throws Error if item does not exist
   */
  update(id: string, updates: Partial<T>): T {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Item with id '${id}' not found`);
    }
    const updated = { ...existing, ...updates, id } as T;
    this.store.set(id, updated);
    return updated;
  }

  /**
   * Delete an item by id.
   * @returns true if deleted, false if not found
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Get all items in the store.
   */
  getAll(): T[] {
    return Array.from(this.store.values());
  }

  /**
   * Clear all items from the store.
   */
  clear(): void {
    this.store.clear();
  }
}

/**
 * Typed store for ApprovalSession entities.
 */
export const sessionStore = new MemoryStore<ApprovalSession>();

/**
 * Typed store for RealitySignature entities.
 * Note: RealitySignature doesn't have an 'id' field by default,
 * so we create a wrapper type that adds one.
 */
export interface StoredRealitySignature extends RealitySignature {
  id: string;
}

export const signatureStore = new MemoryStore<StoredRealitySignature>();

/**
 * Typed store for PresenceProof entities.
 */
export const presenceProofStore = new MemoryStore<PresenceProof>();

/**
 * Helper to find a session by secure_token.
 */
export function findSessionByToken(token: string): ApprovalSession | undefined {
  return sessionStore.getAll().find(s => s.secure_token === token);
}

/**
 * Clear all stores (useful for testing).
 */
export function clearAllStores(): void {
  sessionStore.clear();
  signatureStore.clear();
  presenceProofStore.clear();
}
