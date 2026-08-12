"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageExpense, type ExpenseActionResult } from "@/lib/expense/expenses";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * บันทึกค่าใช้จ่าย — ด่านสิทธิ์ + RLS สาขา · insert เดียว (ตารางเดียว)
 * vendor = "ซื้อกับใคร" (R1) · has_receipt=false = ธงใบเสร็จหาย
 */
export async function recordExpense(formData: FormData): Promise<ExpenseActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageExpense(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์บันทึกค่าใช้จ่าย" };
  }

  const categoryId = String(formData.get("category_id") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const vendor = String(formData.get("vendor") ?? "").trim();
  const taxInvoiceNo = String(formData.get("tax_invoice_no") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const hasReceipt = String(formData.get("has_receipt") ?? "true") === "true";
  const spentAt = String(formData.get("spent_at") ?? "").trim() || todayISO();

  if (!categoryId) {
    return { ok: false, error: "เลือกหมวดค่าใช้จ่าย" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "จำนวนเงินไม่ถูกต้อง" };
  }

  const supabase = await createServerSupabase();

  let branchId = user.branchIds[0];
  if (!branchId) {
    const { data: anyBranch } = await supabase.from("branch").select("id").limit(1).maybeSingle();
    branchId = anyBranch?.id ?? "";
  }
  if (!branchId) {
    return { ok: false, error: "ไม่พบสาขาสำหรับบันทึก" };
  }

  const { error } = await supabase.from("expense").insert({
    branch_id: branchId,
    category_id: categoryId,
    spent_at: spentAt,
    amount,
    vendor: vendor || null,
    tax_invoice_no: taxInvoiceNo || null,
    has_receipt: hasReceipt,
    note: note || null,
    created_by: user.id,
  });
  if (error) {
    return { ok: false, error: "บันทึกไม่สำเร็จ (สิทธิ์ไม่พอ หรือหมวดไม่ถูกต้อง)" };
  }

  revalidatePath("/expense");
  return { ok: true };
}
