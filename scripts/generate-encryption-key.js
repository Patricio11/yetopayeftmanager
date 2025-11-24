#!/usr/bin/env node

/**
 * Generate Encryption Key for Credential Tokenization
 * 
 * This script generates a secure 256-bit (32-byte) encryption key
 * for use with AES-256-GCM encryption.
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js
 */

const crypto = require('crypto');

console.log('\n🔐 Generating Encryption Key for Credential Tokenization\n');
console.log('━'.repeat(60));

// Generate 32-byte (256-bit) key
const key = crypto.randomBytes(32).toString('hex');

console.log('\n✅ Encryption Key Generated!\n');
console.log('Add this to your .env.local file:\n');
console.log('━'.repeat(60));
console.log(`CREDENTIAL_ENCRYPTION_KEY=${key}`);
console.log('━'.repeat(60));

console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('   1. Keep this key SECRET - never commit to git');
console.log('   2. Store securely in production (AWS KMS, Azure Key Vault, etc.)');
console.log('   3. Rotate periodically for enhanced security');
console.log('   4. If key is lost, all encrypted credentials become unrecoverable');
console.log('   5. Use different keys for dev/staging/production environments\n');

// Also generate a salt for good measure
const salt = crypto.randomBytes(16).toString('hex');
console.log('Optional Salt (for additional security):');
console.log('━'.repeat(60));
console.log(`CREDENTIAL_ENCRYPTION_SALT=${salt}`);
console.log('━'.repeat(60));
console.log('\n');
