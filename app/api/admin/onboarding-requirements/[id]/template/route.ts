import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { onboardingRequirements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";

const TEMPLATE_DIR = path.join(process.cwd(), "public", "uploads", "templates");
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

    await fs.mkdir(TEMPLATE_DIR, { recursive: true });

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const ext = path.extname(file.name) || ".pdf";
    const sanitized = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 60) || "template";
    const storedName = `${sanitized}-${timestamp}-${random}${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(TEMPLATE_DIR, storedName), buffer);

    const templateUrl = `/uploads/templates/${storedName}`;

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
