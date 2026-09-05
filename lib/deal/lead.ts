/** เพิ่มลูกค้า (ลีด) เพื่อติดตามการขายในอนาคต (ฟังก์ชันบริสุทธิ์ ทดสอบได้) */

import { isLeadStage, type LeadStage } from "@/lib/deal/lead-stage";

/** ช่องทางที่ลูกค้าเข้ามา — ใช้ในดรอปดาวน์ + ตรวจฝั่ง server */
export const LEAD_SOURCES: readonly string[] = ["เดินเข้าร้าน", "โทรเข้า", "Facebook", "LINE", "แนะนำต่อ", "อื่นๆ"];

/** ค่าดิบจากฟอร์มเพิ่มลูกค้า */
export type LeadInput = {
  name: string;
  phone: string;
  interestedVariantId: string;
  interestedColorCode: string;
  source: string;
  note: string;
};

/** ค่าที่ผ่านการตรวจแล้ว (เว้นว่าง = null เพื่อเก็บลง DB) */
export type LeadValid = {
  name: string;
  phone: string | null;
  interestedVariantId: string | null;
  interestedColorCode: string | null;
  source: string | null;
  note: string | null;
};

/** แถวลีดที่โชว์ในลิสต์ (ลูกค้าที่ยังไม่มีการขาย) */
export type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  interestedVariantId: string | null;
  interestedColorCode: string | null;
  /** ข้อความพร้อมแสดง เช่น "FINN ล้อแม็ก · แดง" (ไม่มีสี = ชื่อรุ่นอย่างเดียว) */
  interestedModel: string | null;
  source: string | null;
  stage: LeadStage; // ขั้นก่อนขาย (FAM-1119 · fixlist ข้อ 07)
  createdAt: string; // ISO
};

/** "FINN ล้อแม็ก · แดง" — ถ้าไม่มีสีก็เหลือแค่ชื่อรุ่น ถ้าไม่มีรุ่นเลยคืน null */
function interestedLabel(
  variantId: string | null,
  colorCode: string | null,
  variantName: ReadonlyMap<string, string>,
  colorName: ReadonlyMap<string, string>,
): string | null {
  if (!variantId) {
    return null;
  }
  const model = variantName.get(variantId);
  if (!model) {
    return null;
  }
  const color = colorCode ? colorName.get(`${variantId}|${colorCode}`) : undefined;
  return color ? `${model} · ${color}` : model;
}

function nullIfBlank(raw: string): string | null {
  const v = raw.trim();
  return v === "" ? null : v;
}

/** ตรวจฟอร์มเพิ่มลูกค้า — ต้องมีชื่อ · source ต้องอยู่ในรายการ (ถ้ากรอก) */
export function validateLeadInput(input: LeadInput): { ok: true; value: LeadValid } | { ok: false; error: string } {
  const name = input.name.trim();
  if (name === "") {
    return { ok: false, error: "กรอกชื่อลูกค้า" };
  }
  const source = input.source.trim();
  if (source !== "" && !LEAD_SOURCES.includes(source)) {
    return { ok: false, error: "ช่องทางไม่ถูกต้อง" };
  }
  const variantId = nullIfBlank(input.interestedVariantId);
  const colorCode = nullIfBlank(input.interestedColorCode);
  // สีผูกกับรุ่นเสมอ — เลือกสีโดยไม่เลือกรุ่นแปลว่าฟอร์มหลุด (FK ก็จะไม่ยอมเช่นกัน)
  if (colorCode !== null && variantId === null) {
    return { ok: false, error: "เลือกรุ่นก่อนจึงจะเลือกสีได้" };
  }
  return {
    ok: true,
    value: {
      name,
      phone: nullIfBlank(input.phone),
      interestedVariantId: variantId,
      interestedColorCode: colorCode,
      source: nullIfBlank(source),
      note: nullIfBlank(input.note),
    },
  };
}

/** ลีด = ลูกค้าที่ยังไม่ปรากฏในดีลใด ๆ (ยังไม่ปิดการขาย) เรียงใหม่สุดก่อน */
export function buildLeads(
  customers: ReadonlyArray<{
    id: string;
    full_name: string;
    phone: string | null;
    interested_variant_id: string | null;
    interested_color_code?: string | null;
    source: string | null;
    stage: string;
    created_at: string;
  }>,
  variantName: ReadonlyMap<string, string>,
  dealCustomerIds: ReadonlySet<string>,
  /** ชื่อสี คีย์ "<variantId>|<colorCode>" — ไม่ส่งมาก็แสดงแค่ชื่อรุ่น */
  colorName: ReadonlyMap<string, string> = new Map(),
): LeadRow[] {
  return customers
    .filter((c) => !dealCustomerIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.full_name,
      phone: c.phone,
      interestedVariantId: c.interested_variant_id,
      interestedColorCode: c.interested_color_code ?? null,
      interestedModel: interestedLabel(c.interested_variant_id, c.interested_color_code ?? null, variantName, colorName),
      source: c.source,
      stage: isLeadStage(c.stage) ? c.stage : "เข้ามาดูรถ",
      createdAt: c.created_at,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
