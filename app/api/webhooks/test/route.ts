import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { webhookConfigurations } from "@/lib/db/schema/team";
import { eq, and } from "drizzle-orm";
import { testWebhookEndpoint } from "@/lib/webhooks/dispatcher";

/**
 * POST - Test webhook endpoint
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

    // Test the webhook endpoint
    const result = await testWebhookEndpoint(webhook.url, webhook.secret);

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
