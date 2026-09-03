import type { TypedSupabaseClient } from "@/lib/supabase/client-type";

/**
 * Wrapper สำหรับฟังก์ชัน/RPC ที่มีอยู่จริงในฐานข้อมูล (supabase/migrations)
 * — ทุกตัวเป็น security definer + ประเมินในสิทธิ์ของผู้เรียก (RLS ยังบังคับ)
 *
 * หมายเหตุ:
 * - ยังไม่มี "sell" RPC ในฐานข้อมูล (บันทึกการขายลง DB ค้างอยู่ — handoff) → จะเพิ่ม migration + wrapper ใน FAM-1011
 * - punch_clock() (ลงเวลา, พารามิเตอร์เยอะ) wrap ในงานฝั่ง HR/attendance (FAM-E09) ไม่ใช่ที่นี่
 */

/** เลขเอกสารกันซ้ำ แยกบริษัท × ประเภท × ปี พ.ศ. → เช่น "FMG-TAXINV-2569-00001" */
export async function nextDocNo(
  client: TypedSupabaseClient,
  branchId: string,
  docType: string,
  yearBE: number,
): Promise<string> {
  const { data, error } = await client.rpc("next_doc_no", {
    p_branch: branchId,
    p_type: docType,
    p_year: yearBE,
  });
  if (error) {
    throw new Error(`next_doc_no ล้มเหลว: ${error.message}`);
  }
  return data;
}

/** id ของบริษัทที่ผู้ใช้ปัจจุบันเข้าถึงได้ (ตาม app_user_branch) */
export async function myBranches(client: TypedSupabaseClient): Promise<string[]> {
  const { data, error } = await client.rpc("my_branches");
  if (error) {
    throw new Error(`my_branches ล้มเหลว: ${error.message}`);
  }
  return data ?? [];
}

/** ผู้ใช้ปัจจุบันมีสิทธิ์เห็นทุกบริษัทหรือไม่ (app_user.all_branch) */
export async function isAllBranch(client: TypedSupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("is_all_branch");
  if (error) {
    throw new Error(`is_all_branch ล้มเหลว: ${error.message}`);
  }
  return Boolean(data);
}

/** ผู้ใช้ปัจจุบันเป็น admin หรือไม่ (มี role code = 'admin') */
export async function isAdmin(client: TypedSupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("is_admin");
  if (error) {
    throw new Error(`is_admin ล้มเหลว: ${error.message}`);
  }
  return Boolean(data);
}

/** ผู้ใช้ปัจจุบันเป็น admin หรือ manager หรือไม่ */
export async function isManager(client: TypedSupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("is_manager");
  if (error) {
    throw new Error(`is_manager ล้มเหลว: ${error.message}`);
  }
  return Boolean(data);
}

export type SellUnitArgs = {
  unitId: string;
  customerName: string;
  customerPhone: string;
  payMethod: "cash" | "finance";
  listPrice: number;
  discount: number;
  freebieCost: number;
  downPayment: number | null;
  termMonths: number | null;
  financeId: string | null;
  note: string | null;
  /** เลือกลูกค้าเดิม (FAM-1110) — null/ไม่ส่ง = สร้างลูกค้าใหม่จากชื่อ/เบอร์ */
  customerId?: string | null;
  /** ของแถมจากตาราง freebie (FAM-1123) — ส่งมาแล้วเซิร์ฟเวอร์คิดต้นทุนเอง + ตัดสต๊อก */
  freebieIds?: string[] | null;
};

export type SellUnitResult = { sale_id: string; doc_no: string | null; customer_id: string };

/**
 * บันทึกการขายแบบ atomic (migration 20 · sell_unit) — สร้างลูกค้า+บิลขาย+ทะเบียน(+สินเชื่อ)+งานติดตาม
 * ต้นทุน/กำไรคิดฝั่ง DB · กันขายซ้ำด้วย row lock + unique index · โยน error ให้ action จับ
 */
