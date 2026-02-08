/**
 * YETOPAYEFT SDK Client
 * Main client for interacting with the YETOPAYEFT API
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import {
  YetoPayEFTConfig,
  CreatePaymentTokenRequest,
  PaymentToken,
  Transaction,
  ListTransactionsRequest,
  ListTransactionsResponse,
  Bank,
  ApiResponse,
  YetoPayEFTError,
} from './types';

export class YetoPayEFTClient {
  private client: AxiosInstance;
  private config: Required<YetoPayEFTConfig>;

  constructor(config: YetoPayEFTConfig) {
    // Validate required fields
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    if (!config.apiSecret) {
      throw new Error('API secret is required');
    }
    if (!config.merchantId) {
      throw new Error('Merchant ID is required');
    }

    // Set defaults
    this.config = {
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      merchantId: config.merchantId,
      baseUrl: config.baseUrl || 'https://yetopayeft.com',
      timeout: config.timeout || 30000,
      debug: config.debug || false,
    };

    // Create axios instance
    this.client = axios.create({
      baseURL: `${this.config.baseUrl}/api`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for HMAC signing
    this.client.interceptors.request.use((reqConfig: InternalAxiosRequestConfig) => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = reqConfig.data ? JSON.stringify(reqConfig.data) : '';

      // HMAC signature: SHA256(secretHash, merchantId + timestamp + body)
      const secretHash = crypto.createHash('sha256').update(this.config.apiSecret).digest('hex');
      const payload = `${this.config.merchantId}${timestamp}${body}`;
      const signature = `sha256=${crypto.createHmac('sha256', secretHash).update(payload).digest('hex')}`;

      reqConfig.headers.set('Authorization', `Bearer ${this.config.apiKey}`);
      reqConfig.headers.set('X-Merchant-ID', this.config.merchantId);
      reqConfig.headers.set('X-Timestamp', timestamp);
      reqConfig.headers.set('X-Signature', signature);

      if (this.config.debug) {
        console.log('[YetoPayEFT SDK] Request:', {
          method: reqConfig.method,
          url: reqConfig.url,
          data: reqConfig.data,
        });
      }
      return reqConfig;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => {
        if (this.config.debug) {
          console.log('[YetoPayEFT SDK] Response:', response.data);
        }
        return response;
      },
      (error: AxiosError<ApiResponse>) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError<ApiResponse>): YetoPayEFTError {
    if (error.response) {
      const { data, status } = error.response;
      const message = data?.error?.message || data?.message || 'API request failed';
      const code = data?.error?.code || 'API_ERROR';
      const details = data?.error?.details;

      return new (YetoPayEFTError as any)(message, code, status, details);
    } else if (error.request) {
      return new (YetoPayEFTError as any)(
        'No response from server',
        'NETWORK_ERROR',
        undefined,
        error.message
      );
    } else {
      return new (YetoPayEFTError as any)(
        error.message,
        'REQUEST_ERROR',
        undefined,
        error
      );
    }
  }

  // ============================================================================
  // Payment Token Methods
  // ============================================================================

  /**
   * Create a new payment token
   * @param request Payment token creation request
   * @returns Payment token with payment URL
   */
  async createPaymentToken(
    request: CreatePaymentTokenRequest
  ): Promise<PaymentToken> {
    // Validate amount
    if (!request.amount || request.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate reference
    if (!request.reference || request.reference.trim().length === 0) {
      throw new Error('Reference is required');
    }

    const response = await this.client.post<ApiResponse<PaymentToken>>(
      '/payment-links',
      {
        amount: request.amount,
        reference: request.reference,
        customerEmail: request.customerEmail,
        customerName: request.customerName,
        metadata: request.metadata,
        successUrl: request.successUrl,
        failureUrl: request.cancelUrl,
        notifyUrl: request.webhookUrl,
        expiresInHours: request.expiryMinutes ? Math.ceil(request.expiryMinutes / 60) : 24,
      }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to create payment token');
    }

    return response.data.data;
  }

  /**
   * Get payment token by ID
   * @param tokenId Token ID
   * @returns Payment token details
   */
  /**
   * Get payment link status by checking the transaction
   * @param transactionId Transaction ID returned from createPaymentToken
   * @returns Transaction details including current status
   */
  async getPaymentStatus(transactionId: string): Promise<Transaction> {
    return this.getTransaction(transactionId);
  }

  // ============================================================================
  // Transaction Methods
  // ============================================================================

  /**
   * Get transaction by ID
   * @param transactionId Transaction ID
   * @returns Transaction details
   */
  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await this.client.get<ApiResponse>(
      `/payment-links?status=all`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to get transactions');
    }

    // Find the specific transaction
    const txn = response.data.data.find((t: any) => t.id === transactionId);
    if (!txn) {
      throw new Error('Transaction not found');
    }
    return txn;
  }

  /**
   * List transactions with filters
   * @param request List transactions request with filters
   * @returns Paginated list of transactions
   */
  async listTransactions(
    request: ListTransactionsRequest = {}
  ): Promise<ListTransactionsResponse> {
    const params = new URLSearchParams();

    if (request.limit) params.append('limit', request.limit.toString());
    if (request.page && request.limit) params.append('offset', ((request.page - 1) * request.limit).toString());
    if (request.status) params.append('status', request.status);
    if (request.startDate) params.append('from', request.startDate);

    const response = await this.client.get<ApiResponse>(
      `/payment-links?${params.toString()}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to list transactions');
    }

    return {
      transactions: response.data.data,
      pagination: response.data.pagination || { page: 1, limit: 50, total: response.data.data.length, totalPages: 1 },
    };
  }

  // ============================================================================
  // Bank Methods
  // ============================================================================

  /**
   * Get list of available banks
   * @returns Array of banks
   */
  async getBanks(): Promise<Bank[]> {
    // Banks are returned during payment initialization, not via a separate endpoint
    // This method is kept for API compatibility but may not have a dedicated route
    try {
      const response = await this.client.get<ApiResponse<Bank[]>>('/admin/banks');
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.message || 'Failed to get banks');
      }
      return response.data.data;
    } catch {
      throw new Error('Banks endpoint not available. Banks are provided during payment flow initialization.');
    }
  }

  // ============================================================================
  // Webhook Methods
  // ============================================================================

  /**
   * Verify webhook signature
   * @param payload Webhook payload as string
   * @param signature Webhook signature from header
   * @param secret Your webhook secret
   * @returns True if signature is valid
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate payment URL from token
   * @param token Payment token string
   * @returns Full payment URL
   */
  getPaymentUrl(token: string): string {
    return `${this.config.baseUrl}/pay/${token}`;
  }

  /**
   * Test API connection
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get<ApiResponse>('/payment-links?limit=1');
      return response.data.success;
    } catch (error) {
      return false;
    }
  }
}
