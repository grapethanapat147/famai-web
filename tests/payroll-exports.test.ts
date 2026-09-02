import { describe, expect, it } from "vitest";
import {
  bankFileRows,
  buildBankFile,
  normalizeAccount,
  ssnFileRows,
  ssnSummary,
  type BankRow,
  type SsnRow,
} from "@/lib/payroll/exports";

const ssnRows: SsnRow[] = [
  { employeeId: "e1", name: "สมชาย ใจดี", ssnNo: "1234567890123", base: 18_000, ssn: 750 },
  { employeeId: "e2", name: "มานี รักษ์ดี", ssnNo: null, base: 15_000, ssn: 750 },
  { employeeId: "e3", name: "เด็กฝึกงาน", ssnNo: null, base: 0, ssn: 0 }, // ไม่ถูกหัก
];

describe("ssnSummary (fixlist ข้อ 13)", () => {
  const s = ssnSummary(ssnRows);

  it("นับเฉพาะคนที่ถูกหักจริง", () => {
    expect(s.employeeCount).toBe(2);
    expect(s.rows.map((r) => r.employeeId)).toEqual(["e1", "e2"]);
  });

  it("นายจ้างสมทบเท่าลูกจ้าง · ยอดนำส่ง = สองฝั่งรวมกัน", () => {
    expect(s.employeeShare).toBe(1_500);
    expect(s.employerShare).toBe(1_500);
    expect(s.grandTotal).toBe(3_000);
    expect(s.totalWage).toBe(33_000);
  });

  it("เตือนคนที่ยังไม่มีเลขประกันสังคม — ยื่นไม่ได้", () => {
    expect(s.missingSsnNo.map((r) => r.name)).toEqual(["มานี รักษ์ดี"]);
  });

  it("ไม่มีใครถูกหัก = สรุปเป็นศูนย์ ไม่พัง", () => {
    const empty = ssnSummary([{ employeeId: "x", name: "x", ssnNo: null, base: 0, ssn: 0 }]);
    expect(empty).toMatchObject({ employeeCount: 0, grandTotal: 0, missingSsnNo: [] });
  });

  it("ตารางไฟล์มีหัว + แถวคน + แถวรวม", () => {
    const f = ssnFileRows(s);
    expect(f).toHaveLength(4);
    expect(f[0][0]).toBe("ลำดับ");
    expect(f[3][0]).toBe("รวม");
    expect(f[3][1]).toBe("2 คน");
  });
});

describe("normalizeAccount", () => {
  it("เอาเฉพาะตัวเลข (ธนาคารไม่รับขีด/เว้นวรรค)", () => {
    expect(normalizeAccount("123-4-56789-0")).toBe("1234567890");
    expect(normalizeAccount(" 012 345 6789 ")).toBe("0123456789");
    expect(normalizeAccount(null)).toBe("");
  });
});

describe("buildBankFile (fixlist ข้อ 14)", () => {
  const rows: BankRow[] = [
    { employeeId: "e1", name: "สมชาย ใจดี", bankCode: "004", bankAccount: "123-4-56789-0", net: 18_450 },
    { employeeId: "e2", name: "ไม่มีบัญชี", bankCode: null, bankAccount: null, net: 12_000 },
    { employeeId: "e3", name: "ยอดศูนย์", bankCode: "014", bankAccount: "9876543210", net: 0 },
    { employeeId: "e4", name: "เลขสั้น", bankCode: "014", bankAccount: "12345", net: 9_000 },
  ];
  const r = buildBankFile(rows);

  it("แยกคนที่โอนได้ ออกจากคนที่ต้องจ่ายมือ พร้อมเหตุผล", () => {
    expect(r.ready.map((x) => x.employeeId)).toEqual(["e1"]);
    expect(r.skipped.map((x) => [x.row.employeeId, x.reason])).toEqual([
      ["e2", "ยังไม่ได้กรอกเลขบัญชี"],
      ["e3", "ยอดสุทธิเป็นศูนย์"],
      ["e4", "เลขบัญชีสั้นผิดปกติ (5 หลัก)"],
    ]);
  });

  it("ยอดรวมนับเฉพาะคนที่โอนได้จริง", () => {
    expect(r.total).toBe(18_450);
  });

  it("ไฟล์โอนมีทั้งบาทและสตางค์ (กันปัดเศษเพี้ยน) + เลขบัญชีล้วนตัวเลข", () => {
    const f = bankFileRows(r.ready);
    expect(f[0]).toContain("เลขบัญชี");
    expect(f[1]).toEqual([1, "สมชาย ใจดี", "004", "1234567890", "18450.00", 1_845_000]);
  });

  it("ไม่มีใครโอนได้ = ไฟล์เหลือแค่หัวตาราง", () => {
    expect(bankFileRows([])).toHaveLength(1);
  });
});
