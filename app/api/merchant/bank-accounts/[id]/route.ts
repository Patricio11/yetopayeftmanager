import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftBankAccounts, eftBanks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateBankAccountSchema = z.object({
  eftBanksId: z.string().uuid().optional(),
  accountNumber: z.string().min(1).optional(),
  accountHolderName: z.string().min(1).optional(),
  accountName: z.string().optional(),
  accountType: z.enum(["savings", "cheque", "transmission", "bond", "investment"]).optional(),
  isPrimary: z.boolean().optional(),
});

/**
 * PATCH /api/merchant/bank-accounts/[id]
 * Update a bank account
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const { id } = await params;
    const body = await request.json();
    const validated = updateBankAccountSchema.parse(body);

    // Verify account belongs to merchant
    const [existing] = await db
      .select()
      .from(eftBankAccounts)
      .where(and(eq(eftBankAccounts.id, id), eq(eftBankAccounts.merchantId, merchantId)));

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Bank account not found" },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = { updatedAt: new Date() };

    // If changing bank, look up new bank for branchCode/bankCode
    if (validated.eftBanksId) {
      const [bank] = await db
        .select()
        .from(eftBanks)
        .where(eq(eftBanks.id, validated.eftBanksId));

      if (!bank) {
        return NextResponse.json(
          { success: false, message: "Selected bank not found" },
          { status: 400 }
        );
      }
      updates.eftBanksId = validated.eftBanksId;
      updates.branchCode = bank.branchCode;
      updates.bankCode = bank.code;
    }

    if (validated.accountNumber !== undefined) updates.accountNumber = validated.accountNumber;
    if (validated.accountHolderName !== undefined) updates.accountHolderName = validated.accountHolderName;
    if (validated.accountName !== undefined) updates.accountName = validated.accountName;
    if (validated.accountType !== undefined) updates.accountType = validated.accountType;

    // Handle primary flag
    if (validated.isPrimary === true) {
      await db
        .update(eftBankAccounts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(eftBankAccounts.merchantId, merchantId));
      updates.isPrimary = true;
    }

    const [updated] = await db
      .update(eftBankAccounts)
      .set(updates)
      .where(eq(eftBankAccounts.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Bank account updated successfully",
      data: { account: updated },
    });
  } catch (error: any) {
    console.error("Error updating bank account:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update bank account" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/merchant/bank-accounts/[id]
 * Delete a bank account
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const { id } = await params;

    // Verify account belongs to merchant
    const [existing] = await db
      .select()
      .from(eftBankAccounts)
      .where(and(eq(eftBankAccounts.id, id), eq(eftBankAccounts.merchantId, merchantId)));

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Bank account not found" },
        { status: 404 }
      );
    }

    // Check if this is the primary and there are other accounts
    if (existing.isPrimary) {
      const otherAccounts = await db
        .select({ id: eftBankAccounts.id })
        .from(eftBankAccounts)
        .where(and(
          eq(eftBankAccounts.merchantId, merchantId),
        ));

      if (otherAccounts.length > 1) {
        return NextResponse.json(
          { success: false, message: "Cannot delete primary account. Set another account as primary first." },
          { status: 400 }
        );
      }
    }

    await db
      .delete(eftBankAccounts)
      .where(eq(eftBankAccounts.id, id));

    return NextResponse.json({
      success: true,
      message: "Bank account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bank account:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete bank account" },
      { status: 500 }
    );
  }
}
