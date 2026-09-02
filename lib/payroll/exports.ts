/**
 * ส่งออกงานเงินเดือน — FAM-1124
 *   ข้อ 13: ใบสรุปนำส่งประกันสังคม (จากยอดที่หักในสลิปอยู่แล้ว)
 *   ข้อ 14: ไฟล์โอนเงินเดือนส่งธนาคาร (จากเลขบัญชีที่มีอยู่แล้วในตารางพนักงาน)
 *
 * ฟังก์ชันบริสุทธิ์ — หน้าเพจป้อนแถวเข้ามา ไม่แตะ DB
 */

export type SsnRow = {
  employeeId: string;
  name: string;
  ssnNo: string | null;
  base: number;
  ssn: number; // ยอดหักฝั่งลูกจ้าง
};

export type SsnSummary = {
  rows: SsnRow[];
  employeeCount: number;
  totalWage: number;
  employeeShare: number;
  employerShare: number; // นายจ้างสมทบเท่าลูกจ้าง
  grandTotal: number;
  missingSsnNo: SsnRow[]; // ยังไม่ได้กรอกเลขประกันสังคม — ยื่นไม่ได้
};

/**
 * สรุปนำส่งประกันสังคมของงวด
 * นายจ้างสมทบเท่ากับที่หักจากลูกจ้าง (อัตราเดียวกัน) ยอดนำส่งจริง = สองฝั่งรวมกัน
 * นับเฉพาะคนที่ถูกหักจริง — คนที่ไม่ถูกหัก (เช่น ยังไม่เข้าเกณฑ์) ไม่ควรอยู่ในใบนำส่ง
 */
export function ssnSummary(rows: readonly SsnRow[]): SsnSummary {
  const withDeduction = rows.filter((r) => r.ssn > 0);
  const employeeShare = withDeduction.reduce((s, r) => s + r.ssn, 0);
  const totalWage = withDeduction.reduce((s, r) => s + r.base, 0);
  return {
    rows: withDeduction,
    employeeCount: withDeduction.length,
    totalWage,
    employeeShare,
    employerShare: employeeShare,
    grandTotal: employeeShare * 2,
    missingSsnNo: withDeduction.filter((r) => !r.ssnNo || r.ssnNo.trim() === ""),
  };
}

export type BankRow = {
  employeeId: string;
  name: string;
  bankCode: string | null;
  bankAccount: string | null;
  net: number;
};

export type BankFileResult = {
  /** แถวที่พร้อมโอน (มีเลขบัญชี + ยอดมากกว่า 0) */
  ready: BankRow[];
  /** ตกหล่น: ไม่มีเลขบัญชี หรือยอดเป็นศูนย์ — ต้องจ่ายมือ */
  skipped: { row: BankRow; reason: string }[];
  total: number;
};

/** เลขบัญชีเอาเฉพาะตัวเลข (ธนาคารไม่รับขีด/เว้นวรรค) */
export function normalizeAccount(raw: string | null): string {
  return (raw ?? "").replace(/\D/g, "");
}

/** แยกคนที่โอนได้ออกจากคนที่ต้องจ่ายมือ พร้อมเหตุผล */
export function buildBankFile(rows: readonly BankRow[]): BankFileResult {
  const ready: BankRow[] = [];
  const skipped: { row: BankRow; reason: string }[] = [];
  for (const r of rows) {
    const acct = normalizeAccount(r.bankAccount);
    if (r.net <= 0) {
      skipped.push({ row: r, reason: "ยอดสุทธิเป็นศูนย์" });
    } else if (acct === "") {
      skipped.push({ row: r, reason: "ยังไม่ได้กรอกเลขบัญชี" });
    } else if (acct.length < 10) {
      skipped.push({ row: r, reason: `เลขบัญชีสั้นผิดปกติ (${acct.length} หลัก)` });
    } else {
      ready.push(r);
    }
  }
  return { ready, skipped, total: ready.reduce((s, r) => s + r.net, 0) };
}

/**
 * ตารางไฟล์โอนเงินเดือน (รูปแบบกลางที่ธนาคารไทยส่วนใหญ่รับได้ผ่าน CSV)
 * ยอดเป็นสตางค์ไม่มีจุดทศนิยม — รูปแบบที่ระบบธนาคารใช้กันทั่วไป กันปัดเศษเพี้ยน
 */
export function bankFileRows(rows: readonly BankRow[]): (string | number)[][] {
  const header = ["ลำดับ", "ชื่อผู้รับ", "รหัสธนาคาร", "เลขบัญชี", "จำนวนเงิน (บาท)", "จำนวนเงิน (สตางค์)"];
  const body = rows.map((r, i) => [
    i + 1,
    r.name,
    r.bankCode ?? "",
    normalizeAccount(r.bankAccount),
    r.net.toFixed(2),
    Math.round(r.net * 100),
  ]);
  return [header, ...body];
}

/** ตารางใบนำส่งประกันสังคม */
export function ssnFileRows(summary: SsnSummary): (string | number)[][] {
  const header = ["ลำดับ", "ชื่อ", "เลขประกันสังคม", "ค่าจ้าง", "ลูกจ้างหัก", "นายจ้างสมทบ", "รวม"];
  const body = summary.rows.map((r, i) => [i + 1, r.name, r.ssnNo ?? "", r.base.toFixed(2), r.ssn.toFixed(2), r.ssn.toFixed(2), (r.ssn * 2).toFixed(2)]);
  const total = [
    "รวม",
    `${summary.employeeCount} คน`,
    "",
    summary.totalWage.toFixed(2),
    summary.employeeShare.toFixed(2),
    summary.employerShare.toFixed(2),
    summary.grandTotal.toFixed(2),
  ];
  return [header, ...body, total];
}
