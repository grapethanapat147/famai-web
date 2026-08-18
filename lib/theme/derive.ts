/** สีเน้น pure — แปลง hex↔hsl แล้ว derive เฉด (กัน UI เละเมื่อผู้ใช้เลือกสีเอง) */

export type AccentSet = { accent: string; hover: string; deep: string; wash: string };

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
