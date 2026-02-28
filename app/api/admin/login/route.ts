import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass || password !== adminPass) {
    return NextResponse.json(
      { ok: false, error: "Clave incorrecta" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set("admin_auth", "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // ✅ solo true en producción
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  });

  return res;
}