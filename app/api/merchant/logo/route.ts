import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const auth = await authenticateMerchant(request, "settings.write");
  if (!auth.success) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large (max 1MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    // Convert to base64 data URL and store in database
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const logoUrl = `data:${file.type};base64,${base64}`;

    await db
      .update(users)
      .set({ companyLogoUrl: logoUrl, updatedAt: new Date() })
      .where(eq(users.id, auth.merchantId));

    return NextResponse.json({
      success: true,
      data: { logoUrl },
    });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateMerchant(request, "settings.write");
  if (!auth.success) return auth.response;

  try {
    await db
      .update(users)
      .set({ companyLogoUrl: null, updatedAt: new Date() })
      .where(eq(users.id, auth.merchantId));

    return NextResponse.json({ success: true, message: "Logo removed" });
  } catch (error) {
    console.error("Error removing logo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove logo" },
      { status: 500 }
    );
  }
}
