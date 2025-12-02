import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { webhookConfigurations } from "@/lib/db/schema/team";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

/**
 * GET - List all webhook configurations for the merchant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const merchantId = session.user.id;

    // Fetch webhook configurations
    const webhooks = await db
      .select()
      .from(webhookConfigurations)
      .where(eq(webhookConfigurations.merchantId, merchantId));

    // Hide secret in response (only show first 8 chars)
    const sanitizedWebhooks = webhooks.map(webhook => ({
      ...webhook,
      secret: webhook.secret.substring(0, 8) + '...',
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const merchantId = session.user.id;
    const body = await request.json();

    // Validate input
    const { url, events, isActive = true } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, message: "Valid URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return NextResponse.json(
        { success: false, message: "Invalid URL format" },
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

    const invalidEvents = events.filter(e => !validEvents.includes(e));
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

    // Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex');

    // Create webhook configuration
    const [webhook] = await db
      .insert(webhookConfigurations)
      .values({
        merchantId,
        url,
        events,
        secret,
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
          secret, // Return full secret only on creation
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const merchantId = session.user.id;
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
      try {
        new URL(url);
        updates.url = url;
      } catch (e) {
        return NextResponse.json(
          { success: false, message: "Invalid URL format" },
          { status: 400 }
        );
      }
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

      const invalidEvents = events.filter(e => !validEvents.includes(e));
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
          secret: updatedWebhook.secret.substring(0, 8) + '...',
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const merchantId = session.user.id;
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
