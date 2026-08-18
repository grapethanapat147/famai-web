/** ฟอนต์ธีม pure — คู่ฟอนต์สำเร็จ + ตรวจ path ฟอนต์อัปโหลด (กัน CSS injection) · FAM-1039 */

export type FontPair = {
  id: string;
  name: string;
  note: string;
  /** stack สำหรับ --f-display (หัวข้อ) — อ้างตัวแปร next/font ที่โหลดใน layout */
  display: string;
  /** stack สำหรับ --f-body (เนื้อความ/ตัวเลข) */
  body: string;
};

/** คู่ฟอนต์สำเร็จ — โหลดพร้อมทั้งแอป สลับได้ทันทีไม่ต้องอัปโหลด · id ตัวแรก = ค่าเริ่มต้น (ตรงกับ globals.css) */
export const FONT_PAIRS: readonly FontPair[] = [
  {
    id: "noto-inter",
    name: "โนโต + อินเทอร์ (มาตรฐาน)",
    note: "ค่าเริ่มต้น อ่านง่าย ตัวเลขคมสำหรับตารางเงิน",
    display: "var(--f-thai), 'Noto Sans Thai', system-ui, sans-serif",
    body: "var(--f-inter), var(--f-thai), 'Noto Sans Thai', system-ui, sans-serif",
  },
  {
    id: "trirong-anuphan",
    name: "ไตรรงค์ + อนุพันธ์ (พรีเมียม)",
    note: "หัวข้อมีเซอริฟดูหรู เนื้อความโค้งมนอ่านสบาย",
    display: "var(--f-trirong), 'Trirong', var(--f-thai), serif",
    body: "var(--f-anuphan), var(--f-thai), system-ui, sans-serif",
  },
];

export const DEFAULT_FONT_PAIR = FONT_PAIRS[0].id;

export function findFontPair(id: string): FontPair | undefined {
  return FONT_PAIRS.find((p) => p.id === id);
}

/**
 * path ฟอนต์อัปโหลดต้องปลอดภัยพอจะฝังใน url('...') ของ CSS ที่ฉีดตอน SSR
 * อนุญาตเฉพาะ a-z 0-9 / _ - แล้วปิดท้ายด้วยนามสกุลฟอนต์ · กัน quote, วงเล็บ, ช่องว่าง, path traversal
 */
export function isValidFontPath(path: string): boolean {
  return /^[a-z0-9][a-z0-9/_-]*\.(woff2|ttf|otf)$/i.test(path) && !path.includes("..");
}

/** คำ format() ของ @font-face ตามนามสกุล */
export function fontFormat(path: string): string {
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  if (ext === "ttf") {
    return "truetype";
  }
  if (ext === "otf") {
    return "opentype";
  }
  return "woff2";
}

/** URL สาธารณะของฟอนต์ใน bucket brand-font (public bucket → รูปแบบ path คงที่) */
export function customFontUrl(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/brand-font/${path}`;
}
