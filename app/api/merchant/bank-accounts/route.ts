import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftBankAccounts, eftBanks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createBankAccountSchema = z.object({
  eftBanksId: z.string().uuid("Invalid bank ID"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  accountName: z.string().optional(),
  accountType: z.enum(["savings", "cheque", "transmission", "bond", "investment"]).default("cheque"),
  isPrimary: z.boolean().default(false),
});

/**
 * GET /api/merchant/bank-accounts
 * List merchant's bank accounts with joined bank info
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const accounts = await db
      .select({
        id: eftBankAccounts.id,
        accountNumber: eftBankAccounts.accountNumber,
        accountHolderName: eftBankAccounts.accountHolderName,
        accountName: eftBankAccounts.accountName,
        accountType: eftBankAccounts.accountType,
        branchCode: eftBankAccounts.branchCode,
        branchName: eftBankAccounts.branchName,
        bankCode: eftBankAccounts.bankCode,
        isPrimary: eftBankAccounts.isPrimary,
        isVerified: eftBankAccounts.isVerified,
        createdAt: eftBankAccounts.createdAt,
        updatedAt: eftBankAccounts.updatedAt,
        eftBanksId: eftBankAccounts.eftBanksId,
        bankName: eftBanks.bankName,
        bankColor: eftBanks.color,
      })
      .from(eftBankAccounts)
      .leftJoin(eftBanks, eq(eftBankAccounts.eftBanksId, eftBanks.id))
      .where(eq(eftBankAccounts.merchantId, auth.session.user.id))
      .orderBy(desc(eftBankAccounts.createdAt));

    return NextResponse.json({ success: true, data: { accounts } });
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch bank accounts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/merchant/bank-accounts
 * Create a new bank account
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const body = await request.json();
    const validated = createBankAccountSchema.parse(body);

    // Look up the selected bank to get branchCode and bankCode
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

    // Check if this is the merchant's first account
    const existing = await db
      .select({ id: eftBankAccounts.id })
      .from(eftBankAccounts)
      .where(eq(eftBankAccounts.merchantId, merchantId));

    const isFirstAccount = existing.length === 0;
    const shouldBePrimary = isFirstAccount || validated.isPrimary;

    // If setting as primary, unset other primary accounts
    if (shouldBePrimary && !isFirstAccount) {
      await db
        .update(eftBankAccounts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(eftBankAccounts.merchantId, merchantId));
    }

    // Create the account
    const [newAccount] = await db
      .insert(eftBankAccounts)
      .values({
        merchantId,
        eftBanksId: validated.eftBanksId,
        accountNumber: validated.accountNumber,
        accountHolderName: validated.accountHolderName,
        accountName: validated.accountName,
        accountType: validated.accountType,
        branchCode: bank.branchCode,
        bankCode: bank.code,
        isPrimary: shouldBePrimary,
        isVerified: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Bank account created successfully",
      data: {
        account: {
          ...newAccount,
          bankName: bank.bankName,
          bankColor: bank.color,
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bank account:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to create bank account" },
      { status: 500 }
    );
  }
}
