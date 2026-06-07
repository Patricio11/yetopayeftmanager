import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { emailBroadcasts, emailBroadcastRecipients, users } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { sendBroadcastEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { recipientType, selectedUserIds } = body as {
      recipientType: "all" | "merchants" | "partners" | "custom";
      selectedUserIds?: string[];
    };

    const broadcast = await db.query.emailBroadcasts.findFirst({
      where: eq(emailBroadcasts.id, id),
    });

    if (!broadcast) {
      return NextResponse.json(
        { success: false, error: "Broadcast not found" },
        { status: 404 }
      );
    }

    // Determine recipients
    let recipientUsers;
    if (recipientType === "custom" && selectedUserIds?.length) {
      recipientUsers = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, selectedUserIds));
    } else {
      const roleFilter = recipientType === "merchants"
        ? eq(users.role, "merchant")
        : recipientType === "partners"
        ? eq(users.role, "partner")
        : inArray(users.role, ["merchant", "partner"]);

      recipientUsers = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(and(roleFilter, eq(users.emailVerified, true)));
    }

    if (!recipientUsers.length) {
      return NextResponse.json(
        { success: false, error: "No recipients found" },
        { status: 400 }
      );
    }

    const isResend = broadcast.status === "sent";

    // Update broadcast status
    await db
      .update(emailBroadcasts)
      .set({
        status: "sending",
        recipientType,
        totalRecipients: recipientUsers.length,
        sentCount: 0,
        failedCount: 0,
        ...(isResend ? { lastResentAt: new Date() } : { sentAt: new Date() }),
      })
      .where(eq(emailBroadcasts.id, id));

    // Clear old recipients if resending
    if (isResend) {
      await db
        .delete(emailBroadcastRecipients)
        .where(eq(emailBroadcastRecipients.broadcastId, id));
    }

    // Insert recipient records
    await db.insert(emailBroadcastRecipients).values(
      recipientUsers.map((u) => ({
        broadcastId: id,
        userId: u.id,
        email: u.email,
        name: u.name,
        status: "pending" as const,
      }))
    );

    // Send emails (fire-and-forget per recipient)
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipientUsers) {
      try {
        await sendBroadcastEmail(recipient.email, broadcast.subject, broadcast.content);
        sentCount++;
        await db
          .update(emailBroadcastRecipients)
          .set({ status: "sent", sentAt: new Date() })
          .where(
            and(
              eq(emailBroadcastRecipients.broadcastId, id),
              eq(emailBroadcastRecipients.userId, recipient.id)
            )
          );
      } catch (err: any) {
        failedCount++;
        await db
          .update(emailBroadcastRecipients)
          .set({ status: "failed", error: err.message?.slice(0, 500) || "Unknown error" })
          .where(
            and(
              eq(emailBroadcastRecipients.broadcastId, id),
              eq(emailBroadcastRecipients.userId, recipient.id)
            )
          );
      }
    }

    // Final status update
    await db
      .update(emailBroadcasts)
      .set({
        status: failedCount === recipientUsers.length ? "failed" : "sent",
        sentCount,
        failedCount,
      })
      .where(eq(emailBroadcasts.id, id));

    return NextResponse.json({
      success: true,
      data: { sentCount, failedCount, totalRecipients: recipientUsers.length },
    });
  } catch (error) {
    console.error("Error sending broadcast:", error);
    await db
      .update(emailBroadcasts)
      .set({ status: "failed" })
      .where(eq(emailBroadcasts.id, id));
    return NextResponse.json(
      { success: false, error: "Failed to send broadcast" },
      { status: 500 }
    );
  }
}
