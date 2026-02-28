import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

async function getId(ctx: Ctx) {
  const p = await ctx.params;
  return p?.id;
}

function limpiarUndefined<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

export async function DELETE(_: Request, ctx: Ctx) {
  const id = await getId(ctx);

  if (!id) {
    return NextResponse.json({ ok: false, error: "ID faltante" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("productos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, ctx: Ctx) {
  const id = await getId(ctx);

  if (!id) {
    return NextResponse.json({ ok: false, error: "ID faltante" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  const cambios: Record<string, any> = {
    nombre: body.nombre !== undefined ? String(body.nombre ?? "").trim() : undefined,

    precio: body.precio !== undefined ? Number(body.precio) : undefined,

    descripcion:
      body.descripcion !== undefined ? String(body.descripcion ?? "").trim() : undefined,

    // ✅ imagen_url opcional: "" => null
    imagen_url:
      body.imagen_url !== undefined
        ? String(body.imagen_url ?? "").trim() || null
        : undefined,

    // ✅ video_url opcional: "" => null
    video_url:
      body.video_url !== undefined
        ? String(body.video_url ?? "").trim() || null
        : undefined,

    activo: body.activo !== undefined ? Boolean(body.activo) : undefined,
  };

  // ✅ imagenes opcional: si viene, se guarda (puede ser [])
  if (body.imagenes !== undefined) {
    const imagenesRaw = Array.isArray(body.imagenes) ? body.imagenes : [];
    cambios.imagenes = imagenesRaw
      .map((x: any) => String(x).trim())
      .filter((x: string) => x.length > 0);
  }

  // Validaciones suaves
  if (cambios.nombre !== undefined && !cambios.nombre) {
    return NextResponse.json({ ok: false, error: "Nombre es obligatorio" }, { status: 400 });
  }

  if (cambios.precio !== undefined) {
    if (!Number.isFinite(cambios.precio) || cambios.precio < 0) {
      return NextResponse.json({ ok: false, error: "Precio inválido" }, { status: 400 });
    }
  }

  const cambiosFinal = limpiarUndefined(cambios);

  // Si no mandaron nada para actualizar
  if (Object.keys(cambiosFinal).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No hay cambios para actualizar" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("productos")
    .update(cambiosFinal)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}