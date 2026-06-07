import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { supabaseStorage, getPublicUrl } from "@/lib/supabase-storage";
import crypto from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || "documents";

function sanitizeFileName(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  const ext = dotIndex >= 0 ? name.slice(dotIndex) : "";
  const base = (dotIndex >= 0 ? name.slice(0, dotIndex) : name)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .substring(0, 60) || "file";
  const unique = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  return `${base}-${unique}${ext}`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseStorage) {
    return NextResponse.json(
      { error: "Storage not configured. Contact admin." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX" },
      { status: 400 }
    );
  }

  try {
    const storedName = sanitizeFileName(file.name);
    const filePath = `onboarding/${session.user.id}/${storedName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseStorage.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const url = getPublicUrl(BUCKET, filePath);

    return NextResponse.json({
      success: true,
      data: {
        originalName: file.name,
        storedName,
        url,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
