import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, PASSWORD_RULE_HINT, checkPassword, randomPassword } from "@/lib/auth/password";

const CTX = { email: "somchai@famai.local", username: "somchai", fullName: "สมชาย ใจดี" };

describe("checkPassword (FAM-1136 — แทน Leaked Password Protection ที่ต้องใช้แพ็ก Pro)", () => {
  it("รหัสที่ผสมดีและยาวพอ ผ่าน", () => {
    for (const pw of ["Rk7#mvqTza", "wQ2!bnxrpd", "Zm4$hkvtqw9"]) {
      expect(checkPassword(pw, CTX), pw).toEqual({ ok: true });
    }
  });

  it("สั้นเกินไป → บอกความยาวขั้นต่ำ", () => {
    const r = checkPassword("Ab3!xy", CTX);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain(String(MIN_PASSWORD_LENGTH));
    }
  });

  it("มีช่องว่างไม่ได้", () => {
    expect(checkPassword("Rk7# mvqTza", CTX)).toEqual({ ok: false, error: "รหัสผ่านห้ามมีช่องว่าง" });
  });

  it("ตัวเดียวซ้ำทั้งเส้น / เรียงต่อกัน → ปฏิเสธ", () => {
    expect(checkPassword("aaaaaaaaaaaa", CTX).ok).toBe(false);
    expect(checkPassword("1234567890", CTX).ok).toBe(false);
    expect(checkPassword("abcdefghij", CTX).ok).toBe(false);
    expect(checkPassword("jihgfedcba", CTX).ok).toBe(false); // เรียงถอยหลังก็เดาง่ายเท่ากัน
  });

  it("รหัสยอดฮิต — รวมที่เติมตัวเลข/สัญลักษณ์ท้ายเพื่อให้ผ่านกฎ", () => {
    for (const pw of ["Password12!", "Qwerty123!", "Famai2569!", "Yamaha123!"]) {
      const r = checkPassword(pw, CTX);
      expect(r.ok, pw).toBe(false);
      if (!r.ok) {
        expect(r.error).toContain("ใช้บ่อย");
      }
    }
  });

  it("ห้ามมีชื่อ/อีเมลของผู้ใช้อยู่ข้างใน และบอกว่าคำไหน", () => {
    const r = checkPassword("Somchai#2569", CTX);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("somchai");
    }
  });

  it("ผสมไม่ถึง 3 แบบ → ปฏิเสธ (ตัวเล็ก+ตัวเลขอย่างเดียวไม่พอ)", () => {
    const r = checkPassword("khonkaen456", {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("3 แบบ");
    }
  });

  it("ไม่ส่ง context มาก็ตรวจกฎที่เหลือได้ (ใช้ตอนเปลี่ยนรหัสเองภายหลัง)", () => {
    expect(checkPassword("Rk7#mvqTza")).toEqual({ ok: true });
  });

  it("ข้อความบอกกฎมีตัวเลขความยาวจริง (ไม่หลุดคนละค่ากับที่บังคับ)", () => {
    expect(PASSWORD_RULE_HINT).toContain(String(MIN_PASSWORD_LENGTH));
  });
});

describe("randomPassword", () => {
  it("รหัสที่สุ่มออกมาต้องผ่านนโยบายเสมอ (สุ่ม 200 ครั้ง)", () => {
    for (let i = 0; i < 200; i += 1) {
      const pw = randomPassword();
      expect(checkPassword(pw), pw).toEqual({ ok: true });
    }
  });

  it("ยาวตามที่ขอ แต่ไม่ต่ำกว่าขั้นต่ำ + 2", () => {
    expect(randomPassword(20)).toHaveLength(20);
    expect(randomPassword(4).length).toBe(MIN_PASSWORD_LENGTH + 2);
  });

  it("ไม่มีอักขระที่อ่านผิดง่าย (l 1 I O 0) เพราะต้องอ่านให้ฟังทางโทรศัพท์", () => {
    for (let i = 0; i < 100; i += 1) {
      expect(randomPassword()).not.toMatch(/[lI1O0]/);
    }
  });

  it("สุ่มซ้ำได้ผลต่างกัน (ไม่ได้คืนค่าคงที่)", () => {
    const set = new Set(Array.from({ length: 20 }, () => randomPassword()));
    expect(set.size).toBe(20);
  });
});
