import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export type SearchHit = { type: string; label: string; sub: string; href: string };

/**
 * ค้นหาทั่วเว็บ (FAM-1081) — รถ (เลขเครื่อง/เลขถัง/รุ่น) + ลูกค้า (ชื่อ/เบอร์)
 * ผ่าน session ผู้ใช้ → RLS คัดเฉพาะบริษัทที่เห็นได้ · ไม่คืนข้อมูลเงิน (ต้นทุน/กำไร)
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }
  const raw = (req.nextUrl.searchParams.get("q") ?? "").trim();
  // ตัดอักขระที่ทำ PostgREST or() พัง แล้วเหลือคำค้นที่ปลอดภัย
  const q = raw.replace(/[,()%*]/g, "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createServerSupabase();
  const wild = `*${q}*`;
  const qLower = q.toLowerCase();

  const [variantsRes, colorsRes, custRes, engineUnitsRes] = await Promise.all([
    supabase.from("model_variant").select("id, model_name, model_th"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    supabase.from("customer").select("id, full_name, phone").or(`full_name.ilike.${wild},phone.ilike.${wild}`).limit(6),
    supabase.from("motorcycle_unit").select("id, engine_no, variant_id, color_code").or(`engine_no.ilike.${wild},frame_no.ilike.${wild}`).limit(8),
  ]);

  const variants = variantsRes.data ?? [];
  const variantName = new Map(variants.map((v) => [v.id, v.model_th || v.model_name]));
  const colorName = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));

  // รถที่ตรงชื่อรุ่น (เช่นพิมพ์ "NMAX") → หายูนิตของรุ่นนั้น
  const matchVariantIds = variants
    .filter((v) => `${v.model_name} ${v.model_th ?? ""}`.toLowerCase().includes(qLower))
    .map((v) => v.id);
  const modelUnitsRes = matchVariantIds.length
    ? await supabase.from("motorcycle_unit").select("id, engine_no, variant_id, color_code").in("variant_id", matchVariantIds).limit(8)
    : { data: [] };

  const unitById = new Map<string, { id: string; engine_no: string | null; variant_id: string; color_code: string }>();
  for (const u of [...(engineUnitsRes.data ?? []), ...(modelUnitsRes.data ?? [])]) {
    unitById.set(u.id, u);
  }

  const results: SearchHit[] = [];
  for (const u of [...unitById.values()].slice(0, 6)) {
    const color = colorName.get(`${u.variant_id}:${u.color_code}`);
    results.push({
      type: "รถ",
      label: `${variantName.get(u.variant_id) ?? "รถ"}${color ? ` · ${color}` : ""}`,
      sub: u.engine_no ?? "",
      href: `/stock?unit=${u.id}`,
    });
  }
  for (const c of custRes.data ?? []) {
    results.push({
      type: "ลูกค้า",
      label: c.full_name,
      sub: c.phone ?? "",
      href: `/deal?q=${encodeURIComponent(c.full_name)}`,
    });
  }

  return NextResponse.json({ results });
}
