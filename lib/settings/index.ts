import "server-only";

/**
 * อ่านค่าเกณฑ์ธุรกิจจากตาราง `app_setting` (jsonb) แทนการ hardcode — spec §7
 * Implementation จริง (typed + cache + jsonb parsing) อยู่ใน FAM-1004
 */
export async function getSetting(key: string): Promise<never> {
  throw new Error(`getSetting(${key}) ยังไม่ implement — ดู FAM-1004 (Data Layer & Security Wiring)`);
}
