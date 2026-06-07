import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { emailBroadcasts, users } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const broadcasts = await db
      .select({
        id: emailBroadcasts.id,
        subject: emailBroadcasts.subject,
        content: emailBroadcasts.content,
        recipientType: emailBroadcasts.recipientType,
        status: emailBroadcasts.status,
        totalRecipients: emailBroadcasts.totalRecipients,
        sentCount: emailBroadcasts.sentCount,
        failedCount: emailBroadcasts.failedCount,
        createdAt: emailBroadcasts.createdAt,
        sentAt: emailBroadcasts.sentAt,
        lastResentAt: emailBroadcasts.lastResentAt,
        createdByName: users.name,
      })
      .from(emailBroadcasts)
      .leftJoin(users, eq(emailBroadcasts.createdBy, users.id))
      .orderBy(desc(emailBroadcasts.createdAt));

    return NextResponse.json({ success: true, data: broadcasts });
  } catch (error) {
    console.error("Error fetching broadcasts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch broadcasts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { subject, content } = createSchema.parse(body);

    const [broadcast] = await db
      .insert(emailBroadcasts)
      .values({
        subject,
        content,
        recipientType: "all",
        status: "draft",
        createdBy: auth.session.user.id,
      })
      .returning();

    return NextResponse.json({ success: true, data: broadcast });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating broadcast:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create broadcast" },
      { status: 500 }
    );
  }
}
