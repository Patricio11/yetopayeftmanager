import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { supabaseStorage, getPublicUrl } from "@/lib/supabase-storage";
import crypto from "crypto";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = process.env.SUPABASE_LOGO_BUCKET || "company-logos";

export async function POST(request: NextRequest) {
  const auth = await authenticateMerchant(request, "settings.write");
  if (!auth.success) return auth.response;

  if (!supabaseStorage) {
    return NextResponse.json(
      { success: false, error: "Storage not configured. Contact admin." },
      { status: 500 }
    );
  }

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

    // Delete old logo from storage if exists
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, auth.merchantId),
      columns: { companyLogoUrl: true },
    });
    if (currentUser?.companyLogoUrl?.includes(`/storage/v1/object/public/${BUCKET}/`)) {
      const oldPath = currentUser.companyLogoUrl.split(`/storage/v1/object/public/${BUCKET}/`)[1];
      if (oldPath) {
        await supabaseStorage.storage.from(BUCKET).remove([oldPath]);
      }
    }

    // Upload new logo
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${auth.merchantId}/logo-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseStorage.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload to storage" },
        { status: 500 }
      );
    }

    const logoUrl = getPublicUrl(BUCKET, fileName);

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

  if (!supabaseStorage) {
    return NextResponse.json(
      { success: false, error: "Storage not configured. Contact admin." },
      { status: 500 }
    );
  }

  try {
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, auth.merchantId),
      columns: { companyLogoUrl: true },
    });

    if (currentUser?.companyLogoUrl?.includes(`/storage/v1/object/public/${BUCKET}/`)) {
      const oldPath = currentUser.companyLogoUrl.split(`/storage/v1/object/public/${BUCKET}/`)[1];
      if (oldPath) {
        await supabaseStorage.storage.from(BUCKET).remove([oldPath]);
      }
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
