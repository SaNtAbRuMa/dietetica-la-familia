import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/server/admin-auth";

const authSchema = z
  .object({
    action: z.enum(["login", "logout"]),
    password: z.string().max(200).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const originHeader = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (originHeader && originHeader !== requestOrigin) {
    return NextResponse.json(
      { error: "Origen no permitido." },
      { status: 403 },
    );
  }

  try {
    const rawBody: unknown = await request.json();
    const parsed = authSchema.parse(rawBody);

    if (parsed.action === "logout") {
      const response = NextResponse.json({ ok: true });
      response.cookies.set(ADMIN_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    if (!parsed.password || !verifyAdminPassword(parsed.password)) {
      return NextResponse.json(
        { ok: false, error: "Clave de administrador incorrecta." },
        { status: 401 },
      );
    }

    const token = createAdminSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Solicitud de autenticación inválida." },
      { status: 400 },
    );
  }
}
