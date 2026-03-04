import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

type Item = {
  id: string; // producto_id
  nombre: string;
  precio: number;
  cantidad: number;
};

function normalizarCodigo(codigo: string) {
  return String(codigo ?? "").trim().toUpperCase();
}

function ahoraEsValido(inicio: string | null, fin: string | null) {
  const ahora = new Date();
  if (inicio && new Date(inicio) > ahora) return false;
  if (fin && new Date(fin) < ahora) return false;
  return true;
}

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

  // ✅ Cupón opcional
  const codigo_cupon = normalizarCodigo(body.codigo_cupon ?? "");

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

  // Validación básica items
  for (const it of items) {
    if (!it?.id || !it?.nombre) {
      return NextResponse.json({ ok: false, error: "Item inválido" }, { status: 400 });
    }
    const cantidad = Number(it.cantidad);
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      return NextResponse.json({ ok: false, error: "Cantidad inválida" }, { status: 400 });
    }
  }

  // ✅ Seguridad: NO confiamos en precio/nombre del frontend.
  // Tomamos precios reales desde `productos`
  const ids = items.map((it) => it.id);

  const { data: productosDb, error: errProd } = await supabaseAdmin
    .from("productos")
    .select("id,nombre,precio,activo")
    .in("id", ids);

  if (errProd) {
    return NextResponse.json({ ok: false, error: errProd.message }, { status: 500 });
  }

  const mapProd = new Map<string, { nombre: string; precio: number; activo: boolean }>();
  for (const p of productosDb ?? []) {
    mapProd.set(p.id, { nombre: p.nombre, precio: Number(p.precio), activo: !!p.activo });
  }

  // Verifica que todos existan y estén activos
  for (const it of items) {
    const p = mapProd.get(it.id);
    if (!p) {
      return NextResponse.json(
        { ok: false, error: `Producto no existe: ${it.id}` },
        { status: 400 }
      );
    }
    if (!p.activo) {
      return NextResponse.json(
        { ok: false, error: `Producto inactivo: ${p.nombre}` },
        { status: 400 }
      );
    }
    if (!Number.isFinite(p.precio) || p.precio < 0) {
      return NextResponse.json(
        { ok: false, error: `Precio inválido en producto: ${p.nombre}` },
        { status: 400 }
      );
    }
  }

  // Subtotal calculado con precios reales
  const subtotal = items.reduce((acc, it) => {
    const p = mapProd.get(it.id)!;
    return acc + p.precio * Number(it.cantidad);
  }, 0);

  // ✅ Aplicar cupón (si viene)
  let descuento = 0;
  let total_final = subtotal;
  let codigo_cupon_guardar: string | null = null;

  if (codigo_cupon) {
    const { data: cupon, error: errCupon } = await supabaseAdmin
      .from("cupones")
      .select("codigo,tipo,valor,activo,fecha_inicio,fecha_fin,minimo_compra,max_usos,usos")
      .eq("codigo", codigo_cupon)
      .maybeSingle();

    if (errCupon) {
      return NextResponse.json({ ok: false, error: errCupon.message }, { status: 500 });
    }

    if (!cupon || !cupon.activo) {
      return NextResponse.json(
        { ok: false, error: "Cupón inválido o inactivo" },
        { status: 400 }
      );
    }

    if (!ahoraEsValido(cupon.fecha_inicio, cupon.fecha_fin)) {
      return NextResponse.json(
        { ok: false, error: "Cupón no disponible o expirado" },
        { status: 400 }
      );
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

    if (cupon.tipo === "porcentaje") {
      const porcentaje = Number(cupon.valor);
      descuento = Math.round((subtotal * porcentaje) / 100);
    } else {
      descuento = Number(cupon.valor);
    }

    descuento = Math.max(0, Math.min(descuento, subtotal));
    total_final = subtotal - descuento;
    codigo_cupon_guardar = cupon.codigo;
  }

  // Guardar orden
  const { data: orden, error: errOrden } = await supabaseAdmin
    .from("ordenes")
    .insert({
      nombre_cliente,
      telefono,
      direccion,
      metodo_pago,

      // Mantengo `total` como venías usando, pero ahora guardo más info
      total: total_final,
      subtotal,
      descuento,
      total_final,
      codigo_cupon: codigo_cupon_guardar,
      cupon_contabilizado: false,

      estado: "pendiente",
    })
    .select("*")
    .single();

  if (errOrden) {
    return NextResponse.json({ ok: false, error: errOrden.message }, { status: 500 });
  }

  // Guardar orden_items con nombre/precio reales
  const filasItems = items.map((it) => {
    const p = mapProd.get(it.id)!;
    return {
      orden_id: orden.id,
      producto_id: it.id,
      nombre_producto: p.nombre,
      precio: p.precio,
      cantidad: Number(it.cantidad),
    };
  });

  const { error: errItems } = await supabaseAdmin.from("orden_items").insert(filasItems);

  if (errItems) {
    await supabaseAdmin.from("ordenes").delete().eq("id", orden.id);
    return NextResponse.json({ ok: false, error: errItems.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orden_id: orden.id });
}