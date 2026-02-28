"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCarrito } from "../providers/CarritoProvider";
import { useRouter } from "next/navigation";

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
  imagen_url: string | null;
  imagenes: string[]; // ✅ NUEVO
  video_url: string | null;
  activo: boolean;
};

function formatoCOP(valor: number) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

export default function CatalogoPage() {
  const router = useRouter();

  // ✅ antes: const { agregar } = useCarrito();
  const { agregar, items } = useCarrito();

  // ✅ cantidad total para el badge del botón del carrito
  const cantidadTotal = useMemo(() => {
    return items.reduce((acc: number, it: any) => acc + (it.cantidad ?? 1), 0);
  }, [items]);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Producto | null>(null);

  // índice por producto para el carrusel (tarjetas)
  const [indexPorId, setIndexPorId] = useState<Record<string, number>>({});

  // ✅ carrusel dentro del MODAL (solo si no hay video)
  const [modalIndex, setModalIndex] = useState(0);

  async function cargar() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/productos?activo=true", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      setLoading(false);
      setError(data?.error ?? "No se pudo cargar el catálogo");
      return;
    }

    setProductos(data.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirModal(p: Producto) {
    setSeleccionado(p);
    setAbierto(true);
    setModalIndex(0); // ✅ reinicia el carrusel del modal
  }

  function cerrarModal() {
    setAbierto(false);
    setSeleccionado(null);
    setModalIndex(0);
  }

  function comprarSeleccionado() {
    if (!seleccionado) return;

    agregar({
      id: seleccionado.id,
      nombre: seleccionado.nombre,
      precio: seleccionado.precio,
      imagen_url: seleccionado.imagen_url,
    });

    cerrarModal();
    router.push("/carrito");
  }

  // Combina imagen principal + array de imágenes (para tarjetas)
  const imagenesDe = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of productos) {
      const arr = Array.isArray(p.imagenes) ? p.imagenes.filter(Boolean) : [];
      const combinado = p.imagen_url ? [p.imagen_url, ...arr] : arr;
      map.set(p.id, combinado);
    }
    return map;
  }, [productos]);

  function prev(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const imgs = imagenesDe.get(id) ?? [];
    if (imgs.length <= 1) return;

    setIndexPorId((prevState) => {
      const actual = prevState[id] ?? 0;
      const next = (actual - 1 + imgs.length) % imgs.length;
      return { ...prevState, [id]: next };
    });
  }

  function next(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const imgs = imagenesDe.get(id) ?? [];
    if (imgs.length <= 1) return;

    setIndexPorId((prevState) => {
      const actual = prevState[id] ?? 0;
      const next = (actual + 1) % imgs.length;
      return { ...prevState, [id]: next };
    });
  }

  // ✅ imágenes del MODAL (imagen_url + imagenes[])
  const imagenesModal = useMemo(() => {
    if (!seleccionado) return [];
    const arr = Array.isArray(seleccionado.imagenes)
      ? seleccionado.imagenes.filter(Boolean)
      : [];
    return seleccionado.imagen_url ? [seleccionado.imagen_url, ...arr] : arr;
  }, [seleccionado]);

  function prevModal(e: React.MouseEvent) {
    e.stopPropagation();
    if (imagenesModal.length <= 1) return;
    setModalIndex((i) => (i - 1 + imagenesModal.length) % imagenesModal.length);
  }

  function nextModal(e: React.MouseEvent) {
    e.stopPropagation();
    if (imagenesModal.length <= 1) return;
    setModalIndex((i) => (i + 1) % imagenesModal.length);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16">
      {/* ✅ BOTÓN CARRITO (FLOTANTE) */}
      <div className="fixed top-5 right-5 z-40">
        <button
          onClick={() => router.push("/carrito")}
          className="relative px-4 py-3 rounded-2xl border border-white/15 bg-black/50 backdrop-blur text-white/85 hover:text-white hover:border-white/30 hover:bg-white/5 transition shadow-[0_0_25px_rgba(0,0,0,0.6)]"
          aria-label="Ir al carrito"
          title="Carrito"
        >
          <span className="text-lg">🛒</span>

          {cantidadTotal > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-[#D4AF37] text-black text-xs font-bold flex items-center justify-center">
              {cantidadTotal > 99 ? "99+" : cantidadTotal}
            </span>
          )}
        </button>
      </div>

      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
          CATALOGO
        </h1>
        <p className="mt-4 text-white/60">
          Usa las flechas para ver más fotos. Toca para ver el video.
        </p>
      </div>

      <div className="max-w-6xl mx-auto mt-10">
        {loading && <p className="text-white/60 text-center">Cargando catálogo…</p>}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && productos.length === 0 && (
          <p className="text-white/60 text-center">
            Aún no hay productos activos. Actívalos desde el panel admin.
          </p>
        )}
      </div>

      {!loading && !error && productos.length > 0 && (
        <div className="max-w-6xl mx-auto mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {productos.map((p) => {
            const imgs = imagenesDe.get(p.id) ?? [];
            const idx = Math.min(indexPorId[p.id] ?? 0, Math.max(0, imgs.length - 1));
            const actual = imgs[idx];

            return (
              <button
                key={p.id}
                onClick={() => abrirModal(p)}
                className="text-left rounded-2xl bg-[#0c0c0c] border border-white/10 hover:border-[#D4AF37]/40 transition shadow-[0_0_30px_rgba(0,0,0,0.6)] overflow-hidden"
              >
                <div className="relative w-full aspect-[4/5] bg-black">
                  {actual ? (
                    <img
                      src={actual}
                      alt={p.nombre}
                      className="w-full h-full object-cover opacity-95"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center px-6">
                        <p className="text-xs tracking-[0.35em] uppercase text-white/50">
                          Monaco Fragancias
                        </p>
                        <p className="mt-3 text-lg font-semibold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
                          Imagen pendiente
                        </p>
                        <div className="mt-6 mx-auto h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37]/35 to-transparent" />
                      </div>
                    </div>
                  )}

                  {/* Flechas solo en tarjeta */}
                  {imgs.length > 1 && (
                    <>
                      <button
                        onClick={(e) => prev(e, p.id)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/20 bg-black/50 text-white/90 hover:bg-black/70 transition flex items-center justify-center"
                        aria-label="Anterior"
                      >
                        ‹
                      </button>

                      <button
                        onClick={(e) => next(e, p.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/20 bg-black/50 text-white/90 hover:bg-black/70 transition flex items-center justify-center"
                        aria-label="Siguiente"
                      >
                        ›
                      </button>

                      <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1">
                        {imgs.slice(0, 8).map((_, i) => (
                          <span
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${
                              i === idx ? "bg-[#D4AF37]" : "bg-white/30"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white font-semibold">{p.nombre}</p>
                    <p className="text-[#D4AF37] font-semibold">{formatoCOP(p.precio)}</p>
                  </div>
                </div>

                <div className="p-5">
                  <div className="w-full py-3 rounded-xl font-semibold text-center bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition">
                    Ver detalles
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-16 text-center">
        <Link href="/" className="text-white/60 hover:text-white transition">
          ← Volver al inicio
        </Link>
      </div>

      {/* MODAL: VIDEO si existe, si no -> carrusel de FOTOS */}
      {abierto && seleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={cerrarModal}
            className="absolute inset-0 bg-black/70"
            aria-label="Cerrar modal"
          />

          <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-[0_0_60px_rgba(0,0,0,0.75)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-white font-semibold">{seleccionado.nombre}</p>
                <p className="text-[#D4AF37] font-semibold text-sm">
                  {formatoCOP(seleccionado.precio)}
                </p>
              </div>

              <button
                onClick={cerrarModal}
                className="px-3 py-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* ✅ BLOQUE REEMPLAZADO: antes era "solo video" */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center min-h-[260px]">
                {seleccionado.video_url ? (
                  <video
                    src={seleccionado.video_url}
                    controls
                    playsInline
                    className="w-full h-full"
                  />
                ) : imagenesModal.length > 0 ? (
                  <>
                    <img
                      src={imagenesModal[Math.min(modalIndex, imagenesModal.length - 1)]}
                      alt={seleccionado.nombre}
                      className="w-full h-full object-cover"
                    />

                    {imagenesModal.length > 1 && (
                      <>
                        <button
                          onClick={prevModal}
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/20 bg-black/50 text-white/90 hover:bg-black/70 transition flex items-center justify-center"
                          aria-label="Anterior"
                        >
                          ‹
                        </button>

                        <button
                          onClick={nextModal}
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/20 bg-black/50 text-white/90 hover:bg-black/70 transition flex items-center justify-center"
                          aria-label="Siguiente"
                        >
                          ›
                        </button>

                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                          {imagenesModal.slice(0, 10).map((_, i) => (
                            <span
                              key={i}
                              className={`h-1.5 w-1.5 rounded-full ${
                                i === modalIndex ? "bg-[#D4AF37]" : "bg-white/30"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="text-center px-6">
                    <p className="text-xs tracking-[0.35em] uppercase text-white/50">
                      Multimedia
                    </p>
                    <p className="mt-3 text-white/70">Sin video ni fotos por ahora</p>
                    <div className="mt-6 mx-auto h-px w-40 bg-gradient-to-r from-transparent via-[#D4AF37]/35 to-transparent" />
                  </div>
                )}
              </div>

              <div>
                <p className="text-white/70 text-sm leading-relaxed">
                  {seleccionado.descripcion}
                </p>

                <div className="mt-6">
                  <button
                    className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition"
                    onClick={comprarSeleccionado}
                  >
                    Comprar
                  </button>

                  <p className="mt-3 text-xs text-white/45">¡ORDENA HOY!, PEDIDO GRATIS</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}