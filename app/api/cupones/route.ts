import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

function normalizarCodigo(codigo: string) {
  return String(codigo ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("cupones")
    .select("*")
    .order("creado_en", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const codigo = normalizarCodigo(body.codigo ?? "");
  const tipo = String(body.tipo ?? "").trim();
  const valor = Number(body.valor ?? 0);
  const activo = Boolean(body.activo ?? true);

  const fecha_inicio = body.fecha_inicio ?? null;
  const fecha_fin = body.fecha_fin ?? null;

  const minimo_compra = Number(body.minimo_compra ?? 0);
  const max_usos =
    body.max_usos === null || body.max_usos === undefined || body.max_usos === ""
      ? null
      : Number(body.max_usos);

  if (!codigo) {
    return NextResponse.json({ ok: false, error: "Código obligatorio" }, { status: 400 });
  }

  if (tipo !== "porcentaje" && tipo !== "monto") {
    return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
  }

  if (!Number.isFinite(valor) || valor <= 0) {
    return NextResponse.json({ ok: false, error: "Valor inválido" }, { status: 400 });
  }

  if (tipo === "porcentaje" && valor > 100) {
    return NextResponse.json(
      { ok: false, error: "En porcentaje, el valor no debería superar 100" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(minimo_compra) || minimo_compra < 0) {
    return NextResponse.json(
      { ok: false, error: "Mínimo de compra inválido" },
      { status: 400 }
    );
  }

  if (max_usos !== null && (!Number.isFinite(max_usos) || max_usos < 0)) {
    return NextResponse.json({ ok: false, error: "Max usos inválido" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("cupones")
    .insert({
      codigo,
      tipo,
      valor: Math.floor(valor),
      activo,
      fecha_inicio,
      fecha_fin,
      minimo_compra: Math.floor(minimo_compra),
      max_usos: max_usos === null ? null : Math.floor(max_usos),
      usos: 0,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}