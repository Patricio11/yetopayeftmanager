import crypto from 'crypto';
import { db } from '@/lib/db';
import { paymentTokens, eftTransactions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { PAYMENT_TOKEN_CONFIG } from '@/lib/constants';

interface TokenPayload {
  transactionId: string;
  merchantId: string;
  amount: number;
  expiresInHours?: number;
}

/**
 * Generate a secure cryptographic token for payment links
 * @returns Plain token (only returned once, never stored)
 */
export async function generatePaymentToken(payload: TokenPayload): Promise<string> {
  // Generate cryptographically secure random token
  const token = crypto
    .randomBytes(PAYMENT_TOKEN_CONFIG.TOKEN_LENGTH)
    .toString('base64url'); // URL-safe base64
  
  // Hash token for database storage (SHA-256)
  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Calculate expiration
  const expiresInHours = payload.expiresInHours || PAYMENT_TOKEN_CONFIG.DEFAULT_EXPIRY_HOURS;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  
  // Store hashed token in database
  await db.insert(paymentTokens).values({
    tokenHash,
    transactionId: payload.transactionId,
    merchantId: payload.merchantId,
    amount: payload.amount.toString(),
    expiresAt,
    isRevoked: false,
    accessCount: 0,
  });
  
  // Return plain token (only time it's available)
  return token;
}

/**
 * Verify and validate a payment token
 * @param token Plain token from URL
 * @param ipAddress Optional IP address for tracking
 * @param userAgent Optional user agent for tracking
 * @returns Transaction details if valid
 */
export async function verifyPaymentToken(
  token: string,
  ipAddress?: string,
  userAgent?: string
) {
  // Hash the provided token
  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Find token record
  const tokenRecords = await db
    .select()
    .from(paymentTokens)
    .where(eq(paymentTokens.tokenHash, tokenHash))
    .limit(1);
  
  const tokenRecord = tokenRecords[0];
  
  if (!tokenRecord) {
    throw new Error('Invalid payment link');
  }
  
  // Validation checks
  if (tokenRecord.isRevoked) {
    throw new Error('This payment link has been revoked');
  }
  
  if (tokenRecord.usedAt) {
    throw new Error('This payment link has already been used');
  }
  
  if (new Date() > tokenRecord.expiresAt) {
    throw new Error('This payment link has expired');
  }
  
  // Rate limiting check
  const currentAccessCount = tokenRecord.accessCount ?? 0;
  if (currentAccessCount >= PAYMENT_TOKEN_CONFIG.MAX_ACCESS_ATTEMPTS) {
    throw new Error('Too many access attempts. Please request a new payment link.');
  }
  
  // Update access tracking
  await db
    .update(paymentTokens)
    .set({
      accessCount: currentAccessCount + 1,
      lastAccessedAt: new Date(),
      ipAddress: ipAddress || tokenRecord.ipAddress,
      userAgent: userAgent || tokenRecord.userAgent,
    })
    .where(eq(paymentTokens.tokenHash, tokenHash));
  
  // Return transaction details
  return {
    transactionId: tokenRecord.transactionId,
    merchantId: tokenRecord.merchantId,
    amount: tokenRecord.amount,
  };
}

/**
 * Mark token as used (for single-use tokens)
 */
export async function markTokenAsUsed(token: string) {
  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  await db
    .update(paymentTokens)
    .set({ usedAt: new Date() })
    .where(eq(paymentTokens.tokenHash, tokenHash));
}

/**
 * Revoke a payment token (merchant can cancel payment link)
 */
export async function revokePaymentToken(transactionId: string) {
  await db
    .update(paymentTokens)
    .set({ isRevoked: true })
    .where(eq(paymentTokens.transactionId, transactionId));
}

/**
 * Check if token is still valid (without incrementing access count)
 */
export async function isTokenValid(token: string): Promise<boolean> {
  try {
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const tokenRecords = await db
      .select()
      .from(paymentTokens)
      .where(eq(paymentTokens.tokenHash, tokenHash))
      .limit(1);
    
    const tokenRecord = tokenRecords[0];
    
    if (!tokenRecord) return false;
    if (tokenRecord.isRevoked) return false;
    if (tokenRecord.usedAt) return false;
    if (new Date() > tokenRecord.expiresAt) return false;
    
    return true;
  } catch {
    return false;
  }
}
