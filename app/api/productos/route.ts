import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const soloActivos = url.searchParams.get("activo") === "true";

  let query = supabaseAdmin
    .from("productos")
    .select("*")
    .order("creado_en", { ascending: false });

  if (soloActivos) query = query.eq("activo", true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const imagenesRaw = Array.isArray(body.imagenes) ? body.imagenes : [];
  const imagenes = imagenesRaw
    .map((x: any) => String(x).trim())
    .filter((x: string) => x.length > 0);

  const nuevo = {
    nombre: String(body.nombre ?? "").trim(),
    precio: Number(body.precio ?? 0),
    descripcion: String(body.descripcion ?? "").trim(),
    imagen_url: body.imagen_url ? String(body.imagen_url).trim() : null,
    imagenes, // ✅ NUEVO
    video_url: body.video_url ? String(body.video_url).trim() : null,
    activo: Boolean(body.activo ?? true),
  };

  if (!nuevo.nombre) {
    return NextResponse.json({ ok: false, error: "Nombre es obligatorio" }, { status: 400 });
  }

  if (!Number.isFinite(nuevo.precio) || nuevo.precio < 0) {
    return NextResponse.json({ ok: false, error: "Precio inválido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("productos")
    .insert(nuevo)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}