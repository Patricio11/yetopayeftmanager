import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftBanks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const reorderSchema = z.object({
  bankOrders: z.array(
    z.object({
      id: z.string().uuid(),
      displayOrder: z.number().int().min(0),
    })
  ),
});

/**
 * PATCH /api/admin/banks/reorder
 * Update display order of banks (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Only admins can manage banks
    if ((session.user.role || 'merchant') !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = reorderSchema.parse(body);

    // Update each bank's display order
    const updatePromises = validatedData.bankOrders.map((bankOrder) =>
      db
        .update(eftBanks)
        .set({
          displayOrder: bankOrder.displayOrder,
          updatedAt: new Date(),
        })
        .where(eq(eftBanks.id, bankOrder.id))
    );

    await Promise.all(updatePromises);

    console.log(`✅ Bank order updated: ${validatedData.bankOrders.length} banks reordered`);

    return NextResponse.json({
      success: true,
      message: "Bank order updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error reordering banks:", error);

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
      { success: false, message: "Failed to reorder banks" },
      { status: 500 }
    );
  }
}
