"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCarrito } from "../providers/CarritoProvider";

function formatoCOP(valor: number) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

// ✅ Pon tu número real con indicativo, sin +, sin espacios.
// Ej: 573001234567
const WHATSAPP_NUMERO = "573195540180";

function construirMensajeTransferencia(ordenId: string) {
  return `Hola, quiero realizar el pago de mi pedido ${ordenId}, por medio de transferencia`;
}

function abrirWhatsApp(mensaje: string) {
  const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
  window.location.href = url;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, vaciar } = useCarrito();

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [metodoPago, setMetodoPago] = useState<"Transferencia" | "Contraentrega">(
    "Transferencia"
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ mensaje solo para contraentrega
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [ordenCreadaId, setOrdenCreadaId] = useState<string | null>(null);

  const itemsPayload = useMemo(() => {
    return items.map((it) => ({
      id: it.id,
      nombre: it.nombre,
      precio: it.precio,
      cantidad: it.cantidad,
    }));
  }, [items]);

  async function confirmar() {
    setError(null);
    setMensajeOk(null);
    setOrdenCreadaId(null);

    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }
    if (!nombre.trim() || !telefono.trim() || !direccion.trim()) {
      setError("Completa nombre, teléfono y dirección.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/ordenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_cliente: nombre,
        telefono,
        direccion,
        metodo_pago: metodoPago,
        items: itemsPayload,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? "No se pudo crear la orden.");
      return;
    }

    // orden creada ✅
    const ordenId = data.orden_id as string;

    // vaciamos carrito (mantiene funcionalidad pasada)
    vaciar();

    if (metodoPago === "Transferencia") {
      // ✅ Redirección a WhatsApp
      abrirWhatsApp(construirMensajeTransferencia(ordenId));
      return;
    }

    // ✅ Contraentrega: NO WhatsApp. Mensaje en pantalla.
    setOrdenCreadaId(ordenId);
    setMensajeOk(
      "Pronto nuestro equipo se comunicará contigo para coordinar la fecha de entrega de tu producto."
    );

    // (Opcional) si igual quieres mantener la confirmación disponible:
    // router.push(`/confirmacion?orden=${encodeURIComponent(ordenId)}`);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
          CHECKOUT
        </h1>
        <p className="mt-2 text-white/60 text-sm">
          Completa tus datos para generar la orden.
        </p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0c0c0c] p-6">
            <p className="text-white font-semibold">Datos del cliente</p>

            <div className="mt-5 grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs text-white/60">Nombre completo</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                  placeholder="Juan David..."
                />
              </div>

              <div>
                <label className="text-xs text-white/60">Teléfono</label>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                  placeholder="3xx xxx xxxx"
                />
              </div>

              <div>
                <label className="text-xs text-white/60">Dirección</label>
                <input
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                  placeholder="Calle / Carrera, barrio, ciudad..."
                />
              </div>

              <div>
                <label className="text-xs text-white/60">Método de pago</label>
                <select
                  value={metodoPago}
                  onChange={(e) =>
                    setMetodoPago(e.target.value as "Transferencia" | "Contraentrega")
                  }
                  className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                >
                  <option value="Transferencia">Transferencia</option>
                  <option value="Contraentrega">Contraentrega</option>
                </select>
                <p className="mt-2 text-xs text-white/45">
                  Transferencia: te llevamos a WhatsApp para coordinar el pago. Contraentrega:
                  coordinamos la entrega contigo.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {mensajeOk && (
                <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">
                  <p className="font-semibold text-white">Orden confirmada</p>
                  {ordenCreadaId && (
                    <p className="mt-1 text-white/60 text-xs">
                      Pedido: <span className="text-white/85">{ordenCreadaId}</span>
                    </p>
                  )}
                  <p className="mt-2">{mensajeOk}</p>

                  {/* Mantengo confirmación disponible (no elimino funcionalidad pasada) */}
                  {ordenCreadaId && (
                    <button
                      onClick={() =>
                        router.push(`/confirmacion?orden=${encodeURIComponent(ordenCreadaId)}`)
                      }
                      className="mt-4 px-5 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
                    >
                      Ver confirmación
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <Link
                  href="/carrito"
                  className="px-5 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
                >
                  ← Volver
                </Link>

                <button
                  disabled={loading}
                  onClick={confirmar}
                  className="flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition disabled:opacity-60"
                >
                  {loading ? "Creando orden..." : "Confirmar orden"}
                </button>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-6 h-fit">
            <p className="text-white font-semibold">Resumen</p>

            <div className="mt-4 space-y-3">
              {items.length === 0 ? (
                <p className="text-white/60 text-sm">Carrito vacío.</p>
              ) : (
                items.map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white/80 text-sm font-semibold">{it.nombre}</p>
                      <p className="text-white/50 text-xs">
                        {it.cantidad} × {formatoCOP(it.precio)}
                      </p>
                    </div>
                    <p className="text-white/80 text-sm font-semibold">
                      {formatoCOP(it.precio * it.cantidad)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-between text-white/70 text-sm">
              <span>Total</span>
              <span className="text-[#D4AF37] font-semibold">{formatoCOP(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}