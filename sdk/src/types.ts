/**
 * YETOPAYEFT SDK Types
 * Official TypeScript type definitions
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface YetoPayEFTConfig {
  /** Your API key from the dashboard */
  apiKey: string;
  /** API base URL (defaults to production) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

// ============================================================================
// Payment Token Types
// ============================================================================

export interface CreatePaymentTokenRequest {
  /** Amount in ZAR (e.g., 100.50) */
  amount: number;
  /** Customer reference/description */
  reference: string;
  /** Customer email address */
  customerEmail?: string;
  /** Customer name */
  customerName?: string;
  /** Customer phone number */
  customerPhone?: string;
  /** Metadata object for additional data */
  metadata?: Record<string, any>;
  /** Success redirect URL */
  successUrl?: string;
  /** Cancel redirect URL */
  cancelUrl?: string;
  /** Webhook URL for payment notifications */
  webhookUrl?: string;
  /** Token expiry in minutes (default: 60) */
  expiryMinutes?: number;
}

export interface PaymentToken {
  /** Unique token ID */
  id: string;
  /** Payment token string */
  token: string;
  /** Payment URL for customer */
  paymentUrl: string;
  /** Amount in ZAR */
  amount: number;
  /** Customer reference */
  reference: string;
  /** Token status */
  status: 'active' | 'used' | 'expired' | 'revoked';
  /** Token expiry date */
  expiresAt: string;
  /** Creation date */
  createdAt: string;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface Transaction {
  /** Unique transaction ID */
  id: string;
  /** Transaction reference */
  reference: string;
  /** Amount in ZAR */
  amount: number;
  /** Transaction status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  /** Customer email */
  customerEmail?: string;
  /** Customer name */
  customerName?: string;
  /** Bank details */
  bankName?: string;
  bankAccountNumber?: string;
  /** Payment proof URL */
  proofOfPaymentUrl?: string;
  /** Metadata */
  metadata?: Record<string, any>;
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ListTransactionsRequest {
  /** Page number (default: 1) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  limit?: number;
  /** Filter by status */
  status?: Transaction['status'];
  /** Filter by date range (ISO 8601) */
  startDate?: string;
  endDate?: string;
  /** Search by reference or customer email */
  search?: string;
}

export interface ListTransactionsResponse {
  /** Array of transactions */
  transactions: Transaction[];
  /** Pagination info */
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: 'payment.completed' | 'payment.failed' | 'payment.cancelled';
  /** Transaction data */
  data: Transaction;
  /** Event timestamp */
  timestamp: string;
}

export interface WebhookSignature {
  /** Webhook signature for verification */
  signature: string;
  /** Timestamp of the webhook */
  timestamp: string;
}

// ============================================================================
// Bank Types
// ============================================================================

export interface Bank {
  /** Bank ID */
  id: string;
  /** Bank name */
  name: string;
  /** Bank code */
  code: string;
  /** Bank logo URL */
  logoUrl?: string;
  /** Is bank active */
  isActive: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  /** Success status */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message */
  message?: string;
  /** Error details */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class YetoPayEFTError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'YetoPayEFTError';
    Object.setPrototypeOf(this, YetoPayEFTError.prototype);
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type PaymentStatus = Transaction['status'];
export type WebhookEventType = WebhookEvent['type'];
