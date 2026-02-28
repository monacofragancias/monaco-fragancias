import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type Ctx = { params: Promise<{ id: string }> | { id: string } };

async function getId(ctx: Ctx) {
  const p = await ctx.params;
  return p?.id;
}

const ESTADOS_VALIDOS = ["pendiente", "pagado", "enviado", "entregado", "cancelado"] as const;

export async function PUT(req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (!id) return NextResponse.json({ ok: false, error: "ID faltante" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const estado = String(body.estado ?? "").trim().toLowerCase();

  if (!ESTADOS_VALIDOS.includes(estado as any)) {
    return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ordenes")
    .update({ estado })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (!id) return NextResponse.json({ ok: false, error: "ID faltante" }, { status: 400 });

  // Primero borramos items (por si no hay cascade)
  const { error: errItems } = await supabaseAdmin.from("orden_items").delete().eq("orden_id", id);
  if (errItems) {
    return NextResponse.json({ ok: false, error: errItems.message }, { status: 500 });
  }

  const { error: errOrden } = await supabaseAdmin.from("ordenes").delete().eq("id", id);
  if (errOrden) {
    return NextResponse.json({ ok: false, error: errOrden.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}