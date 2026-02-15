/**
 * Webhook Event Dispatcher
 * Handles sending webhook events to merchant endpoints with DB-persisted retry logic.
 * Failed deliveries are stored with a nextRetryAt timestamp so retries survive restarts.
 */

import { db } from "@/lib/db";
import { webhookConfigurations, webhookDeliveries } from "@/lib/db/schema/team";
import { eq, and, lte } from "drizzle-orm";
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
 * Calculate next retry time with exponential backoff
 */
function calculateNextRetry(attemptNumber: number, backoffMultiplier: number): Date {
  const baseDelay = 60000; // 1 minute
  const delay = baseDelay * Math.pow(backoffMultiplier, attemptNumber - 1);
  return new Date(Date.now() + delay);
}

/**
 * Send webhook to a specific endpoint
 */
async function sendWebhook(
  url: string,
  payload: WebhookEventPayload,
  secret: string,
  webhookConfigId: string,
  attemptNumber: number = 1,
  maxRetries: number = 0,
  backoffMultiplier: number = 2
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
      nextRetryAt: response.ok ? null : (attemptNumber < maxRetries ? calculateNextRetry(attemptNumber, backoffMultiplier) : null),
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

    // Log failed delivery with nextRetryAt for DB-driven retries
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
      nextRetryAt: attemptNumber < maxRetries ? calculateNextRetry(attemptNumber, backoffMultiplier) : null,
      deliveredAt: null,
    });

    return {
      success: false,
      errorMessage,
    };
  }
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
    // Support wildcard subscription: '*' or 'payment.all' subscribes to all events
    const subscribedWebhooks = webhooks.filter(webhook => {
      const events = webhook.events as string[];
      return events.includes(eventType) ||
             events.includes('*') ||
             events.includes('payment.all');
    });

    if (subscribedWebhooks.length === 0) {
      console.log(`No webhooks subscribed to ${eventType} for merchant ${merchantId}`);
      return;
    }

    console.log(`📤 Dispatching ${eventType} to ${subscribedWebhooks.length} webhook(s) for merchant ${merchantId}`);

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
      const retryPolicy = webhook.retryPolicy as { maxRetries: number; backoffMultiplier: number };

      await sendWebhook(
        webhook.url,
        payload,
        webhook.secret,
        webhook.id,
        1,
        retryPolicy.maxRetries,
        retryPolicy.backoffMultiplier
      );
    });

    await Promise.allSettled(deliveryPromises);
  } catch (error) {
    console.error('Error dispatching webhook event:', error);
  }
}

/**
 * Process pending webhook retries from the database.
 * Call this periodically (e.g. every 30-60 seconds via cron or setInterval on startup).
 * Picks up any failed deliveries where nextRetryAt <= now and retries them.
 */
export async function processWebhookRetries(): Promise<number> {
  try {
    // Find failed deliveries that are due for retry
    const pendingRetries = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.success, false),
          lte(webhookDeliveries.nextRetryAt, new Date())
        )
      )
      .limit(50); // Process in batches

    if (pendingRetries.length === 0) return 0;

    console.log(`🔄 Processing ${pendingRetries.length} pending webhook retries`);

    let successCount = 0;

    for (const delivery of pendingRetries) {
      // Clear nextRetryAt so this delivery isn't picked up again while processing
      await db
        .update(webhookDeliveries)
        .set({ nextRetryAt: null })
        .where(eq(webhookDeliveries.id, delivery.id));

      // Fetch webhook configuration
      const [webhook] = await db
        .select()
        .from(webhookConfigurations)
        .where(eq(webhookConfigurations.id, delivery.webhookConfigId!));

      if (!webhook || !webhook.isActive) continue;

      const retryPolicy = webhook.retryPolicy as { maxRetries: number; backoffMultiplier: number };
      const nextAttempt = (delivery.attemptNumber ?? 1) + 1;

      const result = await sendWebhook(
        webhook.url,
        delivery.payload as WebhookEventPayload,
        webhook.secret,
        webhook.id,
        nextAttempt,
        retryPolicy.maxRetries,
        retryPolicy.backoffMultiplier
      );

      if (result.success) {
        successCount++;
        console.log(`✅ Webhook retry #${nextAttempt} succeeded for ${webhook.id}`);
      } else if (nextAttempt >= retryPolicy.maxRetries) {
        console.log(`⛔ Max retries (${retryPolicy.maxRetries}) reached for webhook ${webhook.id}`);
      }
    }

    return successCount;
  } catch (error) {
    console.error('Error processing webhook retries:', error);
    return 0;
  }
}

/**
 * Retry a specific failed webhook delivery (manual retry from dashboard)
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

    // Retry delivery
    const result = await sendWebhook(
      webhook.url,
      delivery.payload as any,
      webhook.secret,
      webhook.id,
      currentAttempt + 1,
      retryPolicy.maxRetries,
      retryPolicy.backoffMultiplier
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
