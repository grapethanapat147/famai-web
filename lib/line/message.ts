/** ประกอบข้อความแจ้งเตือน LINE (pure เพื่อเทสได้ · E10) */
import type { DashUnit } from "@/lib/dashboard/stats";
import type { OverdueReg } from "@/lib/automation/registration";
import type { RemRow } from "@/lib/automation/service";

const MAX_LINES = 10;

/** สรุปรถค้างสต๊อกเป็นข้อความ LINE · null = ไม่มีรถค้าง (ไม่ต้องส่ง) */
export function agedStockDigest(aged: DashUnit[], agingDays: number, dateLabel: string): string | null {
  if (aged.length === 0) {
    return null;
  }
  const lines = aged.slice(0, MAX_LINES).map((u) => `• ${u.model ?? "ไม่ระบุรุ่น"} · ${u.branchName} · ${u.ageDays} วัน`);
  const more = aged.length > MAX_LINES ? `\n…และอีก ${aged.length - MAX_LINES} คัน` : "";
  return `🔴 รถค้างสต๊อกเกิน ${agingDays} วัน — ${aged.length} คัน (ณ ${dateLabel})\n${lines.join("\n")}${more}`;
}

/** สรุปทะเบียนเกินกำหนดเป็นข้อความ LINE · null = ไม่มีที่เกิน (ไม่ต้องส่ง) */
export function registrationOverdueDigest(overdue: OverdueReg[], dateLabel: string): string | null {
  if (overdue.length === 0) {
    return null;
  }
  const lines = overdue
    .slice(0, MAX_LINES)
    .map((r) => `• ${r.customerName}${r.model ? ` · ${r.model}` : ""} · ${r.branchName} · เกิน ${r.daysOverdue} วัน (${r.stage})`);
  const more = overdue.length > MAX_LINES ? `\n…และอีก ${overdue.length - MAX_LINES} ราย` : "";
  return `🟠 ทะเบียนเกินกำหนด — ${overdue.length} ราย (ณ ${dateLabel})\n${lines.join("\n")}${more}`;
}

/** สรุปลูกค้าที่ถึงกำหนดเช็กระยะเป็นข้อความ LINE · null = ไม่มี (ไม่ต้องส่ง) */
export function serviceReminderDigest(due: RemRow[], dateLabel: string): string | null {
  if (due.length === 0) {
    return null;
  }
  const lines = due
    .slice(0, MAX_LINES)
    .map(
      (r) =>
        `• ${r.customerName}${r.model ? ` · ${r.model}` : ""} · เช็กระยะ ${r.targetKm.toLocaleString("en-US")} กม.${r.dueDate ? ` · ครบ ${r.dueDate}` : ""}`,
    );
  const more = due.length > MAX_LINES ? `\n…และอีก ${due.length - MAX_LINES} ราย` : "";
  return `🔧 ถึงกำหนดเช็กระยะ — ${due.length} ราย (ณ ${dateLabel})\n${lines.join("\n")}${more}`;
}
