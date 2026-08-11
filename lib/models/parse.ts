/**
 * แปลงช่องกรอกสีของฟอร์มเพิ่มรุ่น (FAM-1009) → รายการสี
 * รับได้ทั้ง "รหัส:ชื่อ" (เช่น "010A:ดำ") หรือชื่อล้วน (เช่น "ดำ") ทีละบรรทัด/คอมมา
 * ตัดค่าว่าง, ตัดช่องซ้ำรหัส (รหัสแรกชนะ) — รหัสว่างจะ fallback เป็นชื่อ (สลัก/uppercase)
 */

export type ParsedColor = { code: string; name: string };

export function parseColors(input: string): ParsedColor[] {
  const parts = input
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const seen = new Set<string>();
  const out: ParsedColor[] = [];

  for (const part of parts) {
    const idx = part.indexOf(":");
    let code: string;
    let name: string;
    if (idx >= 0) {
      code = part.slice(0, idx).trim();
      name = part.slice(idx + 1).trim();
    } else {
      code = "";
      name = part;
    }
    if (name.length === 0) {
      continue;
    }
    if (code.length === 0) {
      code = name.toUpperCase().replace(/\s+/g, "-");
    }
    if (seen.has(code)) {
      continue;
    }
    seen.add(code);
    out.push({ code, name });
  }

  return out;
}
