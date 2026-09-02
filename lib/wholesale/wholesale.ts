/**
 * ขายส่งระหว่างร้าน (B2B) — FAM-1127 · fixlist ข้อ 12 · บรีฟ R1 หมวด D
 * ต่างจากขายปลีก: 1 บิล = หลายคัน · ผู้ซื้อคือร้านค้า ไม่ใช่ลูกค้าบุคคล
 *
 * ฟังก์ชันบริสุทธิ์ — ตรวจฟอร์มและคิดยอด ใช้ทั้งฝั่ง client (feedback สด) และ server (บังคับจริง)
 */

export type WholesaleActionResult = { ok: true; message?: string; orderNo?: string } | { ok: false; error: string };

/** ผู้มีสิทธิ์ขายส่ง — ตรงกับคนที่ขายปลีกได้ (และตรงกับด่านใน RPC) */
const SELL_ROLES = ["admin", "manager", "sales"];
export function canSellWholesale(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return SELL_ROLES.some((r) => roles.has(r));
}

/** จัดการรายชื่อร้านค้าขายส่ง — ตรงกับ RLS wholesale_company_write (is_manager) */
const COMPANY_ROLES = ["admin", "manager"];
export function canManageWholesaleCompanies(roleCodes: readonly string[]): boolean {
  const roles = new Set(roleCodes);
  return COMPANY_ROLES.some((r) => roles.has(r));
}

export type WholesaleCompany = {
  id: string;
  name: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  contactName: string | null;
  creditDays: number;
  isActive: boolean;
};

/** คันรถที่เลือกขายส่งได้ (จากสต๊อกพร้อมขาย) — โชว์เลขเครื่อง/เลขถังตามบรีฟ */
export type WholesaleUnit = {
  id: string;
  branchId: string;
  branchName: string;
  model: string;
  color: string;
  engineNo: string;
  frameNo: string;
  cost: number | null; // null = ไม่มีสิทธิ์ดูเงิน
  retail: number | null;
};

export type WholesaleLineInput = { unitId: string; price: string };

export type WholesaleLine = { unitId: string; price: number };

export type WholesaleOrderInput = {
  companyId: string;
  lines: readonly WholesaleLineInput[];
};

/**
 * ตรวจใบขายส่ง
 * - ต้องเลือกร้านค้า + อย่างน้อย 1 คัน · ราคาต่อคันต้องมากกว่า 0
 * - ห้ามเลือกคันซ้ำในบิลเดียว (ฟอร์มกันไว้ แต่ server ต้องกันด้วย)
 * - ทุกคันต้องอยู่บริษัทเดียวกัน (เลขบิลผูกกับบริษัท) — ตรงกับด่านใน RPC
 */
export function validateWholesaleOrder(
  input: WholesaleOrderInput,
  units: readonly WholesaleUnit[],
): { ok: true; value: { companyId: string; lines: WholesaleLine[]; branchId: string } } | { ok: false; error: string } {
  const companyId = input.companyId.trim();
  if (companyId === "") {
    return { ok: false, error: "เลือกร้านค้าที่ขายส่งให้" };
  }
  if (input.lines.length === 0) {
    return { ok: false, error: "เลือกคันรถอย่างน้อย 1 คัน" };
  }

  const byId = new Map(units.map((u) => [u.id, u]));
  const seen = new Set<string>();
  const lines: WholesaleLine[] = [];
  let branchId: string | null = null;

  for (const raw of input.lines) {
    const unitId = raw.unitId.trim();
    const unit = byId.get(unitId);
    if (!unit) {
      return { ok: false, error: "มีคันที่เลือกไม่อยู่ในสต๊อกพร้อมขายแล้ว — รีเฟรชหน้าแล้วลองใหม่" };
    }
    if (seen.has(unitId)) {
      return { ok: false, error: `เลือก ${unit.model} (${unit.engineNo || unit.frameNo}) ซ้ำ` };
    }
    seen.add(unitId);

    const price = Number(raw.price);
    if (!Number.isFinite(price) || price <= 0) {
      return { ok: false, error: `กรอกราคาขายส่งของ ${unit.model} (${unit.engineNo || unit.frameNo})` };
    }

    if (branchId === null) {
      branchId = unit.branchId;
    } else if (branchId !== unit.branchId) {
      return { ok: false, error: "บิลเดียวต้องเป็นรถของบริษัทเดียวกันทั้งหมด — แยกเป็นคนละบิล" };
    }

    lines.push({ unitId, price });
  }

  return { ok: true, value: { companyId, lines, branchId: branchId as string } };
}

