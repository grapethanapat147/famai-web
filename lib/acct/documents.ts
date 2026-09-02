/** เอกสารบัญชี — ใบเสร็จรับเงิน / ใบกำกับภาษี (ฟังก์ชันบริสุทธิ์ ทดสอบได้) */

export type AcctActionResult = { ok: true; docNo?: string; message?: string } | { ok: false; error: string };

export type DocType = "RECEIPT" | "TAXINV";

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  RECEIPT: "ใบเสร็จรับเงิน",
  TAXINV: "ใบกำกับภาษี",
};

export function docTypeLabel(t: string): string {
  return t in DOC_TYPE_LABEL ? DOC_TYPE_LABEL[t as DocType] : t;
}

/** หัวเอกสาร/ผู้ซื้อ ที่แช่ไว้ตอนออก (snapshot) — เอกสารต้องไม่เปลี่ยนตามข้อมูลปัจจุบัน */
export type PartySnapshot = {
  name: string;
  address: string | null;
  taxId: string | null;
  phone: string | null;
};

/**
 * รายการรถบนเอกสาร — แช่ไว้ใน `buyer_snapshot.item` (ตาราง document ไม่มีคอลัมน์ item แยก)
 * เก็บใน snapshot เพื่อให้ **แก้ไขได้** ต่อเอกสาร โดยไม่กระทบข้อมูลการขาย/สต็อกจริง (FAM-1102 P2)
 */
export type DocItem = {
  vehicle: string;
  frameNo: string;
  engineNo: string;
};

/** อ่าน item ที่แช่ใน buyer_snapshot (เอกสารรุ่นเก่าที่ไม่มี → null เพื่อ fallback ไปดึงจาก sale) */
export function parseDocItem(buyerSnapshot: unknown): DocItem | null {
  const s = (buyerSnapshot ?? {}) as Record<string, unknown>;
  const item = s.item;
  if (!item || typeof item !== "object") {
    return null;
  }
  const it = item as Record<string, unknown>;
  return {
    vehicle: typeof it.vehicle === "string" ? it.vehicle : "",
    frameNo: typeof it.frameNo === "string" ? it.frameNo : "",
    engineNo: typeof it.engineNo === "string" ? it.engineNo : "",
  };
}

/** แถวเอกสารในลิสต์หน้าบัญชี */
export type DocRow = {
  id: string;
  docType: string;
  docNo: string;
  date: string; // ISO
  customerName: string;
  total: number;
  voided: boolean;
};

/** การขายที่ออกใบเสร็จได้ (โชว์ในตัวเลือก "ออกใบเสร็จ") */
export type IssuableSale = {
  saleId: string;
  customerName: string;
  vehicle: string;
  netPrice: number;
  soldAt: string; // ISO
  hasReceipt: boolean; // ออกใบเสร็จไปแล้วหรือยัง
};

/** เอกสารเต็มใบ (ลิสต์ + พิมพ์) — snapshot ผู้ขาย/ผู้ซื้อ + รถ (ดึงจาก sale ตอนโหลด) */
export type DocDetail = {
  id: string;
  docType: string;
  docNo: string;
  date: string; // ISO
  seller: PartySnapshot;
  buyer: PartySnapshot;
  base: number;
  vat: number;
  total: number;
  vehicle: string;
  engineNo: string;
  frameNo: string;
  voided: boolean;
  part: DocPart; // ส่วนของการขาย (FAM-1126) — เอกสารเก่าเป็น full
  publicToken: string | null; // รหัสให้ลูกค้าเช็กสถานะเองที่ /status (FAM-1117)
};

/** ผู้มีสิทธิ์งานบัญชี (ออก/ดูเอกสาร) — ตรงกับเมนู acct */
const ACCT_ROLES = ["admin", "manager", "acct"];
export function canManageAccount(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return ACCT_ROLES.some((r) => roles.has(r));
}

/**
 * แยกมูลค่าก่อน VAT + VAT จากยอดรวม (ยอดรวม VAT อยู่แล้ว) — ปัดเป็นสตางค์
 * base = total / (1 + vat%) · vat = total − base
 */
