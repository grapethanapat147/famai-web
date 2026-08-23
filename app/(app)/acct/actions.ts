"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettingsWith } from "@/lib/settings";
import { amountBreakdown, canManageAccount, type AcctActionResult } from "@/lib/acct/documents";

/** ปี พ.ศ. ของวันนี้ (เขตเวลาไทย) */
function beYear(): number {
  return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric" }).format(new Date())) + 543;
}
function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/**
 * ออกใบเสร็จรับเงิน (FAM-1102) — สร้าง document (RECEIPT) จากการขาย พร้อมเลขรัน + snapshot ผู้ขาย/ผู้ซื้อ
 * หัวใช้ข้อมูลบริษัท (branch) · แช่ ณ วันออก (เอกสารไม่เปลี่ยนตามข้อมูลปัจจุบัน) · ด่านสิทธิ์บัญชี
 */
export async function issueReceipt(formData: FormData): Promise<AcctActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageAccount(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์ออกเอกสารบัญชี" };
  }

  const saleId = String(formData.get("sale_id") ?? "").trim();
  if (!saleId) {
    return { ok: false, error: "เลือกการขายก่อน" };
  }

  const supabase = await createServerSupabase();

  const { data: sale } = await supabase
    .from("sale")
    .select("id, branch_id, customer_id, net_price, sold_at, voided_at")
    .eq("id", saleId)
    .maybeSingle();
  if (!sale || sale.voided_at) {
    return { ok: false, error: "ไม่พบการขาย (หรือถูกยกเลิก)" };
  }

  // กันออกซ้ำ
  const { data: existing } = await supabase
    .from("document")
    .select("doc_no")
    .eq("sale_id", saleId)
    .eq("doc_type", "RECEIPT")
    .maybeSingle();
  if (existing) {
    return { ok: false, error: `ออกใบเสร็จของการขายนี้ไปแล้ว (${existing.doc_no})` };
  }

  const [{ data: customer }, { data: branch }] = await Promise.all([
    sale.customer_id
      ? supabase.from("customer").select("full_name, address, tax_id, phone").eq("id", sale.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("branch").select("name, address, tax_id, phone, code").eq("id", sale.branch_id).maybeSingle(),
  ]);

  const { data: docNo, error: noError } = await supabase.rpc("next_doc_no", {
    p_branch: sale.branch_id,
    p_type: "RECEIPT",
    p_year: beYear(),
  });
  if (noError || !docNo) {
    return { ok: false, error: "ออกเลขเอกสารไม่สำเร็จ" };
  }

  const settings = await getSettingsWith(supabase);
  const amt = amountBreakdown(Number(sale.net_price), settings.vat_pct);

  const { error } = await supabase.from("document").insert({
    branch_id: sale.branch_id,
    doc_type: "RECEIPT",
    doc_no: docNo,
    doc_date: todayISO(),
    sale_id: saleId,
    customer_id: sale.customer_id,
    amount_base: amt.base,
    amount_vat: amt.vat,
    amount_total: amt.total,
    seller_snapshot: {
      name: branch?.name ?? "บริษัท",
      address: branch?.address ?? null,
      taxId: branch?.tax_id ?? null,
      phone: branch?.phone ?? null,
    },
    buyer_snapshot: {
      name: customer?.full_name ?? "ลูกค้า",
      address: customer?.address ?? null,
      taxId: customer?.tax_id ?? null,
      phone: customer?.phone ?? null,
    },
  });
  if (error) {
    return { ok: false, error: "บันทึกใบเสร็จไม่สำเร็จ (สิทธิ์บริษัท?)" };
  }

  revalidatePath("/acct");
  return { ok: true, docNo };
}