export type WholesaleTotals = { units: number; total: number; cost: number; gross: number | null };

/** ยอดรวมของบิล — กำไรเป็น null เมื่อผู้ใช้ไม่มีสิทธิ์เห็นต้นทุน */
export function wholesaleTotals(
  lines: readonly WholesaleLineInput[],
  units: readonly WholesaleUnit[],
): WholesaleTotals {
  const byId = new Map(units.map((u) => [u.id, u]));
  let total = 0;
  let cost = 0;
  let costKnown = true;
  for (const l of lines) {
    const price = Number(l.price);
    if (Number.isFinite(price)) {
      total += price;
    }
    const c = byId.get(l.unitId)?.cost;
    if (c == null) {
      costKnown = false;
    } else {
      cost += c;
    }
  }
  return { units: lines.length, total, cost, gross: costKnown ? total - cost : null };
}

export type WholesaleOrderRow = {
  id: string;
  orderNo: string;
  companyName: string;
  soldAt: string; // ISO
  units: number;
  total: number;
  gross: number | null;
  salespersonName: string;
  voided: boolean;
};

/** กรองบิลขายส่งด้วยคำค้น (เลขบิล/ร้านค้า/พนักงาน) + ตั้งแต่วันที่ */
export function filterWholesaleOrders(
  rows: readonly WholesaleOrderRow[],
  opts: { search?: string; fromDate?: string; companyId?: string } = {},
): WholesaleOrderRow[] {
  const q = (opts.search ?? "").trim().toLowerCase();
  const from = (opts.fromDate ?? "").trim();
  return rows.filter((r) => {
    if (from && r.soldAt.slice(0, 10) < from) {
      return false;
    }
    if (q && !`${r.orderNo} ${r.companyName} ${r.salespersonName}`.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}

export type CompanyInput = {
  name: string;
  taxId: string;
  address: string;
  phone: string;
  contactName: string;
  creditDays: string;
};

export const CREDIT_DAYS_MAX = 180;

/** ตรวจฟอร์มร้านค้าขายส่ง — เลขผู้เสียภาษี (ถ้ากรอก) ต้อง 13 หลัก เพราะต้องออกใบกำกับให้ */
export function validateWholesaleCompany(
  input: CompanyInput,
): { ok: true; value: { name: string; taxId: string | null; address: string | null; phone: string | null; contactName: string | null; creditDays: number } } | { ok: false; error: string } {
  const name = input.name.trim();
  if (name === "") {
    return { ok: false, error: "กรอกชื่อร้านค้า" };
  }
  const taxRaw = input.taxId.trim();
  if (taxRaw !== "" && !/^\d{13}$/.test(taxRaw.replace(/\D/g, ""))) {
    return { ok: false, error: "เลขผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก" };
  }
  const creditDays = input.creditDays.trim() === "" ? 0 : Math.round(Number(input.creditDays));
  if (!Number.isFinite(creditDays) || creditDays < 0 || creditDays > CREDIT_DAYS_MAX) {
    return { ok: false, error: `เครดิตต้องอยู่ระหว่าง 0–${CREDIT_DAYS_MAX} วัน` };
  }
  const blank = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    ok: true,
    value: {
      name,
      taxId: taxRaw === "" ? null : taxRaw.replace(/\D/g, ""),
      address: blank(input.address),
      phone: blank(input.phone),
      contactName: blank(input.contactName),
      creditDays,
    },
  };
}
