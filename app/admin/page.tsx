"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
  imagen_url: string | null;
  imagenes: string[]; // ✅
  video_url: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
};

function formatoCOP(valor: number) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

function parseImagenes(texto: string): string[] {
  return texto
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

export default function AdminPage() {
  const [items, setItems] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState<number>(0);
  const [descripcion, setDescripcion] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [imagenesTexto, setImagenesTexto] = useState(""); // ✅
  const [videoUrl, setVideoUrl] = useState("");
  const [activo, setActivo] = useState(true);

  async function cargar() {
    setLoading(true);
    const res = await fetch("/api/productos");
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (data?.ok) setItems(data.data);
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    setEditando(null);
    setNombre("");
    setPrecio(0);
    setDescripcion("");
    setImagenUrl("");
    setImagenesTexto("");
    setVideoUrl("");
    setActivo(true);
    setModalOpen(true);
  }

  function abrirEditar(p: Producto) {
    setEditando(p);
    setNombre(p.nombre);
    setPrecio(p.precio);
    setDescripcion(p.descripcion);
    setImagenUrl(p.imagen_url ?? "");
    setImagenesTexto((p.imagenes ?? []).join("\n")); // ✅
    setVideoUrl(p.video_url ?? "");
    setActivo(p.activo);
    setModalOpen(true);
  }

  async function guardar() {
    const imagenes = parseImagenes(imagenesTexto);

    const payload = {
      nombre,
      precio,
      descripcion,
      imagen_url: imagenUrl || null,
      imagenes, // ✅
      video_url: videoUrl || null,
      activo,
    };

    const url = editando ? `/api/productos/${editando.id}` : "/api/productos";
    const method = editando ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.json().catch(() => ({}));
      alert(msg?.error ?? "No se pudo guardar");
      return;
    }

    setModalOpen(false);
    await cargar();
  }

  async function eliminar(p: Producto) {
    const ok = confirm(`¿Eliminar definitivamente "${p.nombre}"?`);
    if (!ok) return;

    const res = await fetch(`/api/productos/${p.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));

    if (!res.ok || !body?.ok) {
      alert(`Error ${res.status}: ${body?.error ?? "No se pudo eliminar"}`);
      return;
    }

    await cargar();
  }

  async function salir() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <main className="min-h-screen bg-black px-6 py-14">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
              PANEL ADMIN
            </h1>
            <p className="mt-2 text-white/60 text-sm">
              Crear, editar o eliminar productos.
            </p>
          </div>

          <div className="flex gap-3">
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
              + Nuevo
            </button>

            <button
              onClick={salir}
              className="px-5 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-[#0c0c0c] overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-xs text-white/55 border-b border-white/10">
            <div className="col-span-5">Producto</div>
            <div className="col-span-3">Precio</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          {loading ? (
            <div className="p-6 text-white/60">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-white/60">
              No hay productos. Crea el primero con <b>+ Nuevo</b>.
            </div>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-12 px-5 py-4 border-b border-white/10 hover:bg-white/[0.03] transition"
              >
                <div className="col-span-5">
                  <p className="text-white font-semibold">{p.nombre}</p>
                  <p className="text-xs text-white/50 line-clamp-1 mt-1">
                    {p.descripcion}
                  </p>
                  <p className="text-xs text-white/40 mt-1">
                    Fotos: {(p.imagenes?.length ?? 0) + (p.imagen_url ? 1 : 0)}
                  </p>
                </div>

                <div className="col-span-3 text-white/80 font-semibold">
                  {formatoCOP(p.precio)}
                </div>

                <div className="col-span-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-full border ${
                      p.activo
                        ? "border-[#D4AF37]/35 text-[#D4AF37]"
                        : "border-white/15 text-white/50"
                    }`}
                  >
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    onClick={() => abrirEditar(p)}
                    className="px-3 py-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition text-sm"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => eliminar(p)}
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
                {editando ? "Editar producto" : "Nuevo producto"}
              </p>

              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-2 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 gap-3">
              <label className="text-xs text-white/60">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
              />

              <label className="text-xs text-white/60 mt-2">Precio (COP)</label>
              <input
                value={precio}
                onChange={(e) => setPrecio(Number(e.target.value))}
                type="number"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
              />

              <label className="text-xs text-white/60 mt-2">Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full min-h-[110px] rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
              />

              <label className="text-xs text-white/60 mt-2">
                Imagen principal (opcional)
              </label>
              <input
                value={imagenUrl}
                onChange={(e) => setImagenUrl(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                //placeholder="https://... o /..."
              />

              <label className="text-xs text-white/60 mt-2">
                Imágenes del carrusel (una URL por línea)
              </label>
              <textarea
                value={imagenesTexto}
                onChange={(e) => setImagenesTexto(e.target.value)}
                className="w-full min-h-[120px] rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
                placeholder={"https://...\nhttps://...\nhttps://..."}
              />
            

              <label className="text-xs text-white/60 mt-2">
                URL Video (opcional)
              </label>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50"
              />

              <div className="flex items-center gap-3 mt-3">
                <input
                  id="activo"
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                />
                <label htmlFor="activo" className="text-sm text-white/70">
                  Producto activo
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