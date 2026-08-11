/**
 * แท็บของหน้า "อะไหล่และของแถม" (FAM parts) — สิทธิ์ไม่เท่ากันต่อแท็บ (docs/04 §9h)
 * ด่านจริงอยู่ที่ server (หน้า + action ตรวจซ้ำ) ไม่ใช่แค่การวาดปุ่ม — client แค่สลับ view
 */

export type PartsTab = "stock" | "issue" | "gifts";

export type PartsTabMeta = { key: PartsTab; label: string; roles: readonly string[] };

/** ลำดับคงที่ · roles ตรงตารางใน docs/04 §9h */
export const PARTS_TABS: readonly PartsTabMeta[] = [
  { key: "stock", label: "สต๊อกอะไหล่", roles: ["admin", "manager", "stock", "tech", "acct"] },
  { key: "issue", label: "เบิก/ขายอะไหล่", roles: ["admin", "manager", "stock", "tech"] },
  { key: "gifts", label: "ของแถม", roles: ["admin", "manager", "stock", "sales"] },
];

/** แท็บที่ role ชุดนี้เข้าได้ — เรียงตาม PARTS_TABS */
export function allowedPartsTabs(roleCodes: readonly string[]): PartsTab[] {
  const roles = new Set(roleCodes);
  return PARTS_TABS.filter((t) => t.roles.some((r) => roles.has(r))).map((t) => t.key);
}

/** ผู้ใช้เข้าแท็บนี้ได้ไหม — ใช้เป็นด่านใน server action (กันเรียกตรงข้ามสิทธิ์) */
export function canAccessPartsTab(roleCodes: readonly string[], tab: PartsTab): boolean {
  return allowedPartsTabs(roleCodes).includes(tab);
}

/** ต้องโหลดข้อมูล part ไหม (แท็บ stock หรือ issue อันใดอันหนึ่ง) */
export function needsParts(tabs: readonly PartsTab[]): boolean {
  return tabs.includes("stock") || tabs.includes("issue");
}

/** ต้องโหลดข้อมูล freebie ไหม */
export function needsFreebies(tabs: readonly PartsTab[]): boolean {
  return tabs.includes("gifts");
}
