import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("ordenes")
    .select("id, creado_en, total, estado");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const ordenes = (data ?? []).map((o: any) => ({
    ...o,
    total: Number(o.total || 0),
  }));

  return NextResponse.json({ ok: true, data: ordenes });
}