import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { webhookConfigurations } from "@/lib/db/schema/team";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { encryptString } from "@/lib/security/credential-encryption";

/**
 * POST - Regenerate webhook secret
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMerchant(request, 'webhooks.write');
    if (!auth.success) return auth.response;

    const merchantId = auth.merchantId;
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

    // Generate new secret and encrypt for storage
    const plainSecret = crypto.randomBytes(32).toString('hex');
    const encryptedSecret = encryptString(plainSecret);

    // Update webhook with encrypted secret
    const [updatedWebhook] = await db
      .update(webhookConfigurations)
      .set({
        secret: encryptedSecret,
        updatedAt: new Date(),
      })
      .where(eq(webhookConfigurations.id, webhookId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Webhook secret regenerated successfully",
      data: {
        webhookId: updatedWebhook.id,
        secret: plainSecret, // Return full plain secret only on regeneration
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
