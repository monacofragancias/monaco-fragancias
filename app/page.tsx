import Link from "next/link";

const WHATSAPP_NUMERO = "573195540180"; 
// ⚠️ Cambia esto por tu número real (57 + número, sin + ni espacios)

const MENSAJE_CONTACTO =
  "Hola, necesito asesoría personalizada para adquirir una nueva fragancia";

export default function Home() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(
    MENSAJE_CONTACTO
  )}`;

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="text-center">

        {/* MONACO con efecto oro metálico */}
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-[0.25em] bg-gradient-to-r from-[#8c6a1c] via-[#D4AF37] to-[#f5e6a3] bg-clip-text text-transparent">
          MONACO
        </h1>

        {/* FRAGANCIAS */}
        <h2 className="mt-3 text-lg md:text-xl tracking-[0.6em] text-white/60">
          FRAGANCIAS
        </h2>

        <p className="mt-6 text-white/50 text-sm">
          La excelencia que se describe en cada gota.
        </p>

        <div className="mt-10 flex justify-center gap-4">

          {/* Botón oro elegante */}
          <Link
            href="/catalogo"
            className="px-8 py-3 rounded-xl font-semibold transition 
                       bg-gradient-to-r from-[#b68a2a] via-[#D4AF37] to-[#f0d878]
                       text-black shadow-[0_0_25px_rgba(212,175,55,0.25)]
                       hover:brightness-110"
          >
            Ver catálogo
          </Link>

          {/* Botón Contacto -> WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 border border-white/20 text-white rounded-xl 
                       hover:border-white/40 hover:bg-white/5 transition"
          >
            Contacto
          </a>

        </div>

        {/* Línea decorativa elegante */}
        <div className="mt-14 h-px w-40 mx-auto bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

        <div className="mt-8 text-white/60 text-sm">
          Escríbenos por WhatsApp para asesoría personalizada.
        </div>

      </div>
    </main>
  );
}