export function amountBreakdown(total: number, vatPct: number): { base: number; vat: number; total: number } {
  if (vatPct <= 0) {
    return { base: total, vat: 0, total };
  }
  const base = Math.round((total / (1 + vatPct / 100)) * 100) / 100;
  return { base, vat: Math.round((total - base) * 100) / 100, total };
}

// ── จำนวนเงินเป็นตัวอักษร (ไทย) — ใบกำกับภาษีต้องมีบรรทัด "ตัวอักษร" ────────────────

const TH_DIGIT = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const TH_PLACE = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

/** อ่านเลขกลุ่มไม่เกิน 6 หลักเป็นคำไทย (จัดการ เอ็ด/ยี่สิบ/สิบ) — precededByHigher: มีหลักสูงกว่าในกลุ่มก่อนหน้า (เช่น ล้าน) */
function readGroup6(s: string, precededByHigher = false): string {
  const digits = s.split("").map(Number);
  const len = digits.length;
  const hasHigher = precededByHigher || digits.slice(0, len - 1).some((d) => d > 0);
  let out = "";
  for (let i = 0; i < len; i++) {
    const d = digits[i];
    const place = len - i - 1;
    if (d === 0) {
      continue;
    }
    if (place === 0 && d === 1 && hasHigher) {
      out += "เอ็ด";
    } else if (place === 1 && d === 2) {
      out += "ยี่สิบ";
    } else if (place === 1 && d === 1) {
      out += "สิบ";
    } else {
      out += TH_DIGIT[d] + TH_PLACE[place];
    }
  }
  return out;
}

/** อ่านจำนวนเต็มเป็นคำไทย — แบ่งกลุ่มละ 6 หลักด้วย "ล้าน" */
function readInteger(intStr: string): string {
  const n = intStr.replace(/^0+/, "");
  if (n === "") {
    return "ศูนย์";
  }
  if (n.length > 6) {
    return readInteger(n.slice(0, n.length - 6)) + "ล้าน" + readGroup6(n.slice(n.length - 6), true);
  }
  return readGroup6(n);
}

/**
 * แปลงจำนวนเงินเป็นข้อความภาษาไทย เช่น 107500 → "หนึ่งแสนเจ็ดพันห้าร้อยบาทถ้วน"
 * ปัดเป็นสตางค์ · ค่าติดลบ/ไม่ใช่ตัวเลข → ว่าง
 */
export function bahtText(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    return "";
  }
  const cents = Math.round(amount * 100);
  const baht = Math.floor(cents / 100);
  const satang = cents % 100;
  const bahtWords = readInteger(String(baht));
  if (satang === 0) {
    return `${bahtWords}บาทถ้วน`;
  }
  return `${bahtWords}บาท${readGroup6(String(satang))}สตางค์`;
}

// ── แก้ไขเอกสาร (ทุกช่อง ยกเว้นเลข) — FAM-1102 P2 ─────────────────────────────────

/** ค่าดิบจากฟอร์มแก้ไขเอกสาร (ตัวเลขเป็น string) — เลขที่/ประเภทเอกสารแก้ไม่ได้ */
export type DocEditInput = {
  sellerName: string;
  sellerAddress: string;
  sellerTaxId: string;
  sellerPhone: string;
  buyerName: string;
  buyerAddress: string;
  buyerTaxId: string;
  buyerPhone: string;
  vehicle: string;
  frameNo: string;
  engineNo: string;
  base: string;
  vat: string;
  docDate: string;
};

export type DocEditValid = {
  seller: PartySnapshot;
  buyer: PartySnapshot;
  item: DocItem;
  base: number;
  vat: number;
  total: number;
  docDate: string;
};

