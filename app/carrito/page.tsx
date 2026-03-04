"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCarrito } from "../providers/CarritoProvider";

function formatoCOP(valor: number) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

type PromoAplicada = {
  codigo: string;
  descuento: number;
  total: number;
};

export default function CarritoPage() {
  const router = useRouter();
  const { items, total, quitar, cambiarCantidad, vaciar } = useCarrito();

  // ✅ Subtotal seguro calculado desde items (por si el "total" del provider no incluye promo)
  const subtotal = useMemo(() => {
    return items.reduce((acc: number, it: any) => acc + it.precio * (it.cantidad ?? 1), 0);
  }, [items]);

  // ✅ Estados de promo
  const [codigoPromo, setCodigoPromo] = useState("");
  const [promoAplicada, setPromoAplicada] = useState<PromoAplicada | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // ✅ Si cambia el carrito, revalida el cupón aplicado para mantener el total correcto
  useEffect(() => {
    if (!promoAplicada) return;

    (async () => {
      setPromoLoading(true);
      setPromoError(null);

      const res = await fetch("/api/cupones/aplicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: promoAplicada.codigo, subtotal }),
      });

      const data = await res.json().catch(() => ({}));
      setPromoLoading(false);

      if (!res.ok || !data?.ok) {
        // Si por alguna razón dejó de ser válido, lo quitamos
        setPromoAplicada(null);
        setPromoError(data?.error ?? "El cupón ya no es válido.");
        return;
      }

      setPromoAplicada({
        codigo: data.data.codigo,
        descuento: data.data.descuento,
        total: data.data.total,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  async function aplicarPromo() {
    setPromoLoading(true);
    setPromoError(null);

    const res = await fetch("/api/cupones/aplicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: codigoPromo, subtotal }),
    });

    const data = await res.json().catch(() => ({}));
    setPromoLoading(false);

    if (!res.ok || !data?.ok) {
      setPromoAplicada(null);
      setPromoError(data?.error ?? "No se pudo aplicar el cupón");
      return;
    }

    setPromoAplicada({
      codigo: data.data.codigo,
      descuento: data.data.descuento,
      total: data.data.total,
    });

    // Normaliza input a como lo devuelve el backend
    setCodigoPromo(data.data.codigo);
  }

  function quitarPromo() {
    setPromoAplicada(null);
    setCodigoPromo("");
    setPromoError(null);
  }

  const descuento = promoAplicada?.descuento ?? 0;
  const totalFinal = promoAplicada?.total ?? subtotal;

  return (
    <main className="min-h-screen bg-black px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
          CARRITO
        </h1>

        <p className="mt-2 text-white/60 text-sm">
          Revisa tus productos antes de continuar al pago.
        </p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0c0c0c] overflow-hidden">
            {items.length === 0 ? (
              <div className="p-6 text-white/60">
                Tu carrito está vacío.
                <div className="mt-4">
                  <Link
                    href="/catalogo"
                    className="inline-block px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition"
                  >
                    Ver catálogo
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-white/10 text-xs text-white/55 grid grid-cols-12">
                  <div className="col-span-6">Producto</div>
                  <div className="col-span-3">Cantidad</div>
                  <div className="col-span-3 text-right">Subtotal</div>
                </div>

                {items.map((it: any) => (
                  <div
                    key={it.id}
                    className="px-5 py-4 border-b border-white/10 grid grid-cols-12 gap-3 items-center"
                  >
                    <div className="col-span-12 sm:col-span-6 flex items-center gap-4">
                      <div className="w-14 h-16 rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                        {it.imagen_url ? (
                          <img
                            src={it.imagen_url}
                            alt={it.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-white/40 tracking-widest">
                            MONACO
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-white font-semibold">{it.nombre}</p>
                        <p className="text-[#D4AF37] font-semibold text-sm">
                          {formatoCOP(it.precio)}
                        </p>

                        <button
                          onClick={() => quitar(it.id)}
                          className="mt-2 text-xs text-red-300 hover:text-red-200 transition"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <div className="inline-flex items-center rounded-xl border border-white/10 overflow-hidden">
                        <button
                          className="px-3 py-2 text-white/80 hover:bg-white/5 transition"
                          onClick={() => cambiarCantidad(it.id, it.cantidad - 1)}
                        >
                          −
                        </button>
                        <div className="px-4 py-2 text-white/80 text-sm min-w-[44px] text-center">
                          {it.cantidad}
                        </div>
                        <button
                          className="px-3 py-2 text-white/80 hover:bg-white/5 transition"
                          onClick={() => cambiarCantidad(it.id, it.cantidad + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="col-span-6 sm:col-span-3 text-right text-white/80 font-semibold">
                      {formatoCOP(it.precio * it.cantidad)}
                    </div>
                  </div>
                ))}

                <div className="p-5 flex justify-between items-center">
                  <Link href="/catalogo" className="text-white/60 hover:text-white transition">
                    ← Seguir comprando
                  </Link>

                  <button
                    onClick={() => {
                      vaciar();
                      // ✅ si vacían carrito, quitamos promo para evitar estados raros
                      quitarPromo();
                    }}
                    className="text-white/60 hover:text-white transition text-sm"
                  >
                    Vaciar carrito
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Resumen */}
          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-6 h-fit">
            <p className="text-white font-semibold">Resumen</p>

            {/* ✅ Código promocional */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-white/85 text-sm font-semibold">Código promocional</p>

              <div className="mt-3 flex gap-2">
                <input
                  value={codigoPromo}
                  onChange={(e) => setCodigoPromo(e.target.value)}
                  placeholder="Ej: MONACO10"
                  className="flex-1 px-4 py-3 rounded-xl bg-black border border-white/15 text-white/90 outline-none placeholder:text-white/30"
                  disabled={promoLoading || !!promoAplicada || items.length === 0}
                />

                {!promoAplicada ? (
                  <button
                    onClick={aplicarPromo}
                    disabled={promoLoading || !codigoPromo.trim() || items.length === 0}
                    className="px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white hover:bg-white/15 transition disabled:opacity-50"
                  >
                    {promoLoading ? "Aplicando..." : "Aplicar"}
                  </button>
                ) : (
                  <button
                    onClick={quitarPromo}
                    disabled={promoLoading}
                    className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 hover:bg-red-500/15 transition disabled:opacity-60"
                  >
                    Quitar
                  </button>
                )}
              </div>

              {promoError && <p className="mt-2 text-xs text-red-200">{promoError}</p>}

              {promoAplicada && (
                <p className="mt-2 text-xs text-green-200">
                  Cupón <b>{promoAplicada.codigo}</b> aplicado ✅
                </p>
              )}
            </div>

            {/* ✅ Totales */}
            <div className="mt-5 space-y-2 text-white/70 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white/85 font-semibold">{formatoCOP(subtotal)}</span>
              </div>

              {descuento > 0 && (
                <div className="flex justify-between text-green-200">
                  <span>Descuento</span>
                  <span className="font-semibold">-{formatoCOP(descuento)}</span>
                </div>
              )}

              <div className="flex justify-between text-white text-base font-semibold pt-2 border-t border-white/10">
                <span>Total</span>
                <span className="text-[#D4AF37]">{formatoCOP(totalFinal)}</span>
              </div>
            </div>

            <button
              disabled={items.length === 0}
              onClick={() => {
                // ✅ Guardamos en localStorage para usarlo en checkout si quieres
                // (opcional pero útil para pasar el cupón sin tocar el provider)
                if (promoAplicada) {
                  localStorage.setItem(
                    "promo_aplicada",
                    JSON.stringify({
                      codigo: promoAplicada.codigo,
                      descuento: promoAplicada.descuento,
                    })
                  );
                } else {
                  localStorage.removeItem("promo_aplicada");
                }

                router.push("/checkout");
              }}
              className="mt-6 w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition disabled:opacity-60"
            >
              Continuar
            </button>

            <p className="mt-3 text-xs text-white/45">
              (Siguiente: confirmar orden y luego pagos)
            </p>

            {/* ✅ Mantengo tu "total" del provider sin romper nada, por si lo usas en otra parte */}
            {/* (No se muestra, pero no se toca la lógica existente) */}
            {/* total provider: {total} */}
          </div>
        </div>
      </div>
    </main>
  );
}