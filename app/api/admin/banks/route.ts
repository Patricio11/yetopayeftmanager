import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftBanks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const createBankSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  code: z.string().min(1, "Bank code is required").regex(/^[a-z0-9_-]+$/, "Code must be lowercase alphanumeric with hyphens/underscores"),
  color: z.string().optional(),
  branchCode: z.string().optional(),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/admin/banks
 * Get all banks (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only admins can manage banks
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Fetch all banks
    const banks = await db
      .select()
      .from(eftBanks)
      .orderBy(desc(eftBanks.createdAt));

    // Get transaction counts for each bank
    const banksWithStats = await Promise.all(
      banks.map(async (bank) => {
        const transactionCount = await db.query.eftTransactions.findMany({
          where: (transactions, { eq }) => eq(transactions.eftBankId, bank.id),
        });

        return {
          ...bank,
          transactionCount: transactionCount.length,
          completedCount: transactionCount.filter(t => t.status === "completed").length,
        };
      })
    );

    return NextResponse.json({
      success: true,
      banks: banksWithStats,
    });
  } catch (error: any) {
    console.error("❌ Error fetching banks:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/banks
 * Create a new bank (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only admins can manage banks
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createBankSchema.parse(body);

    // Check if bank code already exists
    const existingBank = await db.query.eftBanks.findFirst({
      where: eq(eftBanks.code, validatedData.code),
    });

    if (existingBank) {
      return NextResponse.json(
        { success: false, message: "Bank code already exists" },
        { status: 400 }
      );
    }

    // Create bank
    const [newBank] = await db
      .insert(eftBanks)
      .values({
        bankName: validatedData.bankName,
        code: validatedData.code,
        color: validatedData.color,
        branchCode: validatedData.branchCode,
        enabled: validatedData.enabled,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`✅ Bank created: ${newBank.bankName} (${newBank.code})`);

    return NextResponse.json({
      success: true,
      message: "Bank created successfully",
      bank: newBank,
    }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error creating bank:", error);

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
      { success: false, message: "Failed to create bank" },
      { status: 500 }
    );
  }
}
