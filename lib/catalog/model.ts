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

/** URL ของไฟล์ใน bucket model-photo · ถ้า path เป็น http(s) อยู่แล้วคืนตามเดิม */
export function modelPhotoUrl(supabaseUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/model-photo/${path}`;
}

/** URL รูปปก: ใช้ photo (ถ้าเป็น url แล้ว) ไม่งั้นประกอบจาก path_card ใน bucket model-photo · null = ไม่มีรูป */
export function catalogPhotoUrl(supabaseUrl: string, m: Pick<CatalogModel, "photo" | "photos">): string | null {
  const card = m.photos?.[0]?.card ?? m.photo ?? null;
  return card ? modelPhotoUrl(supabaseUrl, card) : null;
}

/** รูปทั้งหมดสำหรับแกลเลอรีหน้ารายละเอียด (thumb=card, full=full) · ไม่มีรูป → [] */
export function galleryImages(
  supabaseUrl: string,
  m: Pick<CatalogModel, "photo" | "photos">,
): Array<{ thumb: string; full: string }> {
  if (m.photos && m.photos.length > 0) {
    return m.photos.map((p) => ({ thumb: modelPhotoUrl(supabaseUrl, p.card), full: modelPhotoUrl(supabaseUrl, p.full) }));
  }
  const cover = catalogPhotoUrl(supabaseUrl, m);
  return cover ? [{ thumb: cover, full: cover }] : [];
}
