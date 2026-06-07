import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { settlementBanks } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const createBankSchema = z.object({
  bankName: z.string().min(1),
  fullName: z.string().optional(),
  code: z.string().min(1),
  color: z.string().optional(),
  branchCode: z.string().optional(),
  enabled: z.boolean().default(true),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const banks = await db
    .select()
    .from(settlementBanks)
    .orderBy(asc(settlementBanks.displayOrder));

  return NextResponse.json({ success: true, data: banks });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const validated = createBankSchema.parse(body);

    const [bank] = await db
      .insert(settlementBanks)
      .values(validated)
      .returning();

    return NextResponse.json({ success: true, data: bank }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid data", details: error.issues }, { status: 400 });
    }
    if (error?.code === "23505") {
      return NextResponse.json({ success: false, error: "A bank with this code already exists" }, { status: 409 });
    }
    console.error("Error creating settlement bank:", error);
    return NextResponse.json({ success: false, error: "Failed to create bank" }, { status: 500 });
  }
}
