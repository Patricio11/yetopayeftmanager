import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftBanks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { handleBankReenabled } from "@/lib/monitoring/bank-health";

const updateBankSchema = z.object({
  bankName: z.string().min(1, "Bank name is required").optional(),
  code: z.string().min(1, "Bank code is required").regex(/^[a-z0-9_-]+$/, "Code must be lowercase alphanumeric with hyphens/underscores").optional(),
  color: z.string().optional(),
  branchCode: z.string().optional(),
  currency: z.string().trim().length(3).transform((v) => v.toUpperCase()).optional(),
  enabled: z.boolean().optional(),
  eftServiceUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

/**
 * GET /api/admin/banks/[id]
 * Get a single bank (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    // Fetch bank
    const bank = await db.query.eftBanks.findFirst({
      where: eq(eftBanks.id, id),
    });

    if (!bank) {
      return NextResponse.json(
        { success: false, message: "Bank not found" },
        { status: 404 }
      );
    }

    // Get transaction stats
    const transactions = await db.query.eftTransactions.findMany({
      where: (t, { eq }) => eq(t.eftBankId, id),
    });

    return NextResponse.json({
      success: true,
      bank: {
        ...bank,
        transactionCount: transactions.length,
        completedCount: transactions.filter(t => t.status === "completed").length,
        failedCount: transactions.filter(t => t.status === "failed").length,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching bank:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch bank" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/banks/[id]
 * Update a bank (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    // Check if bank exists
    const existingBank = await db.query.eftBanks.findFirst({
      where: eq(eftBanks.id, id),
    });

    if (!existingBank) {
      return NextResponse.json(
        { success: false, message: "Bank not found" },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateBankSchema.parse(body);

    // If updating code, check if new code already exists
    if (validatedData.code && validatedData.code !== existingBank.code) {
      const codeExists = await db.query.eftBanks.findFirst({
        where: eq(eftBanks.code, validatedData.code),
      });

      if (codeExists) {
        return NextResponse.json(
          { success: false, message: "Bank code already exists" },
          { status: 400 }
        );
      }
    }

    // Update bank
    const [updatedBank] = await db
      .update(eftBanks)
      .set({
        ...validatedData,
        eftServiceUrl: validatedData.eftServiceUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(eftBanks.id, id))
      .returning();

    writeAuditLog({ userId: auth.session.user.id, action: "update", resource: "bank", resourceId: id, changes: { before: { bankName: existingBank.bankName, code: existingBank.code, enabled: existingBank.enabled, color: existingBank.color, branchCode: existingBank.branchCode, eftServiceUrl: existingBank.eftServiceUrl }, after: validatedData }, request });

    // If the bank was just re-enabled, clear the outage record and send recovery alerts
    if (validatedData.enabled === true && existingBank.enabled === false) {
      handleBankReenabled(id).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: "Bank updated successfully",
      bank: updatedBank,
    });
  } catch (error: any) {
    console.error("❌ Error updating bank:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request data",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update bank" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/banks/[id]
 * Delete a bank (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    // Check if bank exists
    const existingBank = await db.query.eftBanks.findFirst({
      where: eq(eftBanks.id, id),
    });

    if (!existingBank) {
      return NextResponse.json(
        { success: false, message: "Bank not found" },
        { status: 404 }
      );
    }

    // Check if bank has transactions
    const transactions = await db.query.eftTransactions.findMany({
      where: (t, { eq }) => eq(t.eftBankId, id),
    });

    if (transactions.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete bank with ${transactions.length} transaction(s). Disable it instead.`
        },
        { status: 400 }
      );
    }

    // Delete bank
    await db.delete(eftBanks).where(eq(eftBanks.id, id));

    writeAuditLog({ userId: auth.session.user.id, action: "delete", resource: "bank", resourceId: id, changes: { before: { bankName: existingBank.bankName, code: existingBank.code } }, request });

    return NextResponse.json({
      success: true,
      message: "Bank deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Error deleting bank:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete bank" },
      { status: 500 }
    );
  }
}
