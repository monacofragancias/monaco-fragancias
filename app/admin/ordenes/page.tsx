"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type OrdenItem = {
  id: string;
  orden_id: string;
  producto_id: string | null;
  nombre_producto: string;
  precio: number;
  cantidad: number;
};

type EstadoOrden = "pendiente" | "pagado" | "enviado" | "entregado" | "cancelado";

type Orden = {
  id: string;
  creado_en: string;
  nombre_cliente: string;
  telefono: string;
  direccion: string;
  metodo_pago: string;
  total: number;
  estado: EstadoOrden;
  orden_items?: OrdenItem[];
};

// ✅ Para métricas (solo lo necesario)
type MetricaOrden = {
  id: string;
  creado_en: string;
  total: number;
  estado: EstadoOrden;
};

function formatoCOP(valor: number) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

function fechaBonita(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-CO");
}

function badgeEstado(estado: EstadoOrden) {
  switch (estado) {
    case "pagado":
      return "border-emerald-400/30 text-emerald-200 bg-emerald-500/10";
    case "enviado":
      return "border-sky-400/30 text-sky-200 bg-sky-500/10";
    case "entregado":
      return "border-violet-400/30 text-violet-200 bg-violet-500/10";
    case "cancelado":
      return "border-red-400/30 text-red-200 bg-red-500/10";
    default:
      return "border-[#D4AF37]/35 text-[#D4AF37] bg-[#D4AF37]/10";
  }
}

function toCSV(rows: Record<string, any>[]) {
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];

  return lines.join("\n");
}

