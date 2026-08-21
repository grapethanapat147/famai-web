/** ชนิด + ตัวช่วยสำหรับแคตตาล็อกสาธารณะ (E11 · อ่านจาก pub.model) — pure เพื่อเทสได้ */

export type CatalogColor = { code: string; name: string };
export type CatalogPhoto = { card: string; full: string };
export type Availability = "ready" | "low" | "order";

export type CatalogModel = {
  code: string;
  model: string;
  model_th: string;
  cat: string;
  cc: number | null;
  year: number | null;
  retail: number | null;
  photo: string | null;
  colors: CatalogColor[] | null;
  photos: CatalogPhoto[] | null;
  availability: Availability | string;
};

const AVAIL_META: Record<string, { label: string; variant: "good" | "warn" | "off" }> = {
  ready: { label: "มีจำหน่าย", variant: "good" },
  low: { label: "เหลือน้อย", variant: "warn" },
  order: { label: "สั่งจอง", variant: "off" },
};

export function availabilityMeta(a: string): { label: string; variant: "good" | "warn" | "off" } {
  return AVAIL_META[a] ?? AVAIL_META.order;
}

/** URL รูปปก: ใช้ photo (ถ้าเป็น url แล้ว) ไม่งั้นประกอบจาก path_card ใน bucket model-photo · null = ไม่มีรูป */
export function catalogPhotoUrl(supabaseUrl: string, m: Pick<CatalogModel, "photo" | "photos">): string | null {
  if (m.photo && /^https?:\/\//.test(m.photo)) {
    return m.photo;
  }
  const card = m.photos?.[0]?.card ?? (m.photo && !/^https?:\/\//.test(m.photo) ? m.photo : null);
  if (card) {
    return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/model-photo/${card}`;
  }
  return null;
}
