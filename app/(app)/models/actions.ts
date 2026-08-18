"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSettingsWith } from "@/lib/settings";
import type { AddModelResult } from "@/lib/models/rows";

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

  // atomic ผ่าน add_model RPC (variant + colors + price ในทรานแซกชันเดียว · rollback ถ้าพลาด · FAM-1025)
  const { error } = await supabase.rpc("add_model", {
    p_code: code,
    p_model_name: modelName,
    p_model_th: modelTh,
    p_category: category,
    p_cc: cc,
    p_year: year,
    p_colors: colors,
    p_cost: cost,
    p_vat: vat,
    p_retail: retail,
  });
  if (error) {
    return { ok: false, error: friendly(error) };
  }

  revalidatePath("/models");
  return { ok: true };
}
