import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

type Item = {
  id: string; // producto_id
  nombre: string;
  precio: number;
  cantidad: number;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const incluirItems = url.searchParams.get("items") === "true";

  const select = incluirItems ? "*, orden_items(*)" : "*";

  const { data, error } = await supabaseAdmin
    .from("ordenes")
    .select(select)
    .order("creado_en", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const nombre_cliente = String(body.nombre_cliente ?? "").trim();
  const telefono = String(body.telefono ?? "").trim();
  const direccion = String(body.direccion ?? "").trim();

  // ✅ Solo dejamos estos 2 métodos (sin PSE)
  const metodo_pago_raw = String(body.metodo_pago ?? "Transferencia").trim();
  const metodo_pago =
    metodo_pago_raw === "Transferencia" || metodo_pago_raw === "Contraentrega"
      ? metodo_pago_raw
      : "";

  const items: Item[] = Array.isArray(body.items) ? body.items : [];

  if (!nombre_cliente || !telefono || !direccion) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos del cliente" },
      { status: 400 }
    );
  }

  if (!metodo_pago) {
    return NextResponse.json(
      { ok: false, error: "Método de pago inválido" },
      { status: 400 }
    );
  }

  if (items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "El carrito está vacío" },
      { status: 400 }
    );
  }

  for (const it of items) {
    if (!it?.id || !it?.nombre) {
      return NextResponse.json({ ok: false, error: "Item inválido" }, { status: 400 });
    }
    const precio = Number(it.precio);
    const cantidad = Number(it.cantidad);

    if (!Number.isFinite(precio) || precio < 0) {
      return NextResponse.json({ ok: false, error: "Precio inválido" }, { status: 400 });
    }
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      return NextResponse.json({ ok: false, error: "Cantidad inválida" }, { status: 400 });
    }
  }

  const total = items.reduce(
    (acc, it) => acc + Number(it.precio) * Number(it.cantidad),
    0
  );

  const { data: orden, error: errOrden } = await supabaseAdmin
    .from("ordenes")
    .insert({
      nombre_cliente,
      telefono,
      direccion,
      metodo_pago,
      total,
      estado: "pendiente",
    })
    .select("*")
    .single();

  if (errOrden) {
    return NextResponse.json({ ok: false, error: errOrden.message }, { status: 500 });
  }

  const filasItems = items.map((it) => ({
    orden_id: orden.id,
    producto_id: it.id,
    nombre_producto: it.nombre,
    precio: it.precio,
    cantidad: it.cantidad,
  }));

  const { error: errItems } = await supabaseAdmin.from("orden_items").insert(filasItems);

  if (errItems) {
    await supabaseAdmin.from("ordenes").delete().eq("id", orden.id);
    return NextResponse.json({ ok: false, error: errItems.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orden_id: orden.id });
}