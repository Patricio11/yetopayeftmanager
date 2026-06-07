import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { onboardingRequirements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { supabaseStorage, getPublicUrl } from "@/lib/supabase-storage";
import crypto from "crypto";

const BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || "documents";
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  if (!supabaseStorage) {
    return NextResponse.json(
      { error: "Storage not configured. Contact admin." },
      { status: 500 }
    );
  }

  try {
    const [existing] = await db
      .select()
      .from(onboardingRequirements)
      .where(eq(onboardingRequirements.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    // Delete old template from storage if exists
    if (existing.templateUrl?.includes(`/storage/v1/object/public/${BUCKET}/`)) {
      const oldPath = existing.templateUrl.split(`/storage/v1/object/public/${BUCKET}/`)[1];
      if (oldPath) {
        await supabaseStorage.storage.from(BUCKET).remove([oldPath]);
      }
    }

    const dotIndex = file.name.lastIndexOf(".");
    const ext = dotIndex >= 0 ? file.name.slice(dotIndex) : ".pdf";
    const sanitized = (dotIndex >= 0 ? file.name.slice(0, dotIndex) : file.name)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 60) || "template";
    const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const storedName = `${sanitized}-${unique}${ext}`;
    const filePath = `templates/${storedName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseStorage.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase template upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload template" }, { status: 500 });
    }

    const templateUrl = getPublicUrl(BUCKET, filePath);

    const [updated] = await db
      .update(onboardingRequirements)
      .set({
        templateUrl,
        templateOriginalName: file.name,
        templateMimeType: file.type,
        templateSizeBytes: file.size,
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequirements.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error uploading template:", error);
    return NextResponse.json({ error: "Failed to upload template" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  if (!supabaseStorage) {
    return NextResponse.json(
      { error: "Storage not configured. Contact admin." },
      { status: 500 }
    );
  }

  try {
    const [existing] = await db
      .select()
      .from(onboardingRequirements)
      .where(eq(onboardingRequirements.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
    }

    if (!existing.templateUrl) {
      return NextResponse.json({ error: "No template to remove" }, { status: 400 });
    }

    // Delete from Supabase Storage
    if (existing.templateUrl.includes(`/storage/v1/object/public/${BUCKET}/`)) {
      const oldPath = existing.templateUrl.split(`/storage/v1/object/public/${BUCKET}/`)[1];
      if (oldPath) {
        await supabaseStorage.storage.from(BUCKET).remove([oldPath]);
      }
    }

    const [updated] = await db
      .update(onboardingRequirements)
      .set({
        templateUrl: null,
        templateOriginalName: null,
        templateMimeType: null,
        templateSizeBytes: null,
        updatedAt: new Date(),
      })
      .where(eq(onboardingRequirements.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error removing template:", error);
    return NextResponse.json({ error: "Failed to remove template" }, { status: 500 });
  }
}
