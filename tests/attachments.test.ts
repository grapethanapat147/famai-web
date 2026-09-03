import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_MAX_BYTES,
  attachmentObjectPath,
  canAttach,
  formatBytes,
  groupByOwner,
  isImageMime,
  isOwnerTable,
  kindsFor,
  pathBelongsTo,
  safeFileName,
  validateAttachmentFile,
  type AttachmentRow,
} from "@/lib/attachments/attachments";

describe("validateAttachmentFile (fixlist ข้อ 09)", () => {
  it("รับรูปและ PDF ในขนาดที่ bucket ยอม", () => {
    expect(validateAttachmentFile({ name: "bill.pdf", type: "application/pdf", size: 120_000 })).toEqual({ ok: true });
    expect(validateAttachmentFile({ name: "a.jpg", type: "image/jpeg", size: ATTACHMENT_MAX_BYTES })).toEqual({ ok: true });
  });

  it("ปฏิเสธชนิดอื่น / ไฟล์ว่าง / ใหญ่เกิน พร้อมบอกขนาด", () => {
    expect(validateAttachmentFile({ name: "x.xlsx", type: "application/vnd.ms-excel", size: 10 })).toMatchObject({ ok: false });
    expect(validateAttachmentFile({ name: "x.pdf", type: "application/pdf", size: 0 })).toEqual({ ok: false, error: "ไฟล์ว่าง" });
    const big = validateAttachmentFile({ name: "x.pdf", type: "application/pdf", size: ATTACHMENT_MAX_BYTES + 1 });
    expect(big.ok).toBe(false);
    if (!big.ok) {
      expect(big.error).toContain("5.0 MB");
    }
  });
});

describe("safeFileName / path", () => {
  it("ตัดอักขระแปลก คงนามสกุล รองรับชื่อไทย", () => {
    expect(safeFileName("ใบเสร็จ ร้าน A #1.PDF")).toBe("ใบเสร็จ-ร้าน-A-1.pdf");
    expect(safeFileName("../../etc/passwd")).toBe("passwd");
    expect(safeFileName("C:\\Users\\bill 2569.PDF")).toBe("bill-2569.pdf");
    expect(safeFileName("   ")).toBe("file");
  });

  it("path อยู่ใต้โฟลเดอร์เจ้าของ และตรวจย้อนได้", () => {
    const p = attachmentObjectPath("expense", "e-1", 1700000000000, "bill.pdf");
    expect(p).toBe("expense/e-1/1700000000000-bill.pdf");
    expect(pathBelongsTo(p, "expense", "e-1")).toBe(true);
    expect(pathBelongsTo(p, "expense", "e-2")).toBe(false);
    expect(pathBelongsTo("expense/e-1/../e-2/x.pdf", "expense", "e-1")).toBe(false);
  });
});

describe("สิทธิ์และชนิดตามตาราง", () => {
  it("ใบเสร็จค่าใช้จ่าย = บัญชี/ผู้บริหาร · บิลรับรถ = สต๊อก/ผู้บริหาร", () => {
    expect(canAttach("expense", ["acct"])).toBe(true);
    expect(canAttach("expense", ["stock"])).toBe(false);
    expect(canAttach("motorcycle_unit", ["stock"])).toBe(true);
    expect(canAttach("motorcycle_unit", ["sales"])).toBe(false);
    expect(canAttach("motorcycle_unit", ["admin"])).toBe(true);
  });

  it("ชนิดไฟล์แนบต่างกันตามตาราง · รู้จักเฉพาะตารางที่เปิดให้แนบ", () => {
    expect(kindsFor("expense")).toContain("ใบเสร็จ");
    expect(kindsFor("motorcycle_unit")).toContain("บิลรับรถ");
    expect(isOwnerTable("expense")).toBe(true);
    expect(isOwnerTable("customer")).toBe(false);
  });
});

describe("helpers", () => {
  it("formatBytes / isImageMime", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(20 * 1024)).toBe("20 KB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
    expect(isImageMime("image/webp")).toBe(true);
    expect(isImageMime("application/pdf")).toBe(false);
    expect(isImageMime(null)).toBe(false);
  });

  it("groupByOwner เรียงใหม่สุดก่อนในแต่ละแถว", () => {
    const row = (id: string, ownerId: string, at: string): AttachmentRow => ({
      id, ownerTable: "expense", ownerId, fileName: `${id}.pdf`, filePath: `expense/${ownerId}/${id}.pdf`,
      mimeType: "application/pdf", sizeBytes: 10, kind: "ใบเสร็จ", uploadedAt: at, uploadedByName: null, uploadedBy: null,
    });
    const g = groupByOwner([row("a", "e1", "2026-09-01"), row("b", "e1", "2026-09-03"), row("c", "e2", "2026-09-02")]);
    expect(g.get("e1")?.map((r) => r.id)).toEqual(["b", "a"]);
    expect(g.get("e2")?.map((r) => r.id)).toEqual(["c"]);
    expect(g.get("e9")).toBeUndefined();
  });
});
