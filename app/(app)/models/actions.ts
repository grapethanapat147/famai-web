"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettingsWith } from "@/lib/settings";
import { canUploadModelPhoto, type ModelPhotoResult } from "@/lib/models/image";
import { validateModelEdit, type AddModelResult } from "@/lib/models/rows";

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

/**
 * แก้ไขข้อมูลรุ่นรถ (FAM-1091) — อัปเดต model_variant + ราคาใหม่ (upsert price_history วันนี้)
 * เฉพาะแอดมิน (ตรง RLS model_variant/price_history = is_admin()) · รหัสรุ่น/สี ไม่แก้ที่นี่ (คีย์/กระทบยูนิต)
 */
export async function editModel(formData: FormData): Promise<AddModelResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!user.perms.admin) {
    return { ok: false, error: "แก้ไขรุ่นได้เฉพาะผู้ดูแลระบบ (admin)" };
  }

  const variantId = String(formData.get("variant_id") ?? "").trim();
  if (!variantId) {
    return { ok: false, error: "ไม่พบรุ่นที่จะแก้ไข" };
  }

  const parsed = validateModelEdit({
    modelName: String(formData.get("model_name") ?? ""),
    modelTh: String(formData.get("model_th") ?? ""),
    category: String(formData.get("category") ?? ""),
    cc: String(formData.get("cc") ?? ""),
    year: String(formData.get("model_year") ?? ""),
    cost: String(formData.get("cost") ?? ""),
    retail: String(formData.get("retail") ?? ""),
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const v = parsed.value;

  const supabase = await createServerSupabase();

  const { error: variantError } = await supabase
    .from("model_variant")
    .update({ model_name: v.modelName, model_th: v.modelTh, category: v.category, cc: v.cc, model_year: v.year })
    .eq("id", variantId);
  if (variantError) {
    return { ok: false, error: friendly(variantError) };
  }

  // ราคาใหม่มีผลวันนี้ — upsert (กันชนกับแถวราคาของวันเดียวกัน)
  const settings = await getSettingsWith(supabase);
  const vat = Math.round(v.cost * (settings.vat_pct / 100) * 100) / 100;
  const today = new Date().toISOString().slice(0, 10);
  const { error: priceError } = await supabase
    .from("price_history")
    .upsert(
      { variant_id: variantId, effective_from: today, cost: v.cost, vat, retail: v.retail, source: "แก้ไขในระบบ" },
      { onConflict: "variant_id,effective_from" },
    );
  if (priceError) {
    return { ok: false, error: friendly(priceError) };
  }

  revalidatePath("/models");
  return { ok: true };
}

/**
 * บันทึกรูปปกรุ่นรถ (FAM-1024) — เรียกหลังฝั่ง client ย่อ+อัปไฟล์ขึ้น bucket แล้ว
 * ด่านสิทธิ์ admin/manager (ตรงกับ is_manager() ของ bucket) · upsert model_photo(sort=0) + คัด photo_url
 */
export async function saveModelPhoto(formData: FormData): Promise<ModelPhotoResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canUploadModelPhoto(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์จัดการรูป (เฉพาะหัวหน้า/แอดมิน)" };
  }

  const variantId = String(formData.get("variant_id") ?? "").trim();
  const pathCard = String(formData.get("path_card") ?? "").trim();
  const pathFull = String(formData.get("path_full") ?? "").trim();
  const bytesRaw = String(formData.get("bytes") ?? "").trim();
  const bytes = bytesRaw !== "" ? Number(bytesRaw) : null;

  if (!variantId || !pathCard || !pathFull) {
    return { ok: false, error: "ข้อมูลรูปไม่ครบ" };
  }

  const supabase = await createServerSupabase();
  const { error: photoError } = await supabase
    .from("model_photo")
    .upsert({ variant_id: variantId, sort: 0, path_card: pathCard, path_full: pathFull, bytes }, { onConflict: "variant_id,sort" });
  if (photoError) {
    return { ok: false, error: friendly(photoError) };
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/model-photo/${pathCard}`;
  await supabase.from("model_variant").update({ photo_url: publicUrl }).eq("id", variantId);

  revalidatePath("/models");
  return { ok: true };
}
