import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { randomUUID } from "crypto";

function extensionDesdeNombre(nombre: string) {
  const partes = nombre.split(".");
  return partes.length > 1 ? partes.pop()!.toLowerCase() : "jpg";
}

function nombreSeguro(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const archivo = formData.get("file");

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    if (!archivo.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "El archivo debe ser una imagen" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const ext = extensionDesdeNombre(archivo.name);
    const base = nombreSeguro(archivo.name.replace(/\.[^.]+$/, ""));
    const path = `catalogo/banner-${base}-${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("site-assets")
      .upload(path, buffer, {
        contentType: archivo.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage.from("site-assets").getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      data: {
        path,
        publicUrl: data.publicUrl,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo subir la imagen" },
      { status: 500 }
    );
  }
}