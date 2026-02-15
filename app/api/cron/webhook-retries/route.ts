import { NextRequest, NextResponse } from "next/server";
import { processWebhookRetries } from "@/lib/webhooks/dispatcher";

/**
 * GET /api/cron/webhook-retries
 *
 * Processes pending webhook retries from the database.
 * Call this endpoint periodically (e.g. via Vercel Cron, external cron, or setInterval).
 *
 * Protected by a shared CRON_SECRET to prevent unauthorized access.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (skip in development)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const successCount = await processWebhookRetries();

    return NextResponse.json({
      success: true,
      retriesProcessed: successCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron webhook-retries error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
