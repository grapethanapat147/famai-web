/**
 * เมทาดาทาของแต่ละค่าตั้งค่า + parse/format (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * ใช้เป็น "แหล่งเดียว" ในการตรวจค่า ทั้งฝั่ง client (feedback สด) และ server (บังคับจริง)
 */

import type { AppSettings } from "@/lib/settings/resolve";

export type SettingsActionResult = { ok: true; message?: string } | { ok: false; error: string };

export type SettingKind = "number" | "percent" | "int-list" | "bool" | "time";

export type SettingField = {
  key: keyof AppSettings;
  label: string;
  group: string;
  kind: SettingKind;
  unit?: string;
  help?: string;
};

export const SETTING_GROUPS = ["สต๊อก", "ขายและการเงิน", "ลูกค้าและบริการ", "พนักงานและเงินเดือน"] as const;

export const SETTING_FIELDS: readonly SettingField[] = [
  { key: "aging_days", label: "รถค้างสต๊อก (เตือนเมื่อเกิน)", group: "สต๊อก", kind: "number", unit: "วัน" },
  { key: "aging_buckets", label: "ช่วงอายุสต๊อก", group: "สต๊อก", kind: "int-list", unit: "วัน", help: "เช่น 30, 60, 90" },
  { key: "low_stock", label: "แจ้งของใกล้หมดเมื่อเหลือ", group: "สต๊อก", kind: "number", unit: "คัน/ชิ้น" },
  { key: "reg_days", label: "กำหนดจดทะเบียนภายใน", group: "สต๊อก", kind: "number", unit: "วัน" },

  { key: "vat_pct", label: "ภาษีมูลค่าเพิ่ม", group: "ขายและการเงิน", kind: "percent" },
  { key: "finance_terms", label: "จำนวนงวดผ่อน", group: "ขายและการเงิน", kind: "int-list", unit: "งวด", help: "เช่น 12, 24, 36, 48" },
  { key: "ar_due_days", label: "ไฟแนนซ์ต้องโอนภายใน", group: "ขายและการเงิน", kind: "number", unit: "วัน", help: "ใช้ตั้งวันครบกำหนดของเงินค้างรับตอนขายเงินผ่อน" },
  { key: "freebie_is_cost", label: "นับของแถมเป็นต้นทุน (หักจากกำไร)", group: "ขายและการเงิน", kind: "bool" },

  { key: "follow_up_cadence", label: "รอบติดตามลูกค้า", group: "ลูกค้าและบริการ", kind: "int-list", unit: "วัน", help: "เช่น 7, 30, 90" },
  { key: "service_km", label: "ระยะเช็กระยะ", group: "ลูกค้าและบริการ", kind: "int-list", unit: "กม.", help: "เช่น 500, 1000, 4000, 8000" },
  { key: "service_first_days", label: "นัดเช็กระยะภายใน", group: "ลูกค้าและบริการ", kind: "number", unit: "วัน", help: "นับจากวันขาย / วันปิดใบงานซ่อมรอบก่อน" },

  { key: "work_start", label: "เวลาเข้างาน", group: "พนักงานและเงินเดือน", kind: "time" },
  { key: "work_end", label: "เวลาเลิกงาน", group: "พนักงานและเงินเดือน", kind: "time" },
  { key: "ot_rate", label: "อัตรา OT", group: "พนักงานและเงินเดือน", kind: "number", unit: "เท่า" },
  { key: "ssn_pct", label: "ประกันสังคม", group: "พนักงานและเงินเดือน", kind: "percent" },
  { key: "ssn_cap", label: "เพดานประกันสังคม", group: "พนักงานและเงินเดือน", kind: "number", unit: "บาท" },
  { key: "commission_pct", label: "คอมมิชชั่นเริ่มต้น", group: "พนักงานและเงินเดือน", kind: "percent" },
];

export type SettingValue = number | number[] | boolean | string;

/** ค่าที่เก็บ → ข้อความสำหรับช่องกรอก (bool ไม่ผ่านตรงนี้ ใช้ checkbox) */
export function formatForInput(kind: SettingKind, value: SettingValue): string {
  if (kind === "int-list" && Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** ข้อความจากช่องกรอก → ค่าที่ตรวจแล้ว (แหล่งตรวจเดียว client+server) */
export function parseInput(kind: SettingKind, raw: string): { ok: true; value: SettingValue } | { ok: false; error: string } {
  const s = raw.trim();
  switch (kind) {
    case "bool":
      if (s === "true") return { ok: true, value: true };
      if (s === "false") return { ok: true, value: false };
      return { ok: false, error: "ค่าไม่ถูกต้อง" };

    case "time":
      return TIME_RE.test(s) ? { ok: true, value: s } : { ok: false, error: "รูปแบบเวลาต้องเป็น HH:MM" };

    case "int-list": {
      const parts = s
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      if (parts.length === 0) {
        return { ok: false, error: "ต้องมีอย่างน้อย 1 ค่า" };
      }
      const nums: number[] = [];
      for (const p of parts) {
        const n = Number(p);
        if (!Number.isInteger(n) || n <= 0) {
          return { ok: false, error: "ต้องเป็นจำนวนเต็มบวก คั่นด้วยจุลภาค" };
        }
        nums.push(n);
      }
      const unique = [...new Set(nums)].sort((a, b) => a - b);
      return { ok: true, value: unique };
    }

    case "percent":
    case "number": {
      if (s === "") {
        return { ok: false, error: "กรอกตัวเลข" };
      }
      const n = Number(s);
      if (!Number.isFinite(n) || n < 0) {
        return { ok: false, error: "ต้องเป็นตัวเลข ≥ 0" };
      }
      if (kind === "percent" && n > 100) {
        return { ok: false, error: "เปอร์เซ็นต์ต้องไม่เกิน 100" };
      }
      return { ok: true, value: n };
    }
  }
}
