"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCarrito } from "../providers/CarritoProvider";

function formatoCOP(valor: number) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

export default function CarritoPage() {
  const router = useRouter();
  const { items, total, quitar, cambiarCantidad, vaciar } = useCarrito();

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

                {items.map((it) => (
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
                    onClick={vaciar}
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

            <div className="mt-4 flex justify-between text-white/70 text-sm">
              <span>Total</span>
              <span className="text-[#D4AF37] font-semibold">
                {formatoCOP(total)}
              </span>
            </div>

            <button
              disabled={items.length === 0}
              onClick={() => router.push("/checkout")}
              className="mt-6 w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition disabled:opacity-60"
            >
              Continuar
            </button>

            <p className="mt-3 text-xs text-white/45">
              (Siguiente: confirmar orden y luego pagos)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}