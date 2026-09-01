import { describe, expect, it } from "vitest";
import { DEAL_PHASES, dealPhase, isDealPhase, phaseIndex, phaseVariant } from "@/lib/deal/phase";

describe("dealPhase (FAM-1111 · คุยกับลูกค้า → ไฟแนนซ์ → เปิดการขาย → ส่งมอบ)", () => {
  it("ส่งมอบแล้ว = เฟสส่งมอบ เสมอ (ไม่ว่าไฟแนนซ์สถานะใด)", () => {
    expect(dealPhase({ payMethod: "cash", financeStatus: null, stage: "ส่งมอบแล้ว" })).toBe("ส่งมอบ");
    expect(dealPhase({ payMethod: "finance", financeStatus: "รอผล", stage: "ส่งมอบแล้ว" })).toBe("ส่งมอบ");
  });

  it("เงินผ่อน + เคสยังไม่จบ + ขั้นต้น = เฟสไฟแนนซ์", () => {
    expect(dealPhase({ payMethod: "finance", financeStatus: "ส่งเรื่อง", stage: "ขายแล้ว" })).toBe("ไฟแนนซ์");
    expect(dealPhase({ payMethod: "finance", financeStatus: "รอผล", stage: "ส่งไฟแนนซ์" })).toBe("ไฟแนนซ์");
    expect(dealPhase({ payMethod: "finance", financeStatus: "ติดตามต่อ", stage: "ส่งไฟแนนซ์" })).toBe("ไฟแนนซ์");
  });

  it("อนุมัติแล้ว/ปฏิเสธ = ออกจากเฟสไฟแนนซ์ (ไปเปิดการขาย)", () => {
    expect(dealPhase({ payMethod: "finance", financeStatus: "อนุมัติแล้ว", stage: "ขายแล้ว" })).toBe("เปิดการขาย");
    expect(dealPhase({ payMethod: "finance", financeStatus: "ปฏิเสธ", stage: "ส่งไฟแนนซ์" })).toBe("เปิดการขาย");
  });

  it("ผ่านขั้นทะเบียนแล้ว = เปิดการขาย แม้ไฟแนนซ์ยังค้าง (ขั้นจริงเดินไปแล้ว)", () => {
    expect(dealPhase({ payMethod: "finance", financeStatus: "รอผล", stage: "รอทะเบียน" })).toBe("เปิดการขาย");
    expect(dealPhase({ payMethod: "finance", financeStatus: "รอผล", stage: "ป้ายขาว" })).toBe("เปิดการขาย");
  });

  it("เงินสดไม่เข้าเฟสไฟแนนซ์เลย", () => {
    expect(dealPhase({ payMethod: "cash", financeStatus: null, stage: "ขายแล้ว" })).toBe("เปิดการขาย");
    expect(dealPhase({ payMethod: "cash", financeStatus: "รอผล", stage: "ขายแล้ว" })).toBe("เปิดการขาย");
    expect(dealPhase({ payMethod: "cash", financeStatus: null, stage: "รอทะเบียน" })).toBe("เปิดการขาย");
  });
});

describe("phaseIndex / DEAL_PHASES", () => {
  it("เรียงตามที่เจ้าของสั่ง", () => {
    expect([...DEAL_PHASES]).toEqual(["คุยกับลูกค้า", "ไฟแนนซ์", "เปิดการขาย", "ส่งมอบ"]);
    expect(phaseIndex("คุยกับลูกค้า")).toBe(0);
    expect(phaseIndex("ไฟแนนซ์")).toBe(1);
    expect(phaseIndex("เปิดการขาย")).toBe(2);
    expect(phaseIndex("ส่งมอบ")).toBe(3);
  });
});

describe("isDealPhase / phaseVariant", () => {
  it("รู้จักเฉพาะเฟสจริง", () => {
    expect(isDealPhase("ไฟแนนซ์")).toBe(true);
    expect(isDealPhase("ขายแล้ว")).toBe(false);
  });
  it("ส่งมอบ = เขียว · ไฟแนนซ์ = ส้ม", () => {
    expect(phaseVariant("ส่งมอบ")).toBe("good");
    expect(phaseVariant("ไฟแนนซ์")).toBe("warn");
  });
});
