"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { canReceiveStock, computeCostVat, deriveSku, validateRecvInput, type RecvActionResult } from "@/lib/recv/recv";

/**
 * รับรถเข้าสต๊อกทีละคัน — ด่านสิทธิ์ + ตรวจฟอร์ม + resolve รหัสรุ่น/สี + เช็คเลขเครื่อง/ตัวถังซ้ำ + insert 1 แถว
 * RLS บังคับบริษัท (insert เฉพาะบริษัทที่เข้าถึงได้) · ต้นทุนรับเฉพาะผู้มีสิทธิ์ money (คนอื่น = 0 รอกำหนด)
 */
export async function receiveUnit(formData: FormData): Promise<RecvActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canReceiveStock(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์รับรถเข้าสต๊อก" };
  }

  const parsed = validateRecvInput({
    branchId: String(formData.get("branch_id") ?? ""),
    variantId: String(formData.get("variant_id") ?? ""),
    colorCode: String(formData.get("color_code") ?? ""),
    unitKind: String(formData.get("unit_kind") ?? ""),
    engineNo: String(formData.get("engine_no") ?? ""),
    frameNo: String(formData.get("frame_no") ?? ""),
    receivedAt: String(formData.get("received_at") ?? ""),
    retail: String(formData.get("retail") ?? ""),
    cost: String(formData.get("cost") ?? ""),
    costVat: String(formData.get("cost_vat") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const v = parsed.value;

  const supabase = await createServerSupabase();

  // resolve รหัสรุ่น (ไว้ทำ sku) + ยืนยันว่าสีนั้นเป็นของรุ่นนี้จริง + เช็คเลขเครื่อง/ตัวถังซ้ำ (ในบริษัทที่เห็นได้)
  const [variantRes, colorRes, engineDup, frameDup] = await Promise.all([
    supabase.from("model_variant").select("code").eq("id", v.variantId).maybeSingle(),
    supabase.from("model_color").select("color_code").eq("variant_id", v.variantId).eq("color_code", v.colorCode).maybeSingle(),
    supabase.from("motorcycle_unit").select("id").eq("engine_no", v.engineNo).limit(1),
    supabase.from("motorcycle_unit").select("id").eq("frame_no", v.frameNo).limit(1),
  ]);

  if (!variantRes.data) {
    return { ok: false, error: "ไม่พบรุ่นรถที่เลือก" };
  }
  if (!colorRes.data) {
    return { ok: false, error: "สีที่เลือกไม่ตรงกับรุ่นรถ" };
  }
  if ((engineDup.data ?? []).length > 0) {
    return { ok: false, error: `เลขเครื่อง ${v.engineNo} มีอยู่ในระบบแล้ว` };
  }
  if ((frameDup.data ?? []).length > 0) {
    return { ok: false, error: `เลขตัวถัง ${v.frameNo} มีอยู่ในระบบแล้ว` };
  }

  // ต้นทุนรับเฉพาะผู้มีสิทธิ์ money (คนอื่น = 0) · VAT ต้นทุนคิดเองถ้าเว้นไว้
  const canMoney = user.perms.money;
  const cost = canMoney ? v.cost : 0;
  let costVat = canMoney ? v.costVat : 0;
  if (canMoney && cost > 0 && costVat === 0) {
    costVat = computeCostVat(cost, await getSetting("vat_pct"));
  }

  const { data: inserted, error } = await supabase
    .from("motorcycle_unit")
    .insert({
      branch_id: v.branchId,
      variant_id: v.variantId,
      color_code: v.colorCode,
      sku: deriveSku(variantRes.data.code, v.colorCode),
      engine_no: v.engineNo,
      frame_no: v.frameNo,
      unit_kind: v.unitKind,
      status: "available",
      received_at: v.receivedAt,
      cost,
      cost_vat: costVat,
      retail: v.retail,
      note: v.note,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "เลขเครื่องหรือเลขตัวถังนี้มีอยู่แล้ว" };
    }
    return { ok: false, error: "บันทึกไม่สำเร็จ (สิทธิ์บริษัทไม่พอ หรือข้อมูลผิด)" };
  }

  revalidatePath("/recv");
  revalidatePath("/stock");
  return { ok: true, engineNo: v.engineNo, unitId: inserted?.id ?? null };
}
