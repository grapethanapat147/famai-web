"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canApproveExpense, canManageExpense, type ExpenseActionResult } from "@/lib/expense/expenses";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * บันทึกค่าใช้จ่าย — ด่านสิทธิ์ + RLS บริษัท · insert เดียว (ตารางเดียว)
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
    return { ok: false, error: "ไม่พบบริษัทสำหรับบันทึก" };
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

/**
 * อนุมัติค่าใช้จ่าย (FAM-1030 · R1 การเงินกดอนุมัติ) — ด่านสิทธิ์ perms.approve
 * compare-and-swap `approved_at IS NULL` กันอนุมัติซ้ำ/แข่งกัน · บันทึกผู้อนุมัติ + เวลา
 */
export async function approveExpense(formData: FormData): Promise<ExpenseActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canApproveExpense(user.perms)) {
    return { ok: false, error: "ไม่มีสิทธิ์อนุมัติ (ต้องมีสิทธิ์อนุมัติของบัญชี/หัวหน้า)" };
  }

  const expenseId = String(formData.get("expense_id") ?? "").trim();
  if (!expenseId) {
    return { ok: false, error: "ไม่พบรายการ" };
  }

  const supabase = await createServerSupabase();
  const { data: updated, error } = await supabase
    .from("expense")
    .update({ approved_by: user.id, approved_at: new Date().toISOString() })
    .eq("id", expenseId)
    .is("approved_at", null)
    .select("id");
  if (error || !updated || updated.length === 0) {
    return { ok: false, error: "อนุมัติไม่สำเร็จ (อาจถูกอนุมัติไปแล้ว หรือไม่มีสิทธิ์บริษัทนี้)" };
  }

  revalidatePath("/expense");
  return { ok: true };
}

/**
 * ถอนอนุมัติ (FAM-1030) — เผื่อกดผิด · ด่านสิทธิ์ perms.approve · ล้าง approved_by/approved_at
 */
export async function revokeExpenseApproval(formData: FormData): Promise<ExpenseActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canApproveExpense(user.perms)) {
    return { ok: false, error: "ไม่มีสิทธิ์ถอนอนุมัติ" };
  }

  const expenseId = String(formData.get("expense_id") ?? "").trim();
  if (!expenseId) {
    return { ok: false, error: "ไม่พบรายการ" };
  }

  const supabase = await createServerSupabase();
  const { data: updated, error } = await supabase
    .from("expense")
    .update({ approved_by: null, approved_at: null })
    .eq("id", expenseId)
    .not("approved_at", "is", null)
    .select("id");
  if (error || !updated || updated.length === 0) {
    return { ok: false, error: "ถอนอนุมัติไม่สำเร็จ (อาจยังไม่ถูกอนุมัติ)" };
  }

  revalidatePath("/expense");
  return { ok: true };
}
