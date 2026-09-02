/**
 * Pure settings logic (ไม่มี server-only / ไม่แตะ DB) — เทสต์ได้ตรง ๆ
 * คีย์และค่าเริ่มต้นตรงกับที่ seed ไว้จริงใน supabase/migrations/...08_seed_reference_data.sql
 * (คีย์เป็น snake_case, ค่าเก็บเป็น jsonb → PostgREST parse มาเป็น number/array/boolean/string แล้ว)
 */

export type AppSettings = {
  aging_days: number;
  aging_buckets: number[];
  low_stock: number;
  reg_days: number;
  follow_up_cadence: number[];
  service_km: number[];
  service_first_days: number;
  vat_pct: number;
  finance_terms: number[];
  ar_due_days: number;
  freebie_is_cost: boolean;
  work_start: string;
  work_end: string;
  ot_rate: number;
  ssn_pct: number;
  ssn_cap: number;
  commission_pct: number;
};

/** ค่าเริ่มต้น = ค่าที่ seed จริง (migration 08) ใช้เป็น fallback เมื่ออ่านไม่เจอ */
export const SETTING_DEFAULTS: AppSettings = {
  aging_days: 90,
  aging_buckets: [30, 60, 90],
  low_stock: 2,
  reg_days: 30,
  follow_up_cadence: [7, 30, 90, 365, 1095],
  service_km: [500, 1000, 4000, 8000],
  service_first_days: 30,
  vat_pct: 7,
  finance_terms: [12, 18, 24, 30, 36, 42, 48],
  ar_due_days: 30,
  freebie_is_cost: true,
  work_start: "08:30",
  work_end: "17:30",
  ot_rate: 1.5,
  ssn_pct: 5,
  ssn_cap: 750,
  commission_pct: 8,
};

/**
 * รวมแถวจาก app_setting ทับค่า default
 * - คีย์ที่ไม่รู้จัก → ข้าม (คง default)
 * - value = null/undefined → ข้าม
 */
export function resolveSettings(rows: ReadonlyArray<{ key: string; value: unknown }>): AppSettings {
  const out: AppSettings = { ...SETTING_DEFAULTS };
  for (const { key, value } of rows) {
    if (key in out && value !== null && value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}
