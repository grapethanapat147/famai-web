"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { sellUnit } from "@/lib/rpc";
import { canSell, validateSellPricing, type SellActionResult } from "@/lib/sell/sell";

/**
 * บันทึกการขายผ่าน sell_unit RPC (atomic + กันขายซ้ำ) — ด่านสิทธิ์ + คำนวณเงินฝั่ง DB
 * ราคา/ส่วนลด/ของแถมส่งไป แต่ต้นทุน/กำไรคิดใน RPC จากต้นทุนจริงของรถ (ไม่เชื่อ client)
 */
export async function recordSale(formData: FormData): Promise<SellActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canSell(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ขายรถ" };
  }

  const unitId = String(formData.get("unit_id") ?? "").trim();
  const customerName = String(formData.get("customer_name") ?? "").trim();
  const customerPhone = String(formData.get("customer_phone") ?? "").trim();
  const payMethod = String(formData.get("pay_method") ?? "cash") === "finance" ? "finance" : "cash";
  const listPrice = Number(formData.get("list_price"));
  const discount = Number(formData.get("discount")) || 0;
  const freebieCost = Number(formData.get("freebie_cost")) || 0;
  const financeId = String(formData.get("finance_id") ?? "").trim() || null;
  const downRaw = String(formData.get("down_payment") ?? "").trim();
  const termRaw = String(formData.get("term_months") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const customerId = String(formData.get("customer_id") ?? "").trim() || null;
  // ของแถมส่งมาเป็น id (FAM-1123) — เซิร์ฟเวอร์คิดต้นทุน+ตัดสต๊อกเอง ไม่เชื่อยอดจาก client
  const freebieIds = String(formData.get("freebie_ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!unitId) {
    return { ok: false, error: "เลือกคันรถก่อน" };
  }
  if (!customerName) {
    return { ok: false, error: "กรอกชื่อลูกค้า" };
  }
  const downPayment = payMethod === "finance" && downRaw !== "" ? Number(downRaw) : null;
  const pricing = validateSellPricing({ listPrice, discount, downPayment });
  if (!pricing.ok) {
    return { ok: false, error: pricing.error };
  }
  if (payMethod === "finance" && !financeId) {
    return { ok: false, error: "เลือกบริษัทไฟแนนซ์" };
  }

  const supabase = await createServerSupabase();
  try {
    const res = await sellUnit(supabase, {
      unitId,
      customerName,
      customerPhone,
      payMethod,
      listPrice,
      discount,
      freebieCost,
      downPayment,
      termMonths: payMethod === "finance" && termRaw !== "" ? Number(termRaw) : null,
      financeId: payMethod === "finance" ? financeId : null,
      note,
      customerId,
      freebieIds: freebieIds.length > 0 ? freebieIds : null,
    });
    revalidatePath("/sell");
    revalidatePath("/parts");
    revalidatePath("/stock");
    revalidatePath("/deal");
    return { ok: true, saleId: res.sale_id, docNo: res.doc_no };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "บันทึกการขายไม่สำเร็จ" };
  }
}
