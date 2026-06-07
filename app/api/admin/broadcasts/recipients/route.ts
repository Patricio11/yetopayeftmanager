import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { or, ilike, and, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type") || "all";

    const roleFilter = type === "merchants"
      ? inArray(users.role, ["merchant"])
      : type === "partners"
      ? inArray(users.role, ["partner"])
      : inArray(users.role, ["merchant", "partner"]);

    const conditions = [roleFilter];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.companyName, `%${search}%`),
        )!
      );
    }

    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        companyName: users.companyName,
        role: users.role,
      })
      .from(users)
      .where(and(...conditions))
      .limit(50);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error searching recipients:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search recipients" },
      { status: 500 }
    );
  }
}
