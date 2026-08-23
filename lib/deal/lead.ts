/** เพิ่มลูกค้า (ลีด) เพื่อติดตามการขายในอนาคต (ฟังก์ชันบริสุทธิ์ ทดสอบได้) */

/** ช่องทางที่ลูกค้าเข้ามา — ใช้ในดรอปดาวน์ + ตรวจฝั่ง server */
export const LEAD_SOURCES: readonly string[] = ["เดินเข้าร้าน", "โทรเข้า", "Facebook", "LINE", "แนะนำต่อ", "อื่นๆ"];

/** ค่าดิบจากฟอร์มเพิ่มลูกค้า */
export type LeadInput = {
  name: string;
  phone: string;
  interestedVariantId: string;
  source: string;
  note: string;
};

/** ค่าที่ผ่านการตรวจแล้ว (เว้นว่าง = null เพื่อเก็บลง DB) */
export type LeadValid = {
  name: string;
  phone: string | null;
  interestedVariantId: string | null;
  source: string | null;
  note: string | null;
};

/** แถวลีดที่โชว์ในลิสต์ (ลูกค้าที่ยังไม่มีการขาย) */
export type LeadRow = {
  id: string;
  name: string;
  phone: string | null;
  interestedVariantId: string | null;
  interestedModel: string | null;
  source: string | null;
  createdAt: string; // ISO
};

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
  return {
    ok: true,
    value: {
      name,
      phone: nullIfBlank(input.phone),
      interestedVariantId: nullIfBlank(input.interestedVariantId),
      source: nullIfBlank(source),
      note: nullIfBlank(input.note),
    },
  };
}

/** ลีด = ลูกค้าที่ยังไม่ปรากฏในดีลใด ๆ (ยังไม่ปิดการขาย) เรียงใหม่สุดก่อน */
export function buildLeads(
  customers: ReadonlyArray<{ id: string; full_name: string; phone: string | null; interested_variant_id: string | null; source: string | null; created_at: string }>,
  variantName: ReadonlyMap<string, string>,
  dealCustomerIds: ReadonlySet<string>,
): LeadRow[] {
  return customers
    .filter((c) => !dealCustomerIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.full_name,
      phone: c.phone,
      interestedVariantId: c.interested_variant_id,
      interestedModel: c.interested_variant_id ? variantName.get(c.interested_variant_id) ?? null : null,
      source: c.source,
      createdAt: c.created_at,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}