function descargarTexto(nombreArchivo: string, contenido: string, mime: string) {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminOrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState<Orden | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<"todas" | EstadoOrden>("todas");
  const [busqueda, setBusqueda] = useState("");

  // ✅ métricas
  const [metricas, setMetricas] = useState<MetricaOrden[]>([]);
  const [loadingMetricas, setLoadingMetricas] = useState(true);

  async function cargar() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/ordenes?items=true", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "No se pudieron cargar las órdenes");
      return;
    }

    setOrdenes(data.data ?? []);
  }

  async function cargarMetricas() {
    setLoadingMetricas(true);
    const res = await fetch("/api/metricas", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoadingMetricas(false);

    if (!res.ok || !data?.ok) return;
    setMetricas(data.data ?? []);
  }

  useEffect(() => {
    cargar();
    cargarMetricas();
  }, []);

  async function cambiarEstado(id: string, estado: EstadoOrden) {
    setOrdenes((prev) => prev.map((o) => (o.id === id ? { ...o, estado } : o)));
    if (abierta?.id === id) setAbierta({ ...abierta, estado });

    // también refrescamos métricas optimista
    setMetricas((prev) => prev.map((o) => (o.id === id ? { ...o, estado } : o)));

    const res = await fetch(`/api/ordenes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      alert(data?.error ?? "No se pudo cambiar el estado");
      cargar();
      cargarMetricas();
    }
  }

  async function eliminarOrden(id: string) {
    const ok = confirm("¿Eliminar definitivamente esta orden? (se borran también sus items)");
    if (!ok) return;

    const res = await fetch(`/api/ordenes/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      alert(data?.error ?? "No se pudo eliminar la orden");
      return;
    }

    setOrdenes((prev) => prev.filter((o) => o.id !== id));
    setMetricas((prev) => prev.filter((o) => o.id !== id));
    if (abierta?.id === id) setAbierta(null);
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return ordenes.filter((o) => {
      const okEstado = filtroEstado === "todas" ? true : o.estado === filtroEstado;
      if (!okEstado) return false;
      if (!q) return true;

      // ✅ ahora también busca por nombre de producto
      const matchItem = (o.orden_items ?? []).some((it) =>
        it.nombre_producto.toLowerCase().includes(q)
      );

      return (
        o.id.toLowerCase().includes(q) ||
        o.nombre_cliente.toLowerCase().includes(q) ||
        o.telefono.toLowerCase().includes(q) ||
        o.direccion.toLowerCase().includes(q) ||
        o.metodo_pago.toLowerCase().includes(q) ||
        matchItem
      );
    });
  }, [ordenes, filtroEstado, busqueda]);

  const resumen = useMemo(() => {
    const total = filtradas.reduce((acc, o) => acc + Number(o.total || 0), 0);
    return { cantidad: filtradas.length, total };
  }, [filtradas]);

  // ✅ dashboard de métricas
  const resumenDash = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = now.getMonth();

    // yyyy-mm-dd (en navegador)
    const hoyKey = now.toLocaleDateString("en-CA");

    let ordenesHoy = 0;
    let ventasHoy = 0;

    let ordenesMes = 0;
    let ventasMes = 0;

    let pendientes = 0; // pendiente + pagado + enviado
    let entregadas = 0;
    let canceladas = 0;

    for (const o of metricas) {
      const d = new Date(o.creado_en);
      const key = d.toLocaleDateString("en-CA");

      if (key === hoyKey) {
        ordenesHoy++;
        ventasHoy += Number(o.total || 0);
      }

      if (d.getFullYear() === yyyy && d.getMonth() === mm) {
        ordenesMes++;
        ventasMes += Number(o.total || 0);
      }

      if (o.estado === "entregado") entregadas++;
      else if (o.estado === "cancelado") canceladas++;
      else pendientes++;
    }

    return { ordenesHoy, ventasHoy, ordenesMes, ventasMes, pendientes, entregadas, canceladas };
  }, [metricas]);

  function exportarCSV() {
    if (filtradas.length === 0) {
      alert("No hay órdenes para exportar.");
      return;
    }

    const rows: Record<string, any>[] = [];

    for (const o of filtradas) {
      const items = o.orden_items ?? [];
      if (items.length === 0) {
        rows.push({
          orden_id: o.id,
          fecha: o.creado_en,
          estado: o.estado,
          cliente: o.nombre_cliente,
          telefono: o.telefono,
          direccion: o.direccion,
          metodo_pago: o.metodo_pago,
          total: o.total,
          item_nombre: "",
          item_precio: "",
          item_cantidad: "",
          item_subtotal: "",
        });
      } else {
        for (const it of items) {
          rows.push({
            orden_id: o.id,
            fecha: o.creado_en,
            estado: o.estado,
            cliente: o.nombre_cliente,
            telefono: o.telefono,
            direccion: o.direccion,
            metodo_pago: o.metodo_pago,
            total: o.total,
            item_nombre: it.nombre_producto,
            item_precio: it.precio,
            item_cantidad: it.cantidad,
            item_subtotal: Number(it.precio) * Number(it.cantidad),
          });
        }
      }
    }

    const csv = toCSV(rows);
    const nombre = `ordenes_${new Date().toISOString().slice(0, 10)}.csv`;
    descargarTexto(nombre, csv, "text/csv;charset=utf-8");
  }

  function AccionesRapidas({ o }: { o: Orden }) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => cambiarEstado(o.id, "pagado")}
          className="px-3 py-2 rounded-xl border border-emerald-400/30 text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 transition text-sm"
        >
          Marcar pagado
        </button>

        <button
          onClick={() => cambiarEstado(o.id, "enviado")}
          className="px-3 py-2 rounded-xl border border-sky-400/30 text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 transition text-sm"
        >
          Marcar enviado
        </button>

        <button
          onClick={() => cambiarEstado(o.id, "entregado")}
          className="px-3 py-2 rounded-xl border border-violet-400/30 text-violet-200 bg-violet-500/10 hover:bg-violet-500/20 transition text-sm"
        >
          Marcar entregado
        </button>

        <button
          onClick={() => cambiarEstado(o.id, "cancelado")}
          className="px-3 py-2 rounded-xl border border-red-400/30 text-red-200 bg-red-500/10 hover:bg-red-500/20 transition text-sm"
        >
          Cancelar
        </button>

        <button
          onClick={() => eliminarOrden(o.id)}
          className="px-3 py-2 rounded-xl border border-red-500/30 text-red-200 hover:border-red-400/50 hover:bg-red-500/10 transition text-sm"
          title="Eliminar definitivamente"
        >
          Eliminar
        </button>
      </div>
    );
  }

  async function recargarTodo() {
    await Promise.all([cargar(), cargarMetricas()]);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-14">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
              ÓRDENES
            </h1>
            <p className="mt-2 text-white/60 text-sm">
              Dashboard + filtros + estados + eliminar + exportar CSV.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-5 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
            >
              ← Volver al admin
            </Link>

            <button
              onClick={exportarCSV}
              className="px-5 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
            >
              Exportar CSV
            </button>

            <button
              onClick={recargarTodo}
              className="px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition"
            >
              Recargar
            </button>
          </div>
        </div>

        {/* ✅ DASHBOARD */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <p className="text-xs text-white/60">Órdenes hoy</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {loadingMetricas ? "…" : resumenDash.ordenesHoy}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <p className="text-xs text-white/60">Ventas hoy</p>
            <p className="mt-2 text-2xl font-bold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
              {loadingMetricas ? "…" : formatoCOP(resumenDash.ventasHoy)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <p className="text-xs text-white/60">Órdenes este mes</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {loadingMetricas ? "…" : resumenDash.ordenesMes}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <p className="text-xs text-white/60">Ventas este mes</p>
            <p className="mt-2 text-2xl font-bold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
              {loadingMetricas ? "…" : formatoCOP(resumenDash.ventasMes)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <p className="text-xs text-white/60">Pendientes</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {loadingMetricas ? "…" : resumenDash.pendientes}
            </p>
            <p className="mt-1 text-xs text-white/45">(pendiente + pagado + enviado)</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <p className="text-xs text-white/60">Entregadas</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {loadingMetricas ? "…" : resumenDash.entregadas}
            </p>
            <p className="mt-1 text-xs text-white/45">
              Canceladas: {loadingMetricas ? "…" : resumenDash.canceladas}
            </p>
          </div>
        </div>

        {/* Controles */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <label className="text-xs text-white/60">Buscar</label>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
              placeholder="Nombre, teléfono, dirección, ID o producto..."
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <label className="text-xs text-white/60">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
            >
              <option value="todas">Todas</option>
              <option value="pendiente">pendiente</option>
              <option value="pagado">pagado</option>
              <option value="enviado">enviado</option>
              <option value="entregado">entregado</option>
              <option value="cancelado">cancelado</option>
            </select>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-4">
            <p className="text-xs text-white/60">Resumen (según filtros)</p>
            <div className="mt-3 flex justify-between text-white/70 text-sm">
              <span>Órdenes</span>
              <span className="text-white/90 font-semibold">{resumen.cantidad}</span>
            </div>
            <div className="mt-2 flex justify-between text-white/70 text-sm">
              <span>Total</span>
              <span className="text-[#D4AF37] font-semibold">{formatoCOP(resumen.total)}</span>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#0c0c0c] overflow-hidden">
          {/* ✅ REEMPLAZADO: header para incluir columna Productos */}
          <div className="grid grid-cols-12 px-5 py-3 text-xs text-white/55 border-b border-white/10">
            <div className="col-span-3">Cliente</div>
            <div className="col-span-3">Productos</div>
            <div className="col-span-2">Fecha</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-1">Estado</div>
            <div className="col-span-1 text-right">Ver</div>
          </div>

          {loading ? (
            <div className="p-6 text-white/60">Cargando órdenes...</div>
          ) : error ? (
            <div className="p-6 text-red-200">{error}</div>
          ) : filtradas.length === 0 ? (
            <div className="p-6 text-white/60">No hay resultados con esos filtros.</div>
          ) : (
            filtradas.map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-12 px-5 py-4 border-b border-white/10 hover:bg-white/[0.03] transition items-center"
              >
                <div className="col-span-3">
                  <p className="text-white font-semibold">{o.nombre_cliente}</p>
                  <p className="text-xs text-white/50">{o.telefono}</p>
                  <p className="text-xs text-white/40 mt-1 line-clamp-1">{o.direccion}</p>
                </div>

                {/* ✅ NUEVO: productos comprados */}
                <div className="col-span-3">
                  {(o.orden_items ?? []).length === 0 ? (
                    <p className="text-xs text-white/50">—</p>
                  ) : (
                    <p className="text-xs text-white/70 line-clamp-2">
                      {(o.orden_items ?? [])
                        .map((it) => `${it.nombre_producto} ×${it.cantidad}`)
                        .join(", ")}
                    </p>
                  )}
                </div>

                <div className="col-span-2 text-white/70 text-sm">{fechaBonita(o.creado_en)}</div>

                <div className="col-span-2 text-white/80 font-semibold">{formatoCOP(o.total)}</div>

                {/* ✅ ajustado: antes col-span-2, ahora col-span-1 */}
                <div className="col-span-1">
                  <select
                    value={o.estado}
                    onChange={(e) => cambiarEstado(o.id, e.target.value as EstadoOrden)}
                    className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${badgeEstado(
                      o.estado
                    )}`}
                  >
                    <option value="pendiente">pendiente</option>
                    <option value="pagado">pagado</option>
                    <option value="enviado">enviado</option>
                    <option value="entregado">entregado</option>
                    <option value="cancelado">cancelado</option>
                  </select>
                </div>

                <div className="col-span-1 flex justify-end gap-2">
                  <button
                    onClick={() => setAbierta(o)}
                    className="px-3 py-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition text-sm"
                    title="Ver detalle"
                  >
                    👁
                  </button>

                  <button
                    onClick={() => eliminarOrden(o.id)}
                    className="px-3 py-2 rounded-xl border border-red-500/30 text-red-200 hover:border-red-400/50 hover:bg-red-500/10 transition text-sm"
                    title="Eliminar definitivamente"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL DETALLE (se mantiene igual, ya muestra productos) */}
      {abierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button onClick={() => setAbierta(null)} className="absolute inset-0 bg-black/70" aria-label="Cerrar" />

          <div className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-[0_0_60px_rgba(0,0,0,0.75)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-white font-semibold">Detalle de orden</p>
                <p className="text-xs text-white/45 break-all">{abierta.id}</p>
              </div>

              <button
                onClick={() => setAbierta(null)}
                className="px-3 py-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-white font-semibold">Cliente</p>
                <p className="mt-2 text-white/70 text-sm">{abierta.nombre_cliente}</p>
                <p className="text-white/50 text-sm">{abierta.telefono}</p>
                <p className="mt-3 text-white/70 text-sm">{abierta.direccion}</p>

                <div className="mt-4 flex justify-between text-sm text-white/60">
                  <span>Método</span>
                  <span className="text-white/80">{abierta.metodo_pago}</span>
                </div>

                <div className="mt-2 flex justify-between text-sm text-white/60">
                  <span>Fecha</span>
                  <span className="text-white/80">{fechaBonita(abierta.creado_en)}</span>
                </div>

                <div className="mt-4 flex justify-between text-sm text-white/60">
                  <span>Total</span>
                  <span className="text-[#D4AF37] font-semibold">{formatoCOP(abierta.total)}</span>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-white/60">Acciones rápidas</p>
                  <div className="mt-2">
                    <AccionesRapidas o={abierta} />
                  </div>

                  <button
                    onClick={() => eliminarOrden(abierta.id)}
                    className="mt-3 w-full px-4 py-3 rounded-xl border border-red-500/30 text-red-200 hover:border-red-400/50 hover:bg-red-500/10 transition text-sm"
                  >
                    Eliminar orden definitivamente
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-white font-semibold">Estado</p>

                <div className="mt-4">
                  <select
                    value={abierta.estado}
                    onChange={(e) => cambiarEstado(abierta.id, e.target.value as EstadoOrden)}
                    className={`w-full rounded-xl border px-3 py-3 text-sm outline-none ${badgeEstado(
                      abierta.estado
                    )}`}
                  >
                    <option value="pendiente">pendiente</option>
                    <option value="pagado">pagado</option>
                    <option value="enviado">enviado</option>
                    <option value="entregado">entregado</option>
                    <option value="cancelado">cancelado</option>
                  </select>

                  <p className="mt-2 text-xs text-white/45">
                    (Luego, con PSE real, esto puede cambiarse automáticamente.)
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-white font-semibold">Productos</p>

                <div className="mt-4 space-y-3">
                  {(abierta.orden_items ?? []).length === 0 ? (
                    <p className="text-white/60 text-sm">Sin items.</p>
                  ) : (
                    (abierta.orden_items ?? []).map((it) => (
                      <div
                        key={it.id}
                        className="flex justify-between items-start gap-3 border-b border-white/10 pb-3"
                      >
                        <div>
                          <p className="text-white/80 text-sm font-semibold">{it.nombre_producto}</p>
                          <p className="text-white/50 text-xs">
                            {it.cantidad} × {formatoCOP(it.precio)}
                          </p>
                        </div>

                        <p className="text-white/80 text-sm font-semibold">
                          {formatoCOP(Number(it.precio) * Number(it.cantidad))}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <p className="text-xs text-white/45">Exportar CSV usa exactamente lo que esté filtrado y buscado.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}