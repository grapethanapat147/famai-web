import type { StatusVariant } from "@/components/ui/StatusBadge";

export type StockStatus = "available" | "reserved" | "in_transfer" | "sold" | "returned";

export type StockUnit = {
  id: string;
  modelCode: string;
  modelName: string;
  colorCode: string;
  colorName: string;
  engineNo: string;
  frameNo: string;
  status: StockStatus;
  receivedAt: string;
  ageDays: number;
  branchCode: string;
  branchName: string;
  photoUrl: string | null;
  cost?: number | null; // อาจถูก strip เมื่อไม่มีสิทธิ์ money
  retail: number | null;
};

export const STATUS_META: Record<StockStatus, { label: string; variant: StatusVariant }> = {
  available: { label: "พร้อมขาย", variant: "good" },
  reserved: { label: "จองแล้ว", variant: "info" },
  in_transfer: { label: "กำลังโอนย้าย", variant: "warn" },
  sold: { label: "ขายแล้ว", variant: "off" },
  returned: { label: "คืน", variant: "off" },
};

export const STATUS_FILTER_ORDER: StockStatus[] = ["available", "reserved", "in_transfer", "sold"];

/** อายุสต๊อก (วัน) — tz-safe: คิดจากส่วนวันที่ ไม่ผ่าน Date parse ของ ISO (handoff §7) */
export function computeAgeDays(receivedISO: string, todayISO: string): number {
  const r = /^(\d{4})-(\d{2})-(\d{2})/.exec(receivedISO);
  const t = /^(\d{4})-(\d{2})-(\d{2})/.exec(todayISO);
  if (!r || !t) return 0;
  const recv = Date.UTC(Number(r[1]), Number(r[2]) - 1, Number(r[3]));
  const today = Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]));
  return Math.max(0, Math.round((today - recv) / 86_400_000));
}

/** สีอายุ: ≤⅓ เกณฑ์ เขียว · ≤เกณฑ์ ส้ม · เกิน แดง (docs/04 §7) */
export function agingVariant(ageDays: number, agingDays: number): StatusVariant {
  if (ageDays <= agingDays / 3) return "good";
  if (ageDays <= agingDays) return "warn";
  return "bad";
}

export type StockFilters = { branch: string; model: string; status: string; search: string };

export function filterUnits(units: StockUnit[], f: StockFilters): StockUnit[] {
  const q = f.search.trim().toLowerCase();
  return units.filter(
    (u) =>
      (f.branch === "all" || u.branchCode === f.branch) &&
      (f.model === "all" || u.modelCode === f.model) &&
      (f.status === "all" || u.status === f.status) &&
      (q === "" ||
        u.engineNo.toLowerCase().includes(q) ||
        u.frameNo.toLowerCase().includes(q) ||
        u.modelName.toLowerCase().includes(q) ||
        u.modelCode.toLowerCase().includes(q)),
  );
}
