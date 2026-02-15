import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { webhookConfigurations } from "@/lib/db/schema/team";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

/**
 * POST - Regenerate webhook secret
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const body = await request.json();
    const { webhookId } = body;

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

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');

    // Update webhook with new secret
    const [updatedWebhook] = await db
      .update(webhookConfigurations)
      .set({
        secret: newSecret,
        updatedAt: new Date(),
      })
      .where(eq(webhookConfigurations.id, webhookId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Webhook secret regenerated successfully",
      data: {
        webhookId: updatedWebhook.id,
        secret: newSecret, // Return full secret
      },
    });
  } catch (error) {
    console.error("Error regenerating webhook secret:", error);
    return NextResponse.json(
      { success: false, message: "Failed to regenerate secret" },
      { status: 500 }
    );
  }
}
