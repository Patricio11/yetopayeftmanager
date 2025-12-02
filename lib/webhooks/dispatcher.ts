/**
 * Webhook Event Dispatcher
 * Handles sending webhook events to merchant endpoints with retry logic
 */

import { db } from "@/lib/db";
import { webhookConfigurations, webhookDeliveries } from "@/lib/db/schema/team";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// Event types
export type WebhookEventType =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.pending'
  | 'transaction.created'
  | 'transaction.updated';

// Event payload interface
export interface WebhookEventPayload {
  id: string;
  type: WebhookEventType;
  data: any;
  timestamp: string;
  merchantId: string;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Send webhook to a specific endpoint
 */
async function sendWebhook(
  url: string,
  payload: WebhookEventPayload,
  secret: string,
  webhookConfigId: string,
  attemptNumber: number = 1
): Promise<{
  success: boolean;
  statusCode?: number;
  response?: any;
  errorMessage?: string;
}> {
  try {
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString, secret);
    const timestamp = Date.now().toString();

    // Send webhook request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-ID': payload.id,
        'X-Webhook-Event': payload.type,
        'User-Agent': 'YetoPayEFT-Webhooks/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Log delivery
    await db.insert(webhookDeliveries).values({
      webhookConfigId,
      transactionId: payload.data.id,
      event: payload.type,
      payload: payload as any,
      response: responseData,
      statusCode: response.status,
      success: response.ok,
      errorMessage: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
      attemptNumber,
      deliveredAt: response.ok ? new Date() : null,
    });

    return {
      success: response.ok,
      statusCode: response.status,
      response: responseData,
      errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';

    // Log failed delivery
    await db.insert(webhookDeliveries).values({
      webhookConfigId,
      transactionId: payload.data.id,
      event: payload.type,
      payload: payload as any,
      response: null,
      statusCode: null,
      success: false,
      errorMessage,
      attemptNumber,
      deliveredAt: null,
    });

    return {
      success: false,
      errorMessage,
    };
  }
}

/**
 * Calculate next retry time with exponential backoff
 */
function calculateNextRetry(attemptNumber: number, backoffMultiplier: number): Date {
  const baseDelay = 60000; // 1 minute
  const delay = baseDelay * Math.pow(backoffMultiplier, attemptNumber - 1);
  return new Date(Date.now() + delay);
}

/**
 * Dispatch webhook event to all subscribed merchants
 */
export async function dispatchWebhookEvent(
  merchantId: string,
  eventType: WebhookEventType,
  eventData: any
): Promise<void> {
  try {
    // Fetch active webhook configurations for this merchant and event type
    const webhooks = await db
      .select()
      .from(webhookConfigurations)
      .where(
        and(
          eq(webhookConfigurations.merchantId, merchantId),
          eq(webhookConfigurations.isActive, true)
        )
      );

    // Filter webhooks that are subscribed to this event
    const subscribedWebhooks = webhooks.filter(webhook => 
      (webhook.events as string[]).includes(eventType)
    );

    if (subscribedWebhooks.length === 0) {
      console.log(`No webhooks subscribed to ${eventType} for merchant ${merchantId}`);
      return;
    }

    // Create event payload
    const payload: WebhookEventPayload = {
      id: crypto.randomUUID(),
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString(),
      merchantId,
    };

    // Send to all subscribed webhooks
    const deliveryPromises = subscribedWebhooks.map(async (webhook) => {
      const result = await sendWebhook(
        webhook.url,
        payload,
        webhook.secret,
        webhook.id,
        1
      );

      // Schedule retry if failed
      if (!result.success) {
        const retryPolicy = webhook.retryPolicy as { maxRetries: number; backoffMultiplier: number };
        if (retryPolicy.maxRetries > 0) {
          const nextRetryAt = calculateNextRetry(1, retryPolicy.backoffMultiplier);
          console.log(`Webhook delivery failed, scheduling retry at ${nextRetryAt}`);
          // Note: In production, you'd use a job queue (Bull, BullMQ, etc.) for retries
          // For now, we just log it
        }
      }
    });

    await Promise.allSettled(deliveryPromises);
  } catch (error) {
    console.error('Error dispatching webhook event:', error);
  }
}

/**
 * Retry failed webhook delivery
 */
export async function retryWebhookDelivery(
  deliveryId: string
): Promise<boolean> {
  try {
    // Fetch delivery record
    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, deliveryId));

    if (!delivery || delivery.success) {
      return false;
    }

    // Fetch webhook configuration
    const [webhook] = await db
      .select()
      .from(webhookConfigurations)
      .where(eq(webhookConfigurations.id, delivery.webhookConfigId!));

    if (!webhook || !webhook.isActive) {
      return false;
    }

    const retryPolicy = webhook.retryPolicy as { maxRetries: number; backoffMultiplier: number };
    const currentAttempt = (delivery.attemptNumber as number) || 1;

    if (currentAttempt >= retryPolicy.maxRetries) {
      console.log(`Max retries reached for delivery ${deliveryId}`);
      return false;
    }

    // Retry delivery
    const result = await sendWebhook(
      webhook.url,
      delivery.payload as any,
      webhook.secret,
      webhook.id,
      currentAttempt + 1
    );

    return result.success;
  } catch (error) {
    console.error('Error retrying webhook delivery:', error);
    return false;
  }
}

/**
 * Test webhook endpoint
 */
export async function testWebhookEndpoint(
  url: string,
  secret: string
): Promise<{
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  errorMessage?: string;
}> {
  const startTime = Date.now();

  try {
    const testPayload: WebhookEventPayload = {
      id: crypto.randomUUID(),
      type: 'payment.completed',
      data: {
        id: 'test-transaction-id',
        reference: 'TEST-WEBHOOK',
        amount: 100,
        status: 'completed',
        test: true,
      },
      timestamp: new Date().toISOString(),
      merchantId: 'test-merchant-id',
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = generateSignature(payloadString, secret);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': Date.now().toString(),
        'X-Webhook-ID': testPayload.id,
        'X-Webhook-Event': testPayload.type,
        'User-Agent': 'YetoPayEFT-Webhooks/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout for test
    });

    const responseTime = Date.now() - startTime;

    return {
      success: response.ok,
      statusCode: response.status,
      responseTime,
      errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      errorMessage: error.message || 'Unknown error',
    };
  }
}
