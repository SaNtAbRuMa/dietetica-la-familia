import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { slugify } from "@/features/catalog/sheets-parser";
import { isAdminAuthenticated } from "@/server/admin-auth";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(request: Request) {
  const originHeader = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (originHeader && originHeader !== requestOrigin) {
    return NextResponse.json(
      { ok: false, error: "Origen no permitido." },
      { status: 403 },
    );
  }

  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "Sesión de administrador requerida." },
      { status: 401 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Seleccioná un archivo de imagen." },
        { status: 400 },
      );
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        {
          ok: false,
          error: "Formato no soportado. Usá JPG, PNG, WebP o AVIF.",
        },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: "La imagen supera el máximo de 4 MB." },
        { status: 413 },
      );
    }

    const baseName =
      slugify(file.name.replace(/\.[^.]+$/, "")) || "producto";
    const fileName = `${baseName}-${Date.now()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    // 1. If Supabase Storage is configured, upload to bucket "product-images"
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (supabaseUrl && supabaseServiceKey) {
      const cleanUrl = supabaseUrl.replace(/\/+$/, "");
      const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "product-images";
      const uploadRes = await fetch(
        `${cleanUrl}/storage/v1/object/${bucket}/${fileName}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            apikey: supabaseServiceKey,
            "Content-Type": file.type,
            "x-upsert": "true",
          },
          body: bytes,
        },
      );

      if (uploadRes.ok) {
        const publicUrl = `${cleanUrl}/storage/v1/object/public/${bucket}/${fileName}`;
        return NextResponse.json({ ok: true, url: publicUrl });
      }
    }

    // 2. Local / Server storage in public/images/uploads/
    const uploadsDir = path.join(process.cwd(), "public", "images", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, fileName), bytes);

    return NextResponse.json({
      ok: true,
      url: `/images/uploads/${fileName}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "No se pudo subir la imagen.",
      },
      { status: 500 },
    );
  }
}
