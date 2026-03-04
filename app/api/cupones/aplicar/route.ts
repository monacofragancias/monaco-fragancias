import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

function normalizarCodigo(codigo: string) {
  return codigo.trim().toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const codigo = normalizarCodigo(body?.codigo ?? "");
    const subtotal = Number(body?.subtotal ?? 0);

    if (!codigo) {
      return NextResponse.json({ ok: false, error: "Ingresa un código" }, { status: 400 });
    }

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return NextResponse.json({ ok: false, error: "Subtotal inválido" }, { status: 400 });
    }

    const { data: cupon, error } = await supabaseAdmin
      .from("cupones")
      .select("codigo,tipo,valor,activo,fecha_inicio,fecha_fin,minimo_compra,max_usos,usos")
      .eq("codigo", codigo)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!cupon || !cupon.activo) {
      return NextResponse.json({ ok: false, error: "Cupón inválido o inactivo" }, { status: 404 });
    }

    const ahora = new Date();

    if (cupon.fecha_inicio && new Date(cupon.fecha_inicio) > ahora) {
      return NextResponse.json({ ok: false, error: "Cupón aún no está disponible" }, { status: 400 });
    }

    if (cupon.fecha_fin && new Date(cupon.fecha_fin) < ahora) {
      return NextResponse.json({ ok: false, error: "Cupón expirado" }, { status: 400 });
    }

    const minimo = Number(cupon.minimo_compra ?? 0);
    if (subtotal < minimo) {
      return NextResponse.json(
        { ok: false, error: `Este cupón requiere compra mínima de ${minimo}` },
        { status: 400 }
      );
    }

    if (cupon.max_usos != null && cupon.usos >= cupon.max_usos) {
      return NextResponse.json({ ok: false, error: "Cupón agotado" }, { status: 400 });
    }

    let descuento = 0;

    if (cupon.tipo === "porcentaje") {
      const porcentaje = Number(cupon.valor);
      descuento = Math.round((subtotal * porcentaje) / 100);
    } else {
      descuento = Number(cupon.valor);
    }

    descuento = Math.max(0, Math.min(descuento, subtotal));
    const total = subtotal - descuento;

    return NextResponse.json({
      ok: true,
      data: {
        codigo: cupon.codigo,
        tipo: cupon.tipo,
        valor: cupon.valor,
        subtotal,
        descuento,
        total,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400 });
  }
}