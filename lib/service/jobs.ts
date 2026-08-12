/**
 * โครงข้อมูล + ตัวกรองใบงานซ่อม (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * ยอดชำระ (total) = ค่าแรง + ค่าอะไหล่ (R1: "ค่าแรง → ยอดชำระ")
 */

import { SERVICE_STATUSES, type ServiceStatus } from "@/lib/service/status";

export type ServiceActionResult = { ok: true; message?: string } | { ok: false; error: string };

/** ผู้มีสิทธิ์จัดการใบงานซ่อม (เลื่อนสถานะ) — ตรงกับ roles ของเมนู service */
const SERVICE_ROLES = ["admin", "manager", "tech", "stock"];

export function canManageService(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return SERVICE_ROLES.some((r) => roles.has(r));
}

export type ServiceLine = {
  id: string;
  kind: "labor" | "part";
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type ServiceJob = {
  id: string;
  jobNo: string;
  customerName: string;
  vehicle: string; // รุ่น/สี หรือ เลขเครื่อง (รถนอก)
  engineNo: string;
  odometerKm: number | null;
  serviceType: string; // เช็กระยะ | ซ่อม | เคลม | อื่นๆ
  symptom: string;
  status: ServiceStatus;
  technicianName: string | null;
  checkedInAt: string; // ISO
  laborCost: number;
  partsCost: number;
  total: number;
  lines: ServiceLine[];
};

/** กรองด้วยสถานะ + คำค้น (เลขงาน/ลูกค้า/รถ/เลขเครื่อง) + ตั้งแต่วันที่ (R1: ตัวเลือกวันที่) */
export function filterJobs(
  jobs: readonly ServiceJob[],
  opts: { status?: ServiceStatus | "all"; search?: string; fromDate?: string } = {},
): ServiceJob[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  const from = (opts.fromDate ?? "").trim();
  return jobs.filter((j) => {
    if (opts.status && opts.status !== "all" && j.status !== opts.status) {
      return false;
    }
    if (from && j.checkedInAt.slice(0, 10) < from) {
      return false;
    }
    if (q) {
      const hay = `${j.jobNo} ${j.customerName} ${j.vehicle} ${j.engineNo}`.toLowerCase();
      if (!hay.includes(q)) {
        return false;
      }
    }
    return true;
  });
}

/** นับใบงานตามสถานะ (ครบทุกสถานะ แม้เป็น 0) */
export function statusCounts(jobs: readonly ServiceJob[]): Record<ServiceStatus, number> {
  const counts = Object.fromEntries(SERVICE_STATUSES.map((s) => [s, 0])) as Record<ServiceStatus, number>;
  for (const j of jobs) {
    counts[j.status] += 1;
  }
  return counts;
}

/** จำนวนงานที่ค้างในศูนย์ (ยังไม่ส่งมอบ) — ตัวเลขบนหัวหน้า/เมนู */
export function openJobCount(jobs: readonly ServiceJob[]): number {
  return jobs.reduce((n, j) => n + (j.status === "ส่งมอบแล้ว" ? 0 : 1), 0);
}
