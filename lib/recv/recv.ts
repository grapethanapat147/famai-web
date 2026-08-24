/** ตรรกะสิทธิ์/ตรวจสอบ/ประกอบข้อมูล สำหรับรับรถเข้าสต๊อกทีละคัน (ฟังก์ชันบริสุทธิ์ ทดสอบได้) */

export type RecvActionResult = { ok: true; engineNo: string; unitId?: string | null } | { ok: false; error: string };

/** ตัวเลือกในฟอร์ม (เตรียมจาก DB ฝั่ง server) */
export type RecvColor = { code: string; name: string };
export type RecvVariant = { id: string; code: string; modelName: string; modelTh: string | null; colors: RecvColor[] };
export type RecvBranch = { id: string; code: string; name: string };

/** ข้อมูลดิบจากฟอร์มที่จะตรวจ (ตัวเลขเป็น string เพราะมาจาก FormData) */
export type RecvInput = {
  branchId: string;
  variantId: string;
  colorCode: string;
  unitKind: string;
  engineNo: string;
  frameNo: string;
  receivedAt: string;
  retail: string;
  cost: string;
  costVat: string;
  note: string;
};

/** ค่าที่ผ่านการตรวจแล้ว พร้อม insert (ยังไม่มี sku/branch_id ที่ resolve — action เติมต่อ) */
export type RecvValid = {
  branchId: string;
  variantId: string;
  colorCode: string;
  unitKind: string;
  engineNo: string;
  frameNo: string;
  receivedAt: string;
  retail: number | null;
  cost: number;
  costVat: number;
  note: string | null;
};

/** ผู้มีสิทธิ์รับรถเข้าสต๊อก — ตรงกับเมนู recv (admin/manager/stock) */
const RECV_ROLES = ["admin", "manager", "stock"];
export function canReceiveStock(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return RECV_ROLES.some((r) => roles.has(r));
}

/** รหัสสินค้า = รหัสรุ่น + รหัสสี (เช่น B6FU00 + 10 = B6FU0010) */
export function deriveSku(variantCode: string, colorCode: string): string {
  return `${variantCode}${colorCode}`.trim();
}

/** VAT ของต้นทุน — ปัดเป็นสตางค์ (2 ตำแหน่ง) จาก cost × vatPct% */
export function computeCostVat(cost: number, vatPct: number): number {
  if (cost <= 0 || vatPct <= 0) {
    return 0;
  }
  return Math.round(cost * (vatPct / 100) * 100) / 100;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toNum(raw: string): number {
  const n = Number(String(raw ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

/**
 * ตรวจฟอร์มรับรถ — คืนค่าที่พร้อมใช้ หรือข้อความ error แรกที่เจอ
 * cost ไม่บังคับ (ว่าง/0 = รอกำหนดต้นทุน) · retail ว่าง = รอกำหนดราคา (null)
 */
export function validateRecvInput(input: RecvInput): { ok: true; value: RecvValid } | { ok: false; error: string } {
  const branchId = input.branchId.trim();
  const variantId = input.variantId.trim();
  const colorCode = input.colorCode.trim();
  const engineNo = input.engineNo.trim();
  const frameNo = input.frameNo.trim();
  const receivedAt = input.receivedAt.trim();
  const unitKind = input.unitKind.includes("มือสอง") ? "มือสอง" : "ใหม่";

  if (!branchId) {
    return { ok: false, error: "เลือกบริษัท" };
  }
  if (!variantId) {
    return { ok: false, error: "เลือกรุ่นรถ" };
  }
  if (!colorCode) {
    return { ok: false, error: "เลือกสี" };
  }
  if (!engineNo) {
    return { ok: false, error: "กรอกเลขเครื่อง" };
  }
  if (!frameNo) {
    return { ok: false, error: "กรอกเลขตัวถัง" };
  }
  if (!ISO_DATE.test(receivedAt)) {
    return { ok: false, error: "วันที่รับไม่ถูกต้อง" };
  }

  const retailNum = input.retail.trim() === "" ? null : toNum(input.retail);
  if (retailNum !== null && (Number.isNaN(retailNum) || retailNum < 0)) {
    return { ok: false, error: "ราคาขายไม่ถูกต้อง" };
  }

  const costNum = input.cost.trim() === "" ? 0 : toNum(input.cost);
  if (Number.isNaN(costNum) || costNum < 0) {
    return { ok: false, error: "ต้นทุนไม่ถูกต้อง" };
  }
  const costVatNum = input.costVat.trim() === "" ? 0 : toNum(input.costVat);
  if (Number.isNaN(costVatNum) || costVatNum < 0) {
    return { ok: false, error: "VAT ต้นทุนไม่ถูกต้อง" };
  }

  return {
    ok: true,
    value: {
      branchId,
      variantId,
      colorCode,
      unitKind,
      engineNo,
      frameNo,
      receivedAt,
      retail: retailNum,
      cost: costNum,
      costVat: costVatNum,
      note: input.note.trim() === "" ? null : input.note.trim(),
    },
  };
}
