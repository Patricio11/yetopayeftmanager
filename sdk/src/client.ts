/**
 * YETOPAYEFT SDK Client
 * Main client for interacting with the YETOPAYEFT API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
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
    // Validate API key
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    // Set defaults
    this.config = {
      apiKey: config.apiKey,
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
        'X-API-Key': this.config.apiKey,
      },
    });

    // Add request interceptor for debugging
    if (this.config.debug) {
      this.client.interceptors.request.use((config: any) => {
        console.log('[YetoPayEFT SDK] Request:', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      });
    }

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
      '/payment-tokens',
      {
        amount: request.amount,
        reference: request.reference,
        customerEmail: request.customerEmail,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        metadata: request.metadata,
        successUrl: request.successUrl,
        cancelUrl: request.cancelUrl,
        webhookUrl: request.webhookUrl,
        expiryMinutes: request.expiryMinutes || 60,
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
  async getPaymentToken(tokenId: string): Promise<PaymentToken> {
    const response = await this.client.get<ApiResponse<PaymentToken>>(
      `/payment-tokens/${tokenId}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to get payment token');
    }

    return response.data.data;
  }

  /**
   * Revoke a payment token
   * @param tokenId Token ID to revoke
   * @returns Success status
   */
  async revokePaymentToken(tokenId: string): Promise<boolean> {
    const response = await this.client.delete<ApiResponse>(
      `/payment-tokens/${tokenId}`
    );

    return response.data.success;
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
    const response = await this.client.get<ApiResponse<Transaction>>(
      `/transactions/${transactionId}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to get transaction');
    }

    return response.data.data;
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

    if (request.page) params.append('page', request.page.toString());
    if (request.limit) params.append('limit', request.limit.toString());
    if (request.status) params.append('status', request.status);
    if (request.startDate) params.append('startDate', request.startDate);
    if (request.endDate) params.append('endDate', request.endDate);
    if (request.search) params.append('search', request.search);

    const response = await this.client.get<ApiResponse<ListTransactionsResponse>>(
      `/transactions?${params.toString()}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to list transactions');
    }

    return response.data.data;
  }

  // ============================================================================
  // Bank Methods
  // ============================================================================

  /**
   * Get list of available banks
   * @returns Array of banks
   */
  async getBanks(): Promise<Bank[]> {
    const response = await this.client.get<ApiResponse<Bank[]>>('/banks');

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to get banks');
    }

    return response.data.data;
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
    // Import crypto for Node.js
    const crypto = require('crypto');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
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
      const response = await this.client.get<ApiResponse>('/health');
      return response.data.success;
    } catch (error) {
      return false;
    }
  }
}
