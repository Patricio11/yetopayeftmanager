import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { webhookConfigurations } from "@/lib/db/schema/team";
import { eq, and } from "drizzle-orm";
import { testWebhookEndpoint } from "@/lib/webhooks/dispatcher";
import { decryptString } from "@/lib/security/credential-encryption";

/**
 * POST - Test webhook endpoint
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

    // Fetch webhook configuration
    const [webhook] = await db
      .select()
      .from(webhookConfigurations)
      .where(
        and(
          eq(webhookConfigurations.id, webhookId),
          eq(webhookConfigurations.merchantId, merchantId)
        )
      );

    if (!webhook) {
      return NextResponse.json(
        { success: false, message: "Webhook not found" },
        { status: 404 }
      );
    }

    // Decrypt secret and test the webhook endpoint
    const plainSecret = decryptString(webhook.secret);
    const result = await testWebhookEndpoint(webhook.url, plainSecret);

    return NextResponse.json({
      success: true,
      data: {
        test: result,
        message: result.success 
          ? 'Webhook endpoint is working correctly' 
          : 'Webhook endpoint test failed',
      },
    });
  } catch (error) {
    console.error("Error testing webhook:", error);
    return NextResponse.json(
      { success: false, message: "Failed to test webhook" },
      { status: 500 }
    );
  }
}
