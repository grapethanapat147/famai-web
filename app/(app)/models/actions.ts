"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSettingsWith } from "@/lib/settings";
import type { AddModelResult } from "@/lib/models/rows";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** แปลง error จาก DB เป็นข้อความไทยที่ผู้ใช้เข้าใจ (ไม่โชว์ internal) */
function friendly(error: { code?: string; message?: string } | null): string {
  if (!error) {
    return "บันทึกไม่สำเร็จ";
  }
  if (error.code === "23505") {
    return "รหัสรุ่นนี้มีอยู่แล้ว";
  }
  if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) {
    return "ไม่มีสิทธิ์เพิ่มรุ่น (ต้องเป็นแอดมิน)";
  }
  return "บันทึกไม่สำเร็จ กรุณาลองใหม่";
}

/**
 * เพิ่มรุ่นรถใหม่ (FAM-1009) — insert model_variant + model_color[] + price_history (1 แถว วันนี้)
 * สิทธิ์บังคับที่ RLS (แก้ตารางอ้างอิงได้เฉพาะ is_admin()) — server แค่ประกอบข้อมูล
 *
 * หมายเหตุ: 3 insert ไม่ atomic (supabase-js ไม่มี transaction ข้ามคำสั่ง) → มี cleanup best-effort
 * กันรุ่นค้างครึ่งใบ · การทำให้ atomic จริงด้วย RPC add_model() = FAM-1025 (hardening)
 */
export async function addModel(formData: FormData): Promise<AddModelResult> {
  const code = String(formData.get("code") ?? "").trim();
  const modelName = String(formData.get("model_name") ?? "").trim();
  const modelTh = String(formData.get("model_th") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const ccRaw = String(formData.get("cc") ?? "").trim();
  const yearRaw = String(formData.get("model_year") ?? "").trim();
  const costRaw = String(formData.get("cost") ?? "").trim();
  const retailRaw = String(formData.get("retail") ?? "").trim();

  let colors: Array<{ code: string; name: string }> = [];
  try {
    const parsed = JSON.parse(String(formData.get("colors") ?? "[]"));
    if (Array.isArray(parsed)) {
      colors = parsed.filter((c) => c && typeof c.code === "string" && typeof c.name === "string");
    }
  } catch {
    colors = [];
  }

  if (!code || !modelName) {
    return { ok: false, error: "กรอกรหัสรุ่นและชื่อรุ่น" };
  }
  if (colors.length === 0) {
    return { ok: false, error: "ต้องมีอย่างน้อย 1 สี" };
  }
  const retail = Number(retailRaw);
  if (!Number.isFinite(retail) || retail <= 0) {
    return { ok: false, error: "ราคาขายไม่ถูกต้อง" };
  }
  const cost = costRaw === "" ? 0 : Number(costRaw);
  if (!Number.isFinite(cost) || cost < 0) {
    return { ok: false, error: "ต้นทุนไม่ถูกต้อง" };
  }
  const cc = ccRaw === "" ? null : Number(ccRaw);
  const year = yearRaw === "" ? null : Number(yearRaw);
  if ((cc != null && !Number.isFinite(cc)) || (year != null && !Number.isFinite(year))) {
    return { ok: false, error: "ค่า cc / ปี ไม่ถูกต้อง" };
  }

  const supabase = await createServerSupabase();
  const settings = await getSettingsWith(supabase);
  const vat = Math.round(cost * (settings.vat_pct / 100) * 100) / 100;

  const { data: variant, error: variantError } = await supabase
    .from("model_variant")
    .insert({
      code,
      model_name: modelName,
      model_th: modelTh || null,
      category: category || null,
      cc,
      model_year: year,
    })
    .select("id")
    .single();

  if (variantError || !variant) {
    return { ok: false, error: friendly(variantError) };
  }

  const { error: colorError } = await supabase.from("model_color").insert(
    colors.map((c) => ({ variant_id: variant.id, color_code: c.code, color_name: c.name })),
  );

  const { error: priceError } = colorError
    ? { error: null }
    : await supabase.from("price_history").insert({
        variant_id: variant.id,
        effective_from: todayISO(),
        cost,
        vat,
        retail,
        source: "เพิ่มด้วยมือ (หน้ารุ่นรถและสี)",
      });

  if (colorError || priceError) {
    // cleanup best-effort — ลบลูกก่อนแล้วค่อยลบแม่ (FK ไม่ cascade)
    await supabase.from("price_history").delete().eq("variant_id", variant.id);
    await supabase.from("model_color").delete().eq("variant_id", variant.id);
    await supabase.from("model_variant").delete().eq("id", variant.id);
    return { ok: false, error: friendly(colorError ?? priceError) };
  }

  revalidatePath("/models");
  return { ok: true };
}