export async function sellUnit(client: TypedSupabaseClient, a: SellUnitArgs): Promise<SellUnitResult> {
  const { data, error } = await client.rpc("sell_unit", {
    p_unit_id: a.unitId,
    p_customer_name: a.customerName,
    p_customer_phone: a.customerPhone,
    p_pay_method: a.payMethod,
    p_list_price: a.listPrice,
    p_discount: a.discount,
    p_freebie_cost: a.freebieCost,
    p_down_payment: a.downPayment,
    p_term_months: a.termMonths,
    p_finance_id: a.financeId,
    p_note: a.note,
    p_customer_id: a.customerId ?? null,
    p_freebie_ids: a.freebieIds ?? null,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data as SellUnitResult;
}

/**
 * ปิดใบงานซ่อมแล้วตั้งรอบเช็กระยะถัดไป (FAM-1115 · fixlist ข้อ 02)
 * คืน id ของรอบใหม่ · null = ไม่มีรอบถัดไป (รถนอก / เลยระยะสุดท้ายใน settings service_km)
 */
export async function nextServiceReminder(client: TypedSupabaseClient, jobId: string): Promise<string | null> {
  const { data, error } = await client.rpc("next_service_reminder", { p_job_id: jobId });
  if (error) {
    throw new Error(`next_service_reminder ล้มเหลว: ${error.message}`);
  }
  return data ?? null;
}

export type SellWholesaleResult = { order_id: string; order_no: string; units: number; total: number };

/** บันทึกขายส่ง (FAM-1127) — atomic: หัวบิล + รายคัน + ตัดสต๊อก (+เงินค้างรับถ้าขายเชื่อ) */
export async function sellWholesale(
  client: TypedSupabaseClient,
  a: { companyId: string; lines: { unitId: string; price: number }[]; note: string | null },
): Promise<SellWholesaleResult> {
  const { data, error } = await client.rpc("sell_wholesale", {
    p_company_id: a.companyId,
    p_lines: a.lines.map((l) => ({ unit_id: l.unitId, price: l.price })),
    p_note: a.note,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as SellWholesaleResult;
}

/** ยกเลิกบิลขายส่ง — คืนรถเข้าสต๊อก + ล้างเงินค้างรับที่ยังไม่ได้รับเงิน (FAM-1128) */
export async function voidWholesaleOrder(
  client: TypedSupabaseClient,
  orderId: string,
  reason: string,
): Promise<{ order_no: string; units_restored: number }> {
  const { data, error } = await client.rpc("void_wholesale_order", { p_order_id: orderId, p_reason: reason });
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as { order_no: string; units_restored: number };
}

/** ลงเวลาเข้า — เวลาจากฐานข้อมูล (FAM-1132) · server action ตรวจ geofence/เซลฟี่ก่อน แล้วส่งผลมาแช่ */
export async function punchIn(
  client: TypedSupabaseClient,
  a: {
    lat: number | null;
    lng: number | null;
    distanceM: number | null;
    siteId: string | null;
    siteName: string | null;
    selfiePath: string | null;
    workStart: string;
  },
): Promise<{ check_in: string; late_minutes: number }> {
  const { data, error } = await client.rpc("punch_in", {
    p_lat: a.lat,
    p_lng: a.lng,
    p_distance_m: a.distanceM,
    p_site_id: a.siteId,
    p_site_name: a.siteName,
    p_selfie_path: a.selfiePath,
    p_work_start: a.workStart,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as { check_in: string; late_minutes: number };
}

/** ลงเวลาออก — เวลาจากฐานข้อมูล + คิดชั่วโมงงาน/OT ใน DB (FAM-1132) */
export async function punchOut(
  client: TypedSupabaseClient,
  a: { workEnd: string; otStep?: number },
): Promise<{ check_out: string; work_minutes: number; ot_minutes: number }> {
  const { data, error } = await client.rpc("punch_out", { p_work_end: a.workEnd, p_ot_step: a.otStep ?? 30 });
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as { check_out: string; work_minutes: number; ot_minutes: number };
}
