/**
 * เหตุการณ์บนปฏิทิน (ฟังก์ชันบริสุทธิ์ ทดสอบได้) — รวมจาก 4 แหล่ง
 */

const DAY = 86_400_000;

export type CalEventType = "company" | "leave" | "reg" | "service";

export type BadgeVariant = "good" | "warn" | "bad" | "info" | "off";

export const EVENT_META: Record<CalEventType, { label: string; variant: BadgeVariant; dot: string }> = {
  company: { label: "บริษัท", variant: "info", dot: "bg-ink-soft" },
  leave: { label: "ลา", variant: "warn", dot: "bg-attn" },
  reg: { label: "จดทะเบียน", variant: "good", dot: "bg-pos" },
  service: { label: "เช็กระยะ", variant: "bad", dot: "bg-accent" },
};

export const EVENT_ORDER: readonly CalEventType[] = ["company", "leave", "reg", "service"];

export type CalEvent = { date: string; type: CalEventType; title: string; subtitle: string | null };

function isoUTC(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function parse(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** แตกช่วงวันลาเป็นวันย่อย (คลุมได้ด้วย [clampStart, clampEnd] เพื่อจำกัดในเดือน) */
export function expandLeave(from: string, to: string, clampStart = "", clampEnd = ""): string[] {
  let a = parse(from);
  let b = parse(to);
  if (a == null || b == null || b < a) {
    return [];
  }
  const cs = parse(clampStart);
  const ce = parse(clampEnd);
  if (cs != null) {
    a = Math.max(a, cs);
  }
  if (ce != null) {
    b = Math.min(b, ce);
  }
  const out: string[] = [];
  for (let cur = a; cur <= b; cur += DAY) {
    out.push(isoUTC(cur));
  }
  return out;
}

/** จัดกลุ่มเหตุการณ์ตามวัน */
export function eventsByDay(events: readonly CalEvent[]): Map<string, CalEvent[]> {
  const map = new Map<string, CalEvent[]>();
  for (const e of events) {
    const key = e.date.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(e);
    map.set(key, list);
  }
  return map;
}

export function filterByType(events: readonly CalEvent[], type: CalEventType | "all"): CalEvent[] {
  return type === "all" ? [...events] : events.filter((e) => e.type === type);
}

/** นับตามประเภท (ครบทุกประเภท แม้ 0) */
export function countsByType(events: readonly CalEvent[]): Record<CalEventType, number> {
  const counts = Object.fromEntries(EVENT_ORDER.map((t) => [t, 0])) as Record<CalEventType, number>;
  for (const e of events) {
    counts[e.type] += 1;
  }
  return counts;
}
