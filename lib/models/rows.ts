/**
 * รวมข้อมูลรุ่นรถจากหลายตาราง → แถวเดียวสำหรับหน้า /models (FAM-1009)
 * ทั้งหมดเป็นฟังก์ชันบริสุทธิ์ (ทดสอบได้) — ต้นทุนถูกตัดฝั่งเซิร์ฟเวอร์ก่อนถึงตรงนี้
 */

export type AddModelResult = { ok: true; message?: string } | { ok: false; error: string };

/** ค่าดิบจากฟอร์มแก้ไขรุ่น (ตัวเลขเป็น string จาก FormData) — รหัสรุ่น/สี ไม่แก้ที่นี่ */
export type ModelEditInput = {
  modelName: string;
  modelTh: string;
  category: string;
  cc: string;
  year: string;
  cost: string;
  retail: string;
};

export type ModelEditValid = {
  modelName: string;
  modelTh: string | null;
  category: string | null;
  cc: number | null;
  year: number | null;
  cost: number;
  retail: number;
};

/** ตรวจฟอร์มแก้ไขรุ่น — ชื่อบังคับ · ราคาขาย > 0 · ต้นทุน/cc/ปี ถ้ากรอกต้องเป็นตัวเลข */
export function validateModelEdit(input: ModelEditInput): { ok: true; value: ModelEditValid } | { ok: false; error: string } {
  const modelName = input.modelName.trim();
  if (modelName === "") {
    return { ok: false, error: "กรอกชื่อรุ่น" };
  }
  const retail = Number(input.retail);
  if (!Number.isFinite(retail) || retail <= 0) {
    return { ok: false, error: "ราคาขายไม่ถูกต้อง" };
  }
  const cost = input.cost.trim() === "" ? 0 : Number(input.cost);
  if (!Number.isFinite(cost) || cost < 0) {
    return { ok: false, error: "ต้นทุนไม่ถูกต้อง" };
  }
  const cc = input.cc.trim() === "" ? null : Number(input.cc);
  const year = input.year.trim() === "" ? null : Number(input.year);
  if ((cc !== null && !Number.isFinite(cc)) || (year !== null && !Number.isFinite(year))) {
    return { ok: false, error: "ค่า cc / ปี ไม่ถูกต้อง" };
  }
  return {
    ok: true,
    value: {
      modelName,
      modelTh: input.modelTh.trim() || null,
      category: input.category.trim() || null,
      cc,
      year,
      cost,
      retail,
    },
  };
}

export type ModelColorRef = { code: string; name: string };

/** บรรทัดสเปกย่อของรุ่น เช่น "Automatic · 155 cc · ปี 2569" (ว่างทั้งหมด → "—") — ใช้ทั้งการ์ดและตาราง */
export function modelSpecLine(m: { category: string | null; cc: number | null; year: number | null }): string {
  return [m.category, m.cc != null ? `${m.cc} cc` : null, m.year ? `ปี ${m.year}` : null].filter(Boolean).join(" · ") || "—";
}

export type ModelRow = {
  id: string;
  code: string;
  modelName: string;
  modelTh: string | null;
  category: string | null;
  cc: number | null;
  year: number | null;
  colors: ModelColorRef[];
  cost: number | null; // อาจถูกตัดออก (money-strip) → null
  retail: number | null;
  stockCount: number; // จำนวนคัน status = available ในบริษัทที่เห็นได้
  photoPath: string | null; // path_card ใน bucket 'model-photo' (public)
};

type VariantInput = {
  id: string;
  code: string;
  model_name: string;
  model_th: string | null;
  category: string | null;
  cc: number | null;
  model_year: number | null;
};

type ColorInput = { variant_id: string; color_code: string; color_name: string };
type PriceInput = { variant_id: string; effective_from: string; cost?: number | null; retail: number | null };
type PhotoInput = { variant_id: string; path_card: string; sort: number };

/** ราคาใหม่สุดของรุ่น (effective_from มากสุด) — เทียบสตริง ISO date เรียงตามพจนานุกรมได้ */
export function latestPrice<T extends { effective_from: string }>(prices: readonly T[]): T | null {
  let best: T | null = null;
  for (const p of prices) {
    if (!best || p.effective_from > best.effective_from) {
      best = p;
    }
  }
  return best;
}

/**
 * ประกอบ ModelRow[] — join ในแอป (Relationships ว่างใน curated types)
 * เรียงตามชื่อรุ่นแล้วรหัส เพื่อผลลัพธ์คงที่
 */
export function buildModelRows(
  variants: readonly VariantInput[],
  colors: readonly ColorInput[],
  prices: readonly PriceInput[],
  photos: readonly PhotoInput[] = [],
  unitCounts: ReadonlyMap<string, number> = new Map(),
): ModelRow[] {
  const colorsByVariant = new Map<string, ModelColorRef[]>();
  for (const c of colors) {
    const list = colorsByVariant.get(c.variant_id) ?? [];
    list.push({ code: c.color_code, name: c.color_name });
    colorsByVariant.set(c.variant_id, list);
  }

  const pricesByVariant = new Map<string, PriceInput[]>();
  for (const p of prices) {
    const list = pricesByVariant.get(p.variant_id) ?? [];
    list.push(p);
    pricesByVariant.set(p.variant_id, list);
  }

  // รูปแรก (sort น้อยสุด) เป็น thumbnail
  const photoByVariant = new Map<string, PhotoInput>();
  for (const ph of photos) {
    const cur = photoByVariant.get(ph.variant_id);
    if (!cur || ph.sort < cur.sort) {
      photoByVariant.set(ph.variant_id, ph);
    }
  }

  const rows: ModelRow[] = variants.map((v) => {
    const price = latestPrice(pricesByVariant.get(v.id) ?? []);
    const cost = price && price.cost != null ? Number(price.cost) : null;
    return {
      id: v.id,
      code: v.code,
      modelName: v.model_name,
      modelTh: v.model_th,
      category: v.category,
      cc: v.cc != null ? Number(v.cc) : null,
      year: v.model_year,
      colors: (colorsByVariant.get(v.id) ?? []).slice().sort((a, b) => a.code.localeCompare(b.code)),
      cost,
      retail: price && price.retail != null ? Number(price.retail) : null,
      stockCount: unitCounts.get(v.id) ?? 0,
      photoPath: photoByVariant.get(v.id)?.path_card ?? null,
    };
  });

  return rows.sort((a, b) => a.modelName.localeCompare(b.modelName, "th") || a.code.localeCompare(b.code));
}
