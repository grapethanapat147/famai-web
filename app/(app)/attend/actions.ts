"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettingsWith } from "@/lib/settings";
import { lateMinutes, workMinutes } from "@/lib/hr/time";
import { bangkokTimestamp, canEditAttendance, validateAttendanceEdit } from "@/lib/attend/attendance";
import type { HrActionResult } from "@/lib/hr/leave";

/**
 * แก้เวลาเข้า/ออกย้อนหลัง (FAM-1101 P4) — HR/ผู้บริหารแก้ความผิดพลาด
 * คำนวณสาย/ชั่วโมงงาน/สถานะใหม่จากเวลาที่กรอก · upsert (ไม่มีแถว = สร้างให้) · ด่านสิทธิ์ attend
 */
export async function editAttendance(formData: FormData): Promise<HrActionResult> {
  const me = await getCurrentUser();
  if (!me) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canEditAttendance(me.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้เวลาเข้างาน (เฉพาะผู้บริหาร/HR)" };
  }

  const employeeId = String(formData.get("employee_id") ?? "").trim();
  const workDate = String(formData.get("work_date") ?? "").trim();
  const parsed = validateAttendanceEdit({
    workDate,
    checkIn: String(formData.get("check_in") ?? ""),
    checkOut: String(formData.get("check_out") ?? ""),
  });
  if (!employeeId) {
    return { ok: false, error: "ไม่พบพนักงาน" };
  }
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const supabase = await createServerSupabase();
  const settings = await getSettingsWith(supabase);
  const late = lateMinutes(parsed.value.checkIn, settings.work_start);
  const checkInIso = bangkokTimestamp(workDate, parsed.value.checkIn);
  const checkOutIso = parsed.value.checkOut ? bangkokTimestamp(workDate, parsed.value.checkOut) : null;
  const workMin = parsed.value.checkOut ? workMinutes(parsed.value.checkIn, parsed.value.checkOut) : null;

  const { error } = await supabase.from("attendance").upsert(
    {
      employee_id: employeeId,
      work_date: workDate,
      check_in: checkInIso,
      check_out: checkOutIso,
      status: late > 0 ? "สาย" : "ปกติ",
      late_minutes: late,
      work_minutes: workMin,
    },
    { onConflict: "employee_id,work_date" },
  );
  if (error) {
    return { ok: false, error: "บันทึกเวลาไม่สำเร็จ — คุณอาจไม่มีสิทธิ์ในบริษัทนี้ ให้ผู้ดูแลตรวจสิทธิ์ที่หน้า บัญชีผู้ใช้" };
  }

  revalidatePath("/attend");
  return { ok: true, message: "แก้เวลาแล้ว" };
}
