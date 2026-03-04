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
  const estadoNuevo = String(body.estado ?? "").trim().toLowerCase();

  if (!ESTADOS_VALIDOS.includes(estadoNuevo as any)) {
    return NextResponse.json({ ok: false, error: "Estado inválido" }, { status: 400 });
  }

  // 1) Traemos estado actual + cupón para saber si debemos contabilizar uso
  const { data: actual, error: errActual } = await supabaseAdmin
    .from("ordenes")
    .select("id,estado,codigo_cupon,cupon_contabilizado")
    .eq("id", id)
    .single();

  if (errActual) {
    return NextResponse.json({ ok: false, error: errActual.message }, { status: 500 });
  }

  const estadoAnterior = String(actual.estado ?? "").toLowerCase();

  // 2) Actualizamos el estado
  const { data, error } = await supabaseAdmin
    .from("ordenes")
    .update({ estado: estadoNuevo })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // 3) Si transiciona a PAGADO, y tiene cupón, y no se ha contabilizado -> incrementa usos 1 vez
  const codigo = actual.codigo_cupon ? String(actual.codigo_cupon).trim().toUpperCase() : "";
  const yaContabilizado = !!actual.cupon_contabilizado;

  const transicionAPagado = estadoAnterior !== "pagado" && estadoNuevo === "pagado";

  if (transicionAPagado && codigo && !yaContabilizado) {
    // Incrementa usos (best-effort)
    const { error: errInc } = await supabaseAdmin
      .from("cupones")
      .update({ usos: (supabaseAdmin as any).rpc ? undefined : undefined }) as any;

    // 👆 Nota: supabase-js no permite "usos = usos + 1" directo con update.
    // Solución simple: usar RPC para incrementar o hacer select+update.
    // Hacemos select+update (suficiente para tu caso).
    const { data: cup, error: errCup } = await supabaseAdmin
      .from("cupones")
      .select("codigo,usos")
      .eq("codigo", codigo)
      .maybeSingle();

    if (!errCup && cup) {
      await supabaseAdmin
        .from("cupones")
        .update({ usos: Number(cup.usos ?? 0) + 1 })
        .eq("codigo", codigo);
    }

    // Marcamos como contabilizado para que no sume 2 veces
    await supabaseAdmin.from("ordenes").update({ cupon_contabilizado: true }).eq("id", id);
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