function blankToNull(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

/** ตรวจฟอร์มแก้ไขเอกสาร — ชื่อผู้ขาย/ผู้ซื้อบังคับ · มูลค่า/VAT เป็นเลข ≥ 0 · วันที่ ISO */
export function validateDocEdit(input: DocEditInput): { ok: true; value: DocEditValid } | { ok: false; error: string } {
  const sellerName = input.sellerName.trim();
  if (sellerName === "") {
    return { ok: false, error: "กรอกชื่อผู้ขาย" };
  }
  const buyerName = input.buyerName.trim();
  if (buyerName === "") {
    return { ok: false, error: "กรอกชื่อผู้ซื้อ" };
  }
  const base = Number(input.base);
  if (!Number.isFinite(base) || base < 0) {
    return { ok: false, error: "มูลค่าก่อนภาษีไม่ถูกต้อง" };
  }
  const vat = Number(input.vat);
  if (!Number.isFinite(vat) || vat < 0) {
    return { ok: false, error: "ภาษีมูลค่าเพิ่มไม่ถูกต้อง" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.docDate)) {
    return { ok: false, error: "วันที่ไม่ถูกต้อง" };
  }
  const round2 = (n: number): number => Math.round(n * 100) / 100;
  return {
    ok: true,
    value: {
      seller: { name: sellerName, address: blankToNull(input.sellerAddress), taxId: blankToNull(input.sellerTaxId), phone: blankToNull(input.sellerPhone) },
      buyer: { name: buyerName, address: blankToNull(input.buyerAddress), taxId: blankToNull(input.buyerTaxId), phone: blankToNull(input.buyerPhone) },
      item: { vehicle: input.vehicle.trim(), frameNo: input.frameNo.trim(), engineNo: input.engineNo.trim() },
      base: round2(base),
      vat: round2(vat),
      total: round2(base + vat),
      docDate: input.docDate,
    },
  };
}

// ── ขายเงินผ่อน: แยกเอกสาร 3 ใบ (FAM-1126 · fixlist ข้อ 11) ──────────────────────

/**
 * ส่วนของเอกสารเทียบกับการขาย
 * - `full`     เงินสด/ของเดิม — ใบเดียวยอดเต็ม
 * - `down`     เงินดาวน์ (ผู้ซื้อ = ลูกค้า)
 * - `financed` ยอดจัดไฟแนนซ์ (ผู้ซื้อ = บริษัทไฟแนนซ์)
 */
export type DocPart = "full" | "down" | "financed";

export const DOC_PART_LABEL: Record<DocPart, string> = {
  full: "ยอดเต็ม",
  down: "เงินดาวน์",
  financed: "ยอดจัดไฟแนนซ์",
};

export function isDocPart(v: string): v is DocPart {
  return v === "full" || v === "down" || v === "financed";
}

export function docPartLabel(v: string | null): string {
  return v && isDocPart(v) ? DOC_PART_LABEL[v] : DOC_PART_LABEL.full;
}

export type SaleSplit = {
  down: { base: number; vat: number; total: number };
  financed: { base: number; vat: number; total: number };
};

/**
 * แยกยอดขายเงินผ่อนเป็น "เงินดาวน์" + "ยอดจัด"
 *
 * ยอดจัดคิดแบบ **ส่วนที่เหลือ** (ยอดเต็ม − เงินดาวน์) ทั้งฐานภาษีและ VAT
 * ไม่ได้คิดแยกอิสระ — เพื่อให้สองใบบวกกันได้ยอดเต็มพอดีทุกบาททุกสตางค์
 * (ถ้าคิดแยกกันแล้วปัดเศษคนละที ผลรวมจะเพี้ยนไป 1 สตางค์ ซึ่งสรรพากรไม่ยอม)
 *
 * เงินดาวน์เกินยอดเต็ม/ติดลบ → บีบให้อยู่ในช่วง 0..ยอดเต็ม
 */
export function splitFinanceSale(netPrice: number, downPayment: number, vatPct: number): SaleSplit {
  const full = amountBreakdown(netPrice, vatPct);
  const downTotal = Math.min(Math.max(downPayment, 0), netPrice);
  const down = amountBreakdown(downTotal, vatPct);
  return {
    down,
    financed: {
      base: Math.round((full.base - down.base) * 100) / 100,
      vat: Math.round((full.vat - down.vat) * 100) / 100,
      total: Math.round((full.total - down.total) * 100) / 100,
    },
  };
}

/** ขายเงินผ่อนที่มีเงินดาวน์ > 0 เท่านั้นที่ต้องแยก 3 ใบ */
export function needsThreeDocs(payMethod: string, downPayment: number | null): boolean {
  return payMethod === "finance" && (downPayment ?? 0) > 0;
}
