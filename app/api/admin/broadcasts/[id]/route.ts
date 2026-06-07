import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { emailBroadcasts, emailBroadcastRecipients, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  subject: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const broadcast = await db.query.emailBroadcasts.findFirst({
      where: eq(emailBroadcasts.id, id),
    });

    if (!broadcast) {
      return NextResponse.json(
        { success: false, error: "Broadcast not found" },
        { status: 404 }
      );
    }

    const recipients = await db
      .select({
        id: emailBroadcastRecipients.id,
        userId: emailBroadcastRecipients.userId,
        email: emailBroadcastRecipients.email,
        name: emailBroadcastRecipients.name,
        status: emailBroadcastRecipients.status,
        sentAt: emailBroadcastRecipients.sentAt,
        error: emailBroadcastRecipients.error,
      })
      .from(emailBroadcastRecipients)
      .where(eq(emailBroadcastRecipients.broadcastId, id));

    const creator = await db.query.users.findFirst({
      where: eq(users.id, broadcast.createdBy),
      columns: { name: true, email: true },
    });

    return NextResponse.json({
      success: true,
      data: { ...broadcast, createdByName: creator?.name, recipients },
    });
  } catch (error) {
    console.error("Error fetching broadcast:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch broadcast" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { subject, content } = updateSchema.parse(body);

    const [updated] = await db
      .update(emailBroadcasts)
      .set({ subject, content })
      .where(eq(emailBroadcasts.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Broadcast not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating broadcast:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update broadcast" },
      { status: 500 }
    );
  }
}
