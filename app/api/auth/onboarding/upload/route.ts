import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
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

function sanitizeFileName(name: string): string {
  const ext = path.extname(name);
  const base = path.basename(name, ext)
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

  const storedName = sanitizeFileName(file.name);
  const uploadDir = path.join(process.cwd(), "public", "uploads", "onboarding", session.user.id);
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, storedName), buffer);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${appUrl}/uploads/onboarding/${session.user.id}/${storedName}`;

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
}
