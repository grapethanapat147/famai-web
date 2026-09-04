"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettingsWith } from "@/lib/settings";
import {
  canClosePayroll,
  computePayslip,
  isPeriodStatus,
  monthRange,
  validatePeriodAction,
  type PeriodAction,
  type PeriodStatus,
} from "@/lib/payroll/payroll";

export type PayrollActionResult = { ok: true; message?: string } | { ok: false; error: string };

function readAction(raw: string): PeriodAction | null {
  return raw === "close" || raw === "pay" || raw === "reopen" ? raw : null;
}

/**
 * ปิดงวด / ทำจ่าย / เปิดงวดใหม่ (FAM-1122 · fixlist ข้อ 08)
 *
 * ปิดงวด = คำนวณสลิปฝั่งเซิร์ฟเวอร์ด้วยสูตรเดียวกับหน้าจอ แล้วแช่ผลลงตาราง payslip
 * ตัวเลขไม่ได้มาจากเบราว์เซอร์เลย — client ส่งมาแค่ "เดือนไหน" กับ "จะทำอะไร"
 */
export async function updatePayrollPeriod(formData: FormData): Promise<PayrollActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canClosePayroll(me.roleCodes)) {
    return { ok: false, error: "ปิดงวดได้เฉพาะผู้ดูแล / ผู้บริหาร" };
  }

  const month = String(formData.get("month") ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { ok: false, error: "เดือนไม่ถูกต้อง" };
  }
  const action = readAction(String(formData.get("action") ?? ""));
  if (!action) {
    return { ok: false, error: "คำสั่งไม่ถูกต้อง" };
  }

  const { start, end } = monthRange(month);
  const supabase = await createServerSupabase();

  const { data: existing } = await supabase
    .from("payroll_period")
    .select("id, status")
    .is("branch_id", null)
    .eq("period_start", start)
    .eq("period_end", end)
    .maybeSingle();

  const current: PeriodStatus | null = existing && isPeriodStatus(existing.status) ? existing.status : null;
  const parsed = validatePeriodAction(current, action);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  let periodId = existing?.id ?? null;
  if (!periodId) {
    const { data: created, error: createError } = await supabase
      .from("payroll_period")
      .insert({ branch_id: null, period_start: start, period_end: end, status: parsed.value })
      .select("id")
      .single();
    if (createError || !created) {
      return { ok: false, error: "สร้างงวดไม่สำเร็จ (สิทธิ์ไม่พอ หรือฐานข้อมูลผิดพลาด)" };
    }
    periodId = created.id;
  } else {
    // เขียนแบบมีเงื่อนไข: สถานะต้องยังเป็นค่าเดิม กันสองคนกดพร้อมกัน
    const { data: updated, error: updateError } = await supabase
      .from("payroll_period")
      .update({ status: parsed.value })
      .eq("id", periodId)
      .eq("status", existing!.status)
      .select("id");
    if (updateError || !updated || updated.length === 0) {
      return { ok: false, error: "สถานะงวดเพิ่งถูกเปลี่ยน กรุณาลองใหม่" };
    }
  }

  if (action === "reopen") {
    // เปิดงวดใหม่ = ทิ้งภาพนิ่ง กลับไปคำนวณสด
    await supabase.from("payslip").delete().eq("period_id", periodId);
    revalidatePath("/payroll");
    return { ok: true, message: "เปิดงวดใหม่แล้ว — กลับไปคำนวณสดตามข้อมูลจริง" };
  }

  if (action === "pay") {
    revalidatePath("/payroll");
    return { ok: true, message: "บันทึกว่าจ่ายแล้ว — ยอดล็อกถาวร" };
  }

  const snapshot = await buildSnapshot(supabase, start, end, periodId);
  if (!snapshot.ok) {
    // ปิดงวดไปแล้วแต่แช่ยอดไม่ได้ = อันตรายกว่าไม่ปิด — ย้อนสถานะกลับ
    await supabase.from("payroll_period").update({ status: current ?? "ร่าง" }).eq("id", periodId);
    return snapshot;
  }

  revalidatePath("/payroll");
  return { ok: true, message: `ปิดงวดแล้ว — แช่ยอดสลิป ${snapshot.count} คน` };
}

/** คำนวณสลิปทุกคนของงวดด้วยสูตรเดียวกับหน้าจอ แล้วเขียนลง payslip */
async function buildSnapshot(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  start: string,
  end: string,
  periodId: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const settings = await getSettingsWith(supabase);
  const [empRes, payRes, usersRes, attRes, salesRes] = await Promise.all([
    supabase.from("employee").select("id, user_id, position").is("resigned_at", null),
    supabase.rpc("employee_pay_info"), // เงินเดือนอ่านตรงจากตารางไม่ได้แล้ว (FAM-1145)
    supabase.from("app_user").select("id, full_name"),
    supabase.from("attendance").select("employee_id, ot_minutes").gte("work_date", start).lte("work_date", end),
    supabase.from("sale").select("salesperson_id, gross_profit").is("voided_at", null).gte("sold_at", start).lte("sold_at", end),
  ]);

  const userName = new Map((usersRes.data ?? []).map((u) => [u.id, u.full_name]));
  const otByEmp = new Map<string, number>();
  for (const a of attRes.data ?? []) {
    otByEmp.set(a.employee_id, (otByEmp.get(a.employee_id) ?? 0) + (a.ot_minutes ?? 0));
  }
  const gpByUser = new Map<string, number>();
  for (const s of salesRes.data ?? []) {
    if (s.salesperson_id) {
      gpByUser.set(s.salesperson_id, (gpByUser.get(s.salesperson_id) ?? 0) + Number(s.gross_profit ?? 0));
    }
  }

  const baseById = new Map((payRes.data ?? []).map((p) => [p.id, Number(p.base_salary ?? 0)]));

  const rows = (empRes.data ?? []).map((e) => {
    const otMinutes = otByEmp.get(e.id) ?? 0;
    const commissionBase = e.user_id ? (gpByUser.get(e.user_id) ?? 0) : 0;
    const slip = computePayslip({
      baseSalary: baseById.get(e.id) ?? 0,
      otMinutes,
      commissionBase,
      otRate: settings.ot_rate,
      commissionPct: settings.commission_pct,
      ssnPct: settings.ssn_pct,
      ssnCap: settings.ssn_cap,
    });
    return {
      period_id: periodId,
      employee_id: e.id,
      employee_name: (e.user_id && userName.get(e.user_id)) || "พนักงาน",
      position: e.position ?? null,
      base: slip.base,
      ot_minutes: otMinutes,
      ot_amount: slip.otAmount,
      commission_base: commissionBase,
      commission: slip.commission,
      ssn: slip.ssn,
      net: slip.net,
    };
  });

  // ปิดงวดซ้ำหลังเปิดใหม่ → ล้างของเดิมก่อน (unique period+employee)
  await supabase.from("payslip").delete().eq("period_id", periodId);
  if (rows.length === 0) {
    return { ok: true, count: 0 };
  }
  const { error } = await supabase.from("payslip").insert(rows);
  if (error) {
    return { ok: false, error: "แช่ยอดสลิปไม่สำเร็จ — ยังไม่ปิดงวด (ลองใหม่อีกครั้ง)" };
  }
  return { ok: true, count: rows.length };
}
