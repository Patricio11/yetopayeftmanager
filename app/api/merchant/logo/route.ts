import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function sanitizeFileName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  return `logo-${unique}${ext}`;
}

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
        { success: false, error: "File too large (max 2MB)" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    const storedName = sanitizeFileName(file.name);
    const uploadDir = path.join(process.cwd(), "public", "uploads", "logos", auth.merchantId);
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, storedName), buffer);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const logoUrl = `${appUrl}/uploads/logos/${auth.merchantId}/${storedName}`;

    // Delete old logo file if it exists
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, auth.merchantId),
      columns: { companyLogoUrl: true },
    });
    if (currentUser?.companyLogoUrl) {
      try {
        const oldUrl = new URL(currentUser.companyLogoUrl);
        const oldPath = path.join(process.cwd(), "public", oldUrl.pathname);
        await unlink(oldPath);
      } catch { /* old file may not exist */ }
    }

    // Update user record
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
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, auth.merchantId),
      columns: { companyLogoUrl: true },
    });

    if (currentUser?.companyLogoUrl) {
      try {
        const oldUrl = new URL(currentUser.companyLogoUrl);
        const oldPath = path.join(process.cwd(), "public", oldUrl.pathname);
        await unlink(oldPath);
      } catch { /* file may not exist */ }
    }

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
