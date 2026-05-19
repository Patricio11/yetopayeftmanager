/**
 * Browser-Based Credential Storage
 * 
 * This module handles PURE CLIENT-SIDE storage of encrypted credentials.
 * No credentials are sent to or stored in the database - only metadata.
 * 
 * Storage Strategy:
 * - Credentials: localStorage (encrypted with AES-256-GCM)
 * - Metadata: Database (for audit trail, no sensitive data)
 * 
 * Compliance:
 * - PCI DSS friendly (no credentials on server)
 * - User has full control (browser storage)
 * - Clear browser = clear credentials
 */

import { getDeviceFingerprint } from './device-fingerprint';

interface StoredCredential {
  id: string;
  merchantId: string;
  bankCode: string;
  bankName: string;
  credentials: Record<string, any>;
  isDefault: boolean;
  accountInfo?: {
    accountNumber?: string;
    accountType?: string;
    accountName?: string;
  };
  createdAt: string;
  lastUsedAt: string;
  usageCount: number;
}

interface CredentialMetadata {
  id: string;
  merchantId: string;
  bankCode: string;
  deviceFingerprint: string;
  isDefault: boolean;
  hasAccountInfo: boolean;
  createdAt: string;
  lastUsedAt: string;
  usageCount: number;
}

const STORAGE_KEY_PREFIX = 'yetopay_cred_';
const STORAGE_VERSION = 'v1';

/**
 * Generate storage key for credentials
 */
function getStorageKey(merchantId: string, bankCode: string): string {
  return `${STORAGE_KEY_PREFIX}${STORAGE_VERSION}_${merchantId}_${bankCode}`;
}

/**
 * Encrypt credentials using Web Crypto API (browser-native)
 */
async function encryptForBrowser(data: any, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data);
  
  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(dataString)
  );
  
  // Combine salt + iv + encrypted data
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt credentials using Web Crypto API
 */
async function decryptForBrowser(encryptedData: string, password: string): Promise<any> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const encrypted = combined.slice(28);
  
  // Derive key from password
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encrypted
  );
  
  return JSON.parse(decoder.decode(decrypted));
}

/**
 * Generate encryption password from device fingerprint + merchant
 */
async function getEncryptionPassword(
  merchantId: string
): Promise<string> {
  const fingerprint = await getDeviceFingerprint();
  return `${fingerprint}_${merchantId}`;
}

/**
 * Save credentials to browser localStorage (encrypted)
 */
export async function saveCredentialsToBrowser(
  merchantId: string,
  bankCode: string,
  bankName: string,
  credentials: Record<string, any>,
  accountInfo?: {
    accountNumber?: string;
    accountType?: string;
    accountName?: string;
  }
): Promise<{ success: boolean; credentialId: string }> {
  try {
    const storageKey = getStorageKey(merchantId, bankCode);
    const password = await getEncryptionPassword(merchantId);
    
    // Check if credential already exists
    let existingCred: StoredCredential | null = null;
    try {
      existingCred = await getCredentialFromBrowser(merchantId, bankCode);
    } catch (e) {
      // Doesn't exist, that's fine
    }
    
    const credentialId = existingCred?.id || crypto.randomUUID();
    const now = new Date().toISOString();
    
    const credentialData: StoredCredential = {
      id: credentialId,
      merchantId,
      bankCode,
      bankName,
      credentials,
      isDefault: existingCred?.isDefault || false,
      accountInfo,
      createdAt: existingCred?.createdAt || now,
      lastUsedAt: now,
      usageCount: (existingCred?.usageCount || 0) + 1,
    };
    
    // Encrypt and store
    const encrypted = await encryptForBrowser(credentialData, password);
    localStorage.setItem(storageKey, encrypted);
    
    console.log('✅ Credentials saved to browser storage');
    
    return { success: true, credentialId };
  } catch (error) {
    console.error('❌ Failed to save credentials to browser:', error);
    return { success: false, credentialId: '' };
  }
}

/**
 * Get credentials from browser localStorage (decrypted)
 */
export async function getCredentialFromBrowser(
  merchantId: string,
  bankCode: string
): Promise<StoredCredential> {
  const storageKey = getStorageKey(merchantId, bankCode);
  const encrypted = localStorage.getItem(storageKey);
  
  if (!encrypted) {
    throw new Error('Credential not found');
  }
  
  const password = await getEncryptionPassword(merchantId);
  return await decryptForBrowser(encrypted, password);
}

/**
 * Get all saved credentials for a merchant
 */
export async function getAllCredentialsForMerchant(
  merchantId: string
): Promise<StoredCredential[]> {
  const credentials: StoredCredential[] = [];
  const prefix = `${STORAGE_KEY_PREFIX}${STORAGE_VERSION}_${merchantId}_`;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      const bankCode = key.replace(prefix, '');
      const cred = await getCredentialFromBrowser(merchantId, bankCode);
      if (cred) {
        credentials.push(cred);
      }
    }
  }
  
  // Sort by last used (most recent first), then by default
  return credentials.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
  });
}

/**
 * Delete credentials from browser localStorage
 */
export async function deleteCredentialFromBrowser(
  merchantId: string,
  bankCode: string
): Promise<void> {
  const storageKey = getStorageKey(merchantId, bankCode);
  localStorage.removeItem(storageKey);
  console.log('✅ Credential deleted from browser storage');
}

/**
 * Clear all credentials for a merchant (useful for logout/privacy)
 */
export async function clearAllCredentials(
  merchantId: string
): Promise<number> {
  const allCreds = await getAllCredentialsForMerchant(merchantId);
  let cleared = 0;
  
  for (const cred of allCreds) {
    await deleteCredentialFromBrowser(merchantId, cred.bankCode);
    cleared++;
  }
  
  return cleared;
}
