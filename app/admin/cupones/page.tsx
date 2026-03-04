"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TipoCupon = "porcentaje" | "monto";

type Cupon = {
  id: string;
  codigo: string;
  tipo: TipoCupon;
  valor: number;
  activo: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  minimo_compra: number | null;
  max_usos: number | null;
  usos: number;
  creado_en: string;
};

function formatoCOP(valor: number) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

function normalizarCodigo(c: string) {
  return c.trim().toUpperCase().replace(/\s+/g, "");
}

// datetime-local helpers
function isoToLocalInput(iso: string | null) {
  if (!iso) return "";
  // Ojo: esto convierte a UTC al mostrar. Si luego quieres “hora Colombia exacta” lo ajustamos.
  return new Date(iso).toISOString().slice(0, 16);
}
function localInputToIso(value: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function AdminCuponesPage() {
  const [items, setItems] = useState<Cupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Cupon | null>(null);

  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<TipoCupon>("porcentaje");
  const [valor, setValor] = useState<number>(10);
  const [activo, setActivo] = useState(true);

  const [fechaInicio, setFechaInicio] = useState(""); // datetime-local
  const [fechaFin, setFechaFin] = useState(""); // datetime-local
  const [minimoCompra, setMinimoCompra] = useState<number>(0);
  const [maxUsos, setMaxUsos] = useState<string>(""); // string para permitir vacío

  const totalUsos = useMemo(() => items.reduce((acc, c) => acc + (c.usos ?? 0), 0), [items]);

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/cupones", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.ok && data?.ok) setItems(data.data ?? []);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    setEditando(null);
    setCodigo("");
    setTipo("porcentaje");
    setValor(10);
    setActivo(true);
    setFechaInicio("");
    setFechaFin("");
    setMinimoCompra(0);
    setMaxUsos("");
    setModalOpen(true);
  }

  function abrirEditar(c: Cupon) {
    setEditando(c);
    setCodigo(c.codigo ?? "");
    setTipo(c.tipo);
    setValor(Number(c.valor ?? 0));
    setActivo(!!c.activo);
    setFechaInicio(isoToLocalInput(c.fecha_inicio));
    setFechaFin(isoToLocalInput(c.fecha_fin));
    setMinimoCompra(Number(c.minimo_compra ?? 0));
    setMaxUsos(c.max_usos == null ? "" : String(c.max_usos));
    setModalOpen(true);
  }

  async function guardar() {
    const codigoFinal = normalizarCodigo(codigo);

    if (!codigoFinal) {
      alert("Código obligatorio");
      return;
    }

    if (tipo !== "porcentaje" && tipo !== "monto") {
      alert("Tipo inválido");
      return;
    }

    const valorNum = Number(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      alert("Valor inválido");
      return;
    }

    if (tipo === "porcentaje" && valorNum > 100) {
      alert("En porcentaje, el valor no debería superar 100");
      return;
    }

    const minNum = Number(minimoCompra);
    if (!Number.isFinite(minNum) || minNum < 0) {
      alert("Mínimo de compra inválido");
      return;
    }

    let maxUsosNum: number | null = null;
    if (maxUsos.trim() !== "") {
      const n = Number(maxUsos);
      if (!Number.isFinite(n) || n < 0) {
        alert("Max usos inválido");
        return;
      }
      maxUsosNum = Math.floor(n);
    }

    const payload = {
      codigo: codigoFinal,
      tipo,
      valor: Math.floor(valorNum),
      activo,
      fecha_inicio: localInputToIso(fechaInicio),
      fecha_fin: localInputToIso(fechaFin),
      minimo_compra: Math.floor(minNum),
      max_usos: maxUsosNum,
    };

    const url = editando ? `/api/cupones/${editando.id}` : "/api/cupones";
    const method = editando ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body?.ok) {
      alert(body?.error ?? "No se pudo guardar");
      return;
    }

    setModalOpen(false);
    await cargar();
  }

  async function eliminar(c: Cupon) {
    const ok = confirm(`¿Eliminar definitivamente el cupón "${c.codigo}"?`);
    if (!ok) return;

    const res = await fetch(`/api/cupones/${c.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body?.ok) {
      alert(body?.error ?? "No se pudo eliminar");
      return;
    }

    await cargar();
  }

  function resumenCupon(c: Cupon) {
    if (c.tipo === "porcentaje") return `${c.valor}%`;
    return formatoCOP(Number(c.valor ?? 0));
  }

  return (
    <main className="min-h-screen bg-black px-6 py-14">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
              CUPONES
            </h1>
            <p className="mt-2 text-white/60 text-sm">
              Crea y administra códigos promocionales. (Total usos acumulados:{" "}
              <span className="text-white/80 font-semibold">{totalUsos}</span>)
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-5 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
            >
              Productos
            </Link>

            <Link
              href="/admin/ordenes"
              className="px-5 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
            >
              Órdenes
            </Link>

            <button
              onClick={abrirNuevo}
              className="px-5 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition"
            >
              + Nuevo cupón
            </button>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-[#0c0c0c] overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-xs text-white/55 border-b border-white/10">
            <div className="col-span-4">Código</div>
            <div className="col-span-2">Descuento</div>
            <div className="col-span-2">Condiciones</div>
            <div className="col-span-2">Usos</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          {loading ? (
            <div className="p-6 text-white/60">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-white/60">
              No hay cupones. Crea el primero con <b>+ Nuevo cupón</b>.
            </div>
          ) : (
            items.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-12 px-5 py-4 border-b border-white/10 hover:bg-white/[0.03] transition"
              >
                <div className="col-span-12 sm:col-span-4">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{c.codigo}</p>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        c.activo
                          ? "border-[#D4AF37]/35 text-[#D4AF37]"
                          : "border-white/15 text-white/50"
                      }`}
                    >
                      {c.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <p className="text-xs text-white/45 mt-1">
                    {c.fecha_inicio || c.fecha_fin
                      ? `Vigencia: ${c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString("es-CO") : "—"} → ${
                          c.fecha_fin ? new Date(c.fecha_fin).toLocaleDateString("es-CO") : "—"
                        }`
                      : "Sin fechas (siempre disponible)"}
                  </p>
                </div>

                <div className="col-span-6 sm:col-span-2 text-white/85 font-semibold">
                  {resumenCupon(c)}
                </div>

                <div className="col-span-6 sm:col-span-2 text-xs text-white/60">
                  <div>Mín: {formatoCOP(Number(c.minimo_compra ?? 0))}</div>
                  <div>Máx: {c.max_usos == null ? "∞" : c.max_usos}</div>
                </div>

                <div className="col-span-6 sm:col-span-2 text-white/80">
                  <span className="font-semibold">{c.usos ?? 0}</span>
                  {c.max_usos != null && (
                    <span className="text-white/45"> / {c.max_usos}</span>
                  )}
                </div>

                <div className="col-span-6 sm:col-span-2 flex justify-end gap-2">
                  <button
                    onClick={() => abrirEditar(c)}
                    className="px-3 py-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition text-sm"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => eliminar(c)}
                    className="px-3 py-2 rounded-xl border border-red-500/30 text-red-300 hover:text-red-200 hover:border-red-400/50 hover:bg-red-500/10 transition text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 bg-black/70"
            aria-label="Cerrar"
          />

          <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-[0_0_60px_rgba(0,0,0,0.75)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-semibold">
                {editando ? "Editar cupón" : "Nuevo cupón"}
              </p>

              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 gap-3">
              <label className="text-xs text-white/60">Código</label>
              <input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                placeholder="MONACO10"
              />
              <p className="text-xs text-white/40 -mt-1">
                Se guardará en MAYÚSCULAS y sin espacios.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-xs text-white/60">Tipo</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoCupon)}
                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                  >
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto">Monto fijo (COP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-white/60">
                    Valor {tipo === "porcentaje" ? "(% )" : "(COP)"}
                  </label>
                  <input
                    value={valor}
                    onChange={(e) => setValor(Number(e.target.value))}
                    type="number"
                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                    placeholder={tipo === "porcentaje" ? "10" : "5000"}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    {tipo === "porcentaje"
                      ? "Ej: 10 = 10% de descuento"
                      : "Ej: 5000 = $5.000 de descuento"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-xs text-white/60">Compra mínima (COP)</label>
                  <input
                    value={minimoCompra}
                    onChange={(e) => setMinimoCompra(Number(e.target.value))}
                    type="number"
                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60">Max usos (vacío = infinito)</label>
                  <input
                    value={maxUsos}
                    onChange={(e) => setMaxUsos(e.target.value)}
                    type="number"
                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                    placeholder="Ej: 100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="text-xs text-white/60">Fecha inicio (opcional)</label>
                  <input
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    type="datetime-local"
                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60">Fecha fin (opcional)</label>
                  <input
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    type="datetime-local"
                    className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <input
                  id="activo"
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label htmlFor="activo" className="text-sm text-white/70">
                  Cupón activo
                </label>
              </div>

              <button
                onClick={guardar}
                className="mt-4 w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}