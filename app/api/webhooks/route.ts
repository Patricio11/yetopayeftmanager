import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { webhookConfigurations } from "@/lib/db/schema/team";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { validateWebhookUrl } from "@/lib/security/url-validation";
import { encryptString } from "@/lib/security/credential-encryption";

/**
 * GET - List all webhook configurations for the merchant
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;

    // Fetch webhook configurations
    const webhooks = await db
      .select()
      .from(webhookConfigurations)
      .where(eq(webhookConfigurations.merchantId, merchantId));

    // Hide secret in response (show masked placeholder)
    const sanitizedWebhooks = webhooks.map(webhook => ({
      ...webhook,
      secret: 'whsec_••••••••••••••••',
    }));

    return NextResponse.json({
      success: true,
      data: {
        webhooks: sanitizedWebhooks,
        count: webhooks.length,
      },
    });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch webhooks" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new webhook configuration
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const body = await request.json();

    // Validate input
    const { url, events, isActive = true } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, message: "Valid URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format and block SSRF
    const urlValidation = await validateWebhookUrl(url);
    if (!urlValidation.valid) {
      return NextResponse.json(
        { success: false, message: urlValidation.reason },
        { status: 400 }
      );
    }

    // Validate events
    const validEvents = [
      'payment.completed',
      'payment.failed',
      'payment.cancelled',
      'payment.pending',
      'transaction.created',
      'transaction.updated',
    ];

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one event must be selected" },
        { status: 400 }
      );
    }

    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid events: ${invalidEvents.join(', ')}`,
          validEvents
        },
        { status: 400 }
      );
    }

    // Generate webhook secret and encrypt for storage
    const plainSecret = crypto.randomBytes(32).toString('hex');
    const encryptedSecret = encryptString(plainSecret);

    // Create webhook configuration
    const [webhook] = await db
      .insert(webhookConfigurations)
      .values({
        merchantId,
        url,
        events,
        secret: encryptedSecret,
        isActive,
        retryPolicy: {
          maxRetries: 3,
          backoffMultiplier: 2,
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Webhook created successfully",
      data: {
        webhook: {
          ...webhook,
          secret: plainSecret, // Return full plain secret only on creation
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create webhook" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update webhook configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const body = await request.json();

    const { webhookId, url, events, isActive } = body;

    if (!webhookId) {
      return NextResponse.json(
        { success: false, message: "Webhook ID is required" },
        { status: 400 }
      );
    }

    // Verify webhook belongs to merchant
    const [existingWebhook] = await db
      .select()
      .from(webhookConfigurations)
      .where(
        and(
          eq(webhookConfigurations.id, webhookId),
          eq(webhookConfigurations.merchantId, merchantId)
        )
      );

    if (!existingWebhook) {
      return NextResponse.json(
        { success: false, message: "Webhook not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date(),
    };

    if (url !== undefined) {
      const urlValidation = await validateWebhookUrl(url);
      if (!urlValidation.valid) {
        return NextResponse.json(
          { success: false, message: urlValidation.reason },
          { status: 400 }
        );
      }
      updates.url = url;
    }

    if (events !== undefined) {
      const validEvents = [
        'payment.completed',
        'payment.failed',
        'payment.cancelled',
        'payment.pending',
        'transaction.created',
        'transaction.updated',
      ];

      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json(
          { success: false, message: "At least one event must be selected" },
          { status: 400 }
        );
      }

      const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid events: ${invalidEvents.join(', ')}`,
            validEvents
          },
          { status: 400 }
        );
      }

      updates.events = events;
    }

    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    // Update webhook
    const [updatedWebhook] = await db
      .update(webhookConfigurations)
      .set(updates)
      .where(eq(webhookConfigurations.id, webhookId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Webhook updated successfully",
      data: {
        webhook: {
          ...updatedWebhook,
          secret: 'whsec_••••••••••••••••',
        },
      },
    });
  } catch (error) {
    console.error("Error updating webhook:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update webhook" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete webhook configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('id');

    if (!webhookId) {
      return NextResponse.json(
        { success: false, message: "Webhook ID is required" },
        { status: 400 }
      );
    }

    // Verify webhook belongs to merchant and delete
    const result = await db
      .delete(webhookConfigurations)
      .where(
        and(
          eq(webhookConfigurations.id, webhookId),
          eq(webhookConfigurations.merchantId, merchantId)
        )
      )
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: "Webhook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Webhook deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete webhook" },
      { status: 500 }
    );
  }
}
