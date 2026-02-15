import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { webhookConfigurations, webhookDeliveries } from "@/lib/db/schema/team";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET - List webhook deliveries for a specific webhook
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!webhookId) {
      return NextResponse.json(
        { success: false, message: "Webhook ID is required" },
        { status: 400 }
      );
    }

    // Verify webhook belongs to merchant
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

    // Fetch deliveries
    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookConfigId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: webhookDeliveries.id })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookConfigId, webhookId));

    const total = totalResult.length;

    // Calculate stats
    const successCount = deliveries.filter(d => d.success).length;
    const failedCount = deliveries.filter(d => !d.success).length;

    return NextResponse.json({
      success: true,
      data: {
        deliveries,
        pagination: {
          limit,
          offset,
          total,
        },
        stats: {
          total: deliveries.length,
          successful: successCount,
          failed: failedCount,
          successRate: deliveries.length > 0 
            ? ((successCount / deliveries.length) * 100).toFixed(2) + '%'
            : '0%',
        },
      },
    });
  } catch (error) {
    console.error("Error fetching webhook deliveries:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch deliveries" },
      { status: 500 }
    );
  }
}
