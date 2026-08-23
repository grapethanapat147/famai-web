"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageAr, PAYMENT_METHODS, type ArActionResult } from "@/lib/ar/receivables";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * ลงรับเงิน (ตัดยอดค้างรับ) — ด่านสิทธิ์ + กันรับเกินยอด + compare-and-swap กันบันทึกซ้ำ/แข่งกัน
 * เขียน ledger (receipt_payment) และ denormalized amount_paid ให้ตรงกัน (revert ถ้า ledger ล้ม)
 */
export async function recordPayment(formData: FormData): Promise<ArActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageAr(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ลงรับเงิน" };
  }

  const receivableId = String(formData.get("receivable_id") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const methodRaw = String(formData.get("method") ?? "").trim();
  const refNo = String(formData.get("ref_no") ?? "").trim();
  const paidAt = String(formData.get("paid_at") ?? "").trim() || todayISO();

  if (!receivableId) {
    return { ok: false, error: "ไม่พบรายการค้างรับ" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "จำนวนเงินไม่ถูกต้อง" };
  }
  const method = (PAYMENT_METHODS as readonly string[]).includes(methodRaw) ? methodRaw : "เงินสด";

  const supabase = await createServerSupabase();

  const { data: rec, error: readError } = await supabase
    .from("receivable")
    .select("id, amount_due, amount_paid, settled_at")
    .eq("id", receivableId)
    .maybeSingle();
  if (readError || !rec) {
    return { ok: false, error: "ไม่พบรายการค้างรับ (หรือไม่มีสิทธิ์บริษัทนี้)" };
  }
  if (rec.settled_at) {
    return { ok: false, error: "รายการนี้ปิดยอดแล้ว" };
  }

  const balance = Number(rec.amount_due) - Number(rec.amount_paid);
  if (amount > balance + 0.001) {
    return { ok: false, error: `รับเกินยอดค้าง — คงเหลือ ${balance.toLocaleString("en-US")}` };
  }

  const newPaid = Number(rec.amount_paid) + amount;
  const settled = newPaid >= Number(rec.amount_due) - 0.001;

  const { data: updated, error: casError } = await supabase
    .from("receivable")
    .update({ amount_paid: newPaid, settled_at: settled ? paidAt : null })
    .eq("id", receivableId)
    .eq("amount_paid", rec.amount_paid)
    .select("id");
  if (casError || !updated || updated.length === 0) {
    return { ok: false, error: "ยอดเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  const { error: ledgerError } = await supabase.from("receipt_payment").insert({
    receivable_id: receivableId,
    paid_at: paidAt,
    amount,
    method,
    ref_no: refNo || null,
    by_user: user.id,
  });
  if (ledgerError) {
    // revert amount_paid ให้ตรงกับ ledger ที่บันทึกไม่ได้
    await supabase
      .from("receivable")
      .update({ amount_paid: rec.amount_paid, settled_at: null })
      .eq("id", receivableId)
      .eq("amount_paid", newPaid);
    return { ok: false, error: "บันทึกการรับเงินไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/ar");
  return { ok: true };
}
