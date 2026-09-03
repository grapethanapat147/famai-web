/**
 * นโยบายรหัสผ่านฝั่งแอป — FAM-1136
 *
 * ทำไมต้องมี: Supabase "Leaked Password Protection" (เทียบกับฐาน HaveIBeenPwned)
 * ใช้ได้เฉพาะแพ็ก Pro ขึ้นไป — โปรเจกต์นี้ยังอยู่แพ็กฟรี จึงบังคับกฎขั้นต่ำเองที่แอปแทน
 * ไม่ได้แทนที่ HIBP ได้ทั้งหมด (ไม่รู้จักรหัสที่รั่วจริงทั้งฐาน) แต่กันรหัสที่เดาง่ายที่สุดออกไปได้
 *
 * เมื่ออัปเกรด Pro แล้วให้เปิด Leaked Password Protection ด้วย — ใช้ควบคู่กันได้ ไม่ชนกัน
 */

export const MIN_PASSWORD_LENGTH = 10;

/** รหัสที่พบบ่อยที่สุด + รูปแบบที่คนไทยตั้งบ่อย — เทียบแบบตัดตัวเลขท้ายออกด้วย */
const COMMON = new Set([
  "password", "passw0rd", "p@ssword", "p@ssw0rd", "welcome", "letmein", "iloveyou",
  "qwerty", "qwertyui", "asdfgh", "asdfghjk", "zxcvbn", "zxcvbnm", "qazwsx",
  "abc", "abcd", "abcde", "abcdef", "abcdefg", "test", "admin", "administrator",
  "root", "user", "guest", "login", "changeme", "secret", "master", "dragon", "monkey",
  "sunshine", "princess", "football", "baseball", "superman", "trustno",
  "thailand", "bangkok", "sawasdee", "sawaddee", "famai", "yamaha", "motor",
]);

/** ตัวเลข/สัญลักษณ์ท้ายรหัส เช่น "password123!" → "password" */
function core(lower: string): string {
  return lower.replace(/[^a-z]+$/g, "");
}

/** ตัวเดียวซ้ำทั้งเส้น เช่น "aaaaaaaaaa" */
function isRepeated(s: string): boolean {
  return s.length > 0 && new Set(s).size === 1;
}

/** เรียงต่อกันบนคีย์บอร์ด/ตัวเลข เช่น "123456789" "abcdefghij" (รวมเรียงถอยหลัง) */
function isSequential(s: string): boolean {
  if (s.length < 4) {
    return false;
  }
  const step = (a: string, b: string) => b.charCodeAt(0) - a.charCodeAt(0);
  const first = step(s[0], s[1]);
  if (first !== 1 && first !== -1) {
    return false;
  }
  for (let i = 1; i < s.length - 1; i += 1) {
    if (step(s[i], s[i + 1]) !== first) {
      return false;
    }
  }
  return true;
}

export type PasswordContext = {
  email?: string;
  username?: string;
  fullName?: string;
};

/** ชิ้นส่วนข้อมูลส่วนตัวที่ไม่ควรอยู่ในรหัสผ่าน (ยาวพอที่จะมีความหมาย) */
function personalParts(ctx: PasswordContext): string[] {
  const raw = [ctx.username ?? "", (ctx.email ?? "").split("@")[0], ...(ctx.fullName ?? "").split(/\s+/)];
  return raw
    .map((s) => s.toLowerCase().trim())
    .filter((s) => s.length >= 4);
}

/**
 * ตรวจรหัสผ่าน — คืนข้อความบอกเหตุผลที่คนอ่านแล้วแก้ได้ทันที ไม่ใช่ "รหัสผ่านไม่ปลอดภัย" ลอย ๆ
 * ใช้ทั้งฝั่ง client (บอกสดขณะพิมพ์) และ server (ด่านจริง)
 */
export function checkPassword(password: string, ctx: PasswordContext = {}): { ok: true } | { ok: false; error: string } {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัว` };
  }
  if (/\s/.test(password)) {
    return { ok: false, error: "รหัสผ่านห้ามมีช่องว่าง" };
  }

  const lower = password.toLowerCase();
  if (isRepeated(lower)) {
    return { ok: false, error: "รหัสผ่านเป็นตัวอักษรเดียวซ้ำกันทั้งหมด — เดาง่ายเกินไป" };
  }
  if (isSequential(lower)) {
    return { ok: false, error: "รหัสผ่านเรียงต่อกัน (เช่น 12345678 / abcdefgh) — เดาง่ายเกินไป" };
  }
  for (const part of personalParts(ctx)) {
    if (lower.includes(part)) {
      return { ok: false, error: `รหัสผ่านห้ามมีชื่อหรืออีเมลของผู้ใช้ ("${part}") อยู่ข้างใน` };
    }
  }
  if (COMMON.has(lower) || COMMON.has(core(lower))) {
    return { ok: false, error: "รหัสผ่านนี้ติดอันดับรหัสที่คนใช้บ่อยที่สุด — เปลี่ยนเป็นอย่างอื่น" };
  }

  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (kinds < 3) {
    return { ok: false, error: "ต้องผสมอย่างน้อย 3 แบบจาก: พิมพ์เล็ก · พิมพ์ใหญ่ · ตัวเลข · สัญลักษณ์" };
  }

  return { ok: true };
}

/** ข้อความบอกกฎไว้ใต้ช่องกรอก (ให้รู้ก่อนพิมพ์ ไม่ใช่รู้ตอนโดนปฏิเสธ) */
export const PASSWORD_RULE_HINT = `อย่างน้อย ${MIN_PASSWORD_LENGTH} ตัว · ผสม 3 แบบจาก พิมพ์เล็ก/พิมพ์ใหญ่/ตัวเลข/สัญลักษณ์ · ห้ามใช้ชื่อหรืออีเมลของผู้ใช้`;

const LOWER = "abcdefghijkmnopqrstuvwxyz"; // ตัด l ออก (สับสนกับ 1)
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // ตัด I, O ออก
const DIGIT = "23456789"; // ตัด 0, 1 ออก
const SYMBOL = "!@#$%*?";

function pick(pool: string, n: number, rand: () => number): string[] {
  return Array.from({ length: n }, () => pool[Math.floor(rand() * pool.length)]);
}

/**
 * สุ่มรหัสผ่านชั่วคราวที่ **ผ่านนโยบายเสมอ** — มีครบทั้ง 4 แบบ ยาวเกินขั้นต่ำ
 * ตัดอักขระที่อ่านผิดง่าย (l/1/I/O/0) ออก เพราะต้องอ่านให้พนักงานฟังทางโทรศัพท์
 */
export function randomPassword(length = 14, rand: () => number = Math.random): string {
  const size = Math.max(MIN_PASSWORD_LENGTH + 2, length);
  const required = [...pick(LOWER, 1, rand), ...pick(UPPER, 1, rand), ...pick(DIGIT, 1, rand), ...pick(SYMBOL, 1, rand)];
  const rest = pick(LOWER + UPPER + DIGIT + SYMBOL, size - required.length, rand);
  const all = [...required, ...rest];
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.join("");
}
