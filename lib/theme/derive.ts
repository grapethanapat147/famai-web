/** สีเน้น pure — แปลง hex↔hsl แล้ว derive เฉด (กัน UI เละเมื่อผู้ใช้เลือกสีเอง) */

export type AccentSet = { accent: string; hover: string; deep: string; wash: string };

/** พื้นผิวและหมึกที่ย้อมตามสีที่เลือก — ทำให้ "ทั้งเว็บ" เปลี่ยนสี ไม่ใช่แค่ปุ่ม (FAM-1155) */
export type SurfaceSet = {
  paper: string;
  paper2: string;
  card: string;
  ink: string;
  inkSoft: string;
  muted: string;
  hairline: string;
  hairline2: string;
};

/** สีเน้นเริ่มต้น (แดงยามาฮ่า) — แหล่งเดียว ใช้ร่วมทั้ง theme engine */
export const DEFAULT_ACCENT = "#E60012";

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = clamp(s, 0, 100) / 100;
  const lN = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** สีเน้น 1 สี → ชุดเฉด (light หรือ dark) · hsla wash ให้ alpha ต่ำ */
export function deriveAccent(hex: string, mode: "light" | "dark"): AccentSet {
  const safe = isValidHex(hex) ? hex : DEFAULT_ACCENT;
  const [h, s, l] = hexToHsl(safe);
  const hr = Math.round(h);
  const sr = Math.round(s);
  if (mode === "dark") {
    const base = clamp(l + 8, 0, 92);
    return {
      accent: hslToHex(h, s, base),
      hover: hslToHex(h, s, clamp(base + 8, 0, 96)),
      deep: hslToHex(h, s, clamp(base - 10, 0, 100)),
      wash: `hsla(${hr}, ${sr}%, ${Math.round(base)}%, 0.16)`,
    };
  }
  return {
    accent: safe,
    hover: hslToHex(h, s, clamp(l + 9, 0, 96)),
    deep: hslToHex(h, s, clamp(l - 10, 0, 100)),
    wash: `hsla(${hr}, ${sr}%, ${Math.round(l)}%, 0.06)`,
  };
}

/**
 * ย้อมพื้นผิว/หมึกด้วย "เฉดสี" ของสีที่เลือก — FAM-1155
 *
 * กติกาที่ยึด: **คงค่าความสว่าง (L) ของพาเลตต์เดิมไว้ทุกโทเคน** เปลี่ยนแค่ hue กับ saturation ต่ำ ๆ
 * คอนทราสต์ตัวหนังสือกับพื้นจึงแทบไม่ขยับ (คอนทราสต์ถูกกำหนดด้วยความสว่างเป็นหลัก)
 * — ถ้าไปขยับ L ด้วย ตัวหนังสือจะอ่านยากทันทีเมื่อผู้ใช้เลือกสีอ่อนหรือสีเข้มจัด
 *
 * ค่า L ด้านล่างถอดมาจากพาเลตต์กลางเดิมใน globals.css ตรง ๆ (เช่น paper #fafaf8 = L 98%)
 */
export function deriveSurfaces(hex: string, mode: "light" | "dark"): SurfaceSet {
  const safe = isValidHex(hex) ? hex : DEFAULT_ACCENT;
  const [h, accentS] = hexToHsl(safe);
  const hr = Math.round(h);
  /** ความเข้มของการย้อม — คูณกับ saturation ฐานของทุกโทเคน
   *  อยากให้สีจัดขึ้น/จางลงทั้งระบบ แก้ตัวเลขนี้ตัวเดียว (เทสต์คอนทราสต์จะฟ้องถ้าแรงเกินจนอ่านไม่ออก) */
  const TINT = 2.4;
  /** สีที่เลือกจืด (เช่น "กราไฟต์" เทาเกือบดำ) ต้องได้เว็บสีเทา ไม่ใช่เว็บสีฟ้า
   *  จึงลดความเข้มตามความอิ่มตัวของสีต้นทาง — เต็มที่เมื่อสีอิ่มตัว 55% ขึ้นไป */
  const strength = TINT * Math.min(1, accentS / 55);
  const mix = (s: number, l: number) => hslToHex(hr, clamp(s * strength, 0, 100), l);

  if (mode === "dark") {
    return {
      paper: mix(14, 6.5),
      paper2: mix(12, 10),
      card: mix(11, 12.5),
      ink: mix(10, 94),
      inkSoft: mix(9, 74),
      muted: mix(6, 58),
      hairline: `hsla(${hr}, ${Math.round(clamp(45 * Math.min(1, accentS / 55), 0, 100))}%, 86%, 0.14)`,
      hairline2: `hsla(${hr}, ${Math.round(clamp(45 * Math.min(1, accentS / 55), 0, 100))}%, 86%, 0.07)`,
    };
  }
  return {
    paper: mix(24, 97),
    paper2: mix(20, 93.5),
    card: mix(30, 99.2),
    ink: mix(14, 10),
    inkSoft: mix(11, 25),
    // เดิม #8b8f98 (L 57%) คอนทราสต์บนขาวอยู่ที่ ~3.18 เฉียดเกณฑ์ 3:1 อยู่แล้ว
    // พอย้อมสีบางเฉด (เขียว) จะหล่นต่ำกว่าเกณฑ์ จึงเข้มขึ้นอีกนิดให้ผ่านทุกสี
    muted: mix(7, 52),
    hairline: `hsla(${hr}, ${Math.round(clamp(40 * Math.min(1, accentS / 55), 0, 100))}%, 12%, 0.16)`,
    hairline2: `hsla(${hr}, ${Math.round(clamp(40 * Math.min(1, accentS / 55), 0, 100))}%, 12%, 0.08)`,
  };
}

/** โทเคน CSS ของชุดพื้นผิว (ใช้ทั้งฝั่ง server และ client ให้ได้สตริงเดียวกันเป๊ะ) */
export function surfaceVars(s: SurfaceSet): string {
  return (
    `--paper:${s.paper};--paper-2:${s.paper2};--card:${s.card};` +
    `--ink:${s.ink};--ink-soft:${s.inkSoft};--muted:${s.muted};` +
    `--hairline:${s.hairline};--hairline-2:${s.hairline2};`
  );
}

/** โทเคน CSS ของชุดสีเน้น */
export function accentVars(a: AccentSet): string {
  return `--accent:${a.accent};--accent-hover:${a.hover};--accent-deep:${a.deep};--accent-wash:${a.wash};`;
}
