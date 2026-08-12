/**
 * สถานะใบงานซ่อม + สเตตแมชชีนการเลื่อนสถานะ (docs/04: สถานะเป็นตัวบอก + ปุ่ม "ไป: … →")
 * ไม่ใช่คัมบัง — เลื่อนได้เฉพาะทิศที่อนุญาต (ด่านจริงตรวจซ้ำใน server action)
 */

export type ServiceStatus = "รับเข้า" | "กำลังซ่อม" | "รออะไหล่" | "เสร็จ" | "ส่งมอบแล้ว";

/** ลำดับสำหรับแสดงผล/นับ */
export const SERVICE_STATUSES: readonly ServiceStatus[] = [
  "รับเข้า",
  "กำลังซ่อม",
  "รออะไหล่",
  "เสร็จ",
  "ส่งมอบแล้ว",
];

/** ทางเดินที่อนุญาต — รออะไหล่เป็นสถานะข้าง (กลับไปซ่อมต่อหรือจบก็ได้) */
const TRANSITIONS: Record<ServiceStatus, readonly ServiceStatus[]> = {
  รับเข้า: ["กำลังซ่อม"],
  กำลังซ่อม: ["รออะไหล่", "เสร็จ"],
  รออะไหล่: ["กำลังซ่อม", "เสร็จ"],
  เสร็จ: ["ส่งมอบแล้ว"],
  ส่งมอบแล้ว: [],
};

export function isServiceStatus(value: string): value is ServiceStatus {
  return (SERVICE_STATUSES as readonly string[]).includes(value);
}

/** สถานะถัดไปที่กดเลื่อนได้ */
export function nextStatuses(status: ServiceStatus): ServiceStatus[] {
  return [...TRANSITIONS[status]];
}

/** เลื่อนจาก → ไป ได้ไหม */
export function canTransition(from: ServiceStatus, to: ServiceStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** จบงานแล้ว (ไม่มีสถานะถัดไป) */
export function isTerminal(status: ServiceStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export type BadgeVariant = "good" | "warn" | "bad" | "info" | "off";

/** จุดสีบนป้ายสถานะ — แยกด้วยตาเปล่าได้ (docs/04 §7) */
export function statusVariant(status: ServiceStatus): BadgeVariant {
  switch (status) {
    case "รับเข้า":
      return "info";
    case "กำลังซ่อม":
      return "warn";
    case "รออะไหล่":
      return "bad";
    case "เสร็จ":
      return "good";
    case "ส่งมอบแล้ว":
      return "off";
  }
}
