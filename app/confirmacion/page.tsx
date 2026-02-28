"use client";

export const dynamic = "force-dynamic";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ConfirmacionContenido() {
  const params = useSearchParams();
  const orden = params.get("orden");

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0c0c] p-6 text-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
          ORDEN CREADA ✅
        </h1>

        <p className="mt-3 text-white/70 text-sm">
          Tu orden fue registrada correctamente.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="text-xs text-white/50">ID de orden</p>
          <p className="mt-1 text-white font-semibold break-all">
            {orden ?? "—"}
          </p>
        </div>

        <p className="mt-4 text-xs text-white/45">
          Gracias por tu compra, en las siguientes horas te contactaremos para confirmar el envío.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/catalogo"
            className="px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878] text-black hover:brightness-110 transition"
          >
            Volver al catálogo
          </Link>

          <Link
            href="/"
            className="px-6 py-3 rounded-xl border border-white/15 text-white/80 hover:text-white hover:border-white/30 hover:bg-white/5 transition"
          >
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black flex items-center justify-center px-6">
          <p className="text-white/60">Cargando confirmación…</p>
        </main>
      }
    >
      <ConfirmacionContenido />
    </Suspense>
  );
}