import crypto from 'crypto';

/**
 * Credential Encryption Utilities
 * Uses AES-256-GCM for secure credential storage
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * In production, this should be stored in a secure vault (AWS KMS, Azure Key Vault, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY environment variable is not set');
  }
  
  // Key should be 32 bytes (256 bits) for AES-256
  // If provided as hex string, convert to buffer
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise derive key using PBKDF2
  const salt = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_SALT || 'onegate-credential-salt', 'utf8');
  return crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt bank credentials
 * @param credentials - Object containing bank login credentials
 * @returns Encrypted string (base64 encoded)
 */
export function encryptCredentials(credentials: Record<string, any>): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Convert credentials to JSON string
    const plaintext = JSON.stringify(credentials);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine: iv + authTag + encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    // Return as base64
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt credentials');
  }
}

/**
 * Encrypt a plain string value (e.g. webhook secret)
 * @returns Base64 encoded encrypted string
 */
export function encryptString(value: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')]);
    return combined.toString('base64');
  } catch (error) {
    console.error('String encryption failed');
    throw new Error('Failed to encrypt value');
  }
}

/**
 * Decrypt a string value encrypted with encryptString
 * @param encryptedData - Base64 encoded encrypted string
 * @returns Decrypted plain string
 */
export function decryptString(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('String decryption failed');
    throw new Error('Failed to decrypt value');
  }
}

/**
 * Decrypt bank credentials
 * @param encryptedData - Base64 encoded encrypted string
 * @returns Decrypted credentials object
 */
export function decryptCredentials(encryptedData: string): Record<string, any> {
  try {
    const key = getEncryptionKey();
    
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse JSON
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed');
    throw new Error('Failed to decrypt credentials');
  }
}

/**
 * Create a hash of credentials for deduplication
 * This allows us to check if credentials already exist without decrypting
 */
export function hashCredentials(credentials: Record<string, any>): string {
  const normalized = JSON.stringify(credentials, Object.keys(credentials).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generate device fingerprint from request data
 * Combines multiple factors for unique device identification
 */
export function generateDeviceFingerprint(data: {
  userAgent?: string;
  ipAddress?: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
}): string {
  const components = [
    data.userAgent || '',
    data.ipAddress || '',
    data.acceptLanguage || '',
    data.acceptEncoding || '',
  ].join('|');
  
  return crypto.createHash('sha256').update(components).digest('hex');
}

/**
 * Validate credential structure
 * Ensures credentials contain required fields
 */
export function validateCredentials(credentials: any): boolean {
  if (!credentials || typeof credentials !== 'object') {
    return false;
  }
  
  // Must have at least one credential field
  const keys = Object.keys(credentials);
  if (keys.length === 0) {
    return false;
  }
  
  // Check for common credential fields
  const hasValidFields = keys.some(key => 
    ['username', 'password', 'pin', 'account', 'userId', 'accessPin'].includes(key)
  );
  
  return hasValidFields;
}

/**
 * Sanitize credentials for logging (remove sensitive data)
 */
export function sanitizeCredentialsForLog(credentials: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === 'string') {
      // Show only first 2 and last 2 characters
      if (value.length > 4) {
        sanitized[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
      } else {
        sanitized[key] = '***';
      }
    } else {
      sanitized[key] = '***';
    }
  }
  
  return sanitized;
}

/**
 * Generate encryption key (for initial setup)
 * Run this once and store the key securely
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
