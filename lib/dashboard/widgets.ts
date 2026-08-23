/**
 * ปรับแต่งการ์ด Dashboard (FAM-1096) — เลือกแสดง/ซ่อน + สลับตำแหน่ง (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * แถบสรุปด้านบน (มูลค่าสต๊อก/ยอดขาย) เป็น KPI หลัก แสดงเสมอ — ปรับได้เฉพาะ 3 การ์ดนี้
 */

export type WidgetKey = "watch" | "aging" | "oldest";

export const ALL_WIDGET_KEYS: readonly WidgetKey[] = ["watch", "aging", "oldest"];

export const WIDGET_LABEL: Record<WidgetKey, string> = {
  watch: "ต้องจับตา",
  aging: "ช่วงอายุสต๊อก",
  oldest: "รถค้างนานสุด",
};

export type WidgetConfig = { key: WidgetKey; visible: boolean };

export const DEFAULT_WIDGETS: WidgetConfig[] = ALL_WIDGET_KEYS.map((key) => ({ key, visible: true }));

export function isWidgetKey(v: unknown): v is WidgetKey {
  return typeof v === "string" && (ALL_WIDGET_KEYS as readonly string[]).includes(v);
}

/**
 * รวมค่าที่บันทึกไว้กับรายการทั้งหมด — คงลำดับ/การมองเห็นที่ผู้ใช้ตั้ง · ทิ้งคีย์แปลกปลอม/ซ้ำ ·
 * เติมการ์ดใหม่ (ที่ยังไม่เคยเห็น) ต่อท้ายแบบแสดงไว้ → รองรับการเพิ่มการ์ดในอนาคตไม่พัง
 */
export function normalizeWidgets(saved: unknown): WidgetConfig[] {
  const savedArr = Array.isArray(saved) ? saved : [];
  const result: WidgetConfig[] = [];
  const seen = new Set<WidgetKey>();
  for (const item of savedArr) {
    const key = item && typeof item === "object" ? (item as { key?: unknown }).key : null;
    if (isWidgetKey(key) && !seen.has(key)) {
      const visible = (item as { visible?: unknown }).visible !== false;
      result.push({ key, visible });
      seen.add(key);
    }
  }
  for (const key of ALL_WIDGET_KEYS) {
    if (!seen.has(key)) {
      result.push({ key, visible: true });
    }
  }
  return result;
}

/** สลับตำแหน่งการ์ดขึ้น/ลง (นอกช่วง = คืนเดิม) */
export function moveWidget(config: readonly WidgetConfig[], key: WidgetKey, dir: -1 | 1): WidgetConfig[] {
  const i = config.findIndex((w) => w.key === key);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= config.length) {
    return [...config];
  }
  const next = [...config];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** สลับแสดง/ซ่อนการ์ด */
export function toggleWidget(config: readonly WidgetConfig[], key: WidgetKey): WidgetConfig[] {
  return config.map((w) => (w.key === key ? { ...w, visible: !w.visible } : w));
}
