import { describe, expect, it } from "vitest";
import { A4, dataUrlToJpegBytes, fitOnPage, jpegSize, jpegToPdf, pdfFileName } from "@/lib/pdf/image-pdf";

/** JPEG จิ๋วที่ถูกต้องตามสเปก: SOI + SOF0 (ประกาศขนาด) + EOI */
function fakeJpeg(w: number, h: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xc0, 0x00, 0x11, 0x08, (h >> 8) & 0xff, h & 0xff, (w >> 8) & 0xff, w & 0xff,
    0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9, // EOI
  ]);
}

const latin1 = (bytes: Uint8Array) => String.fromCharCode(...bytes);

describe("อ่านขนาดจาก JPEG", () => {
  it("อ่าน SOF0 ได้ถูกต้อง", () => {
    expect(jpegSize(fakeJpeg(1600, 2262))).toEqual({ width: 1600, height: 2262 });
  });

  it("ไม่ใช่ JPEG → null (ไม่ throw)", () => {
    expect(jpegSize(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(jpegSize(new Uint8Array())).toBeNull();
  });
});

describe("จัดรูปให้พอดี A4", () => {
  it("คงสัดส่วนเดิมเสมอ", () => {
    const box = fitOnPage(1000, 2000);
    expect(box.height / box.width).toBeCloseTo(2, 5);
  });

  it("ไม่ล้นขอบกระดาษ และวางกึ่งกลาง", () => {
    const margin = 24;
    for (const [w, h] of [[2000, 500], [500, 2000], [1000, 1000]]) {
      const box = fitOnPage(w, h, A4, margin);
      expect(box.width).toBeLessThanOrEqual(A4.width - margin * 2 + 0.01);
      expect(box.height).toBeLessThanOrEqual(A4.height - margin * 2 + 0.01);
      expect(box.x * 2 + box.width).toBeCloseTo(A4.width, 5);
      expect(box.y * 2 + box.height).toBeCloseTo(A4.height, 5);
    }
  });

  it("ขนาด 0 ไม่ทำให้หารด้วยศูนย์", () => {
    const box = fitOnPage(0, 0);
    expect(Number.isFinite(box.width)).toBe(true);
    expect(Number.isFinite(box.height)).toBe(true);
  });
});

describe("ประกอบไฟล์ PDF", () => {
  const jpeg = fakeJpeg(800, 1131);
  const pdf = jpegToPdf(jpeg, undefined, { title: "FMG-RECEIPT-2569-00001" });
  const text = latin1(pdf);

  it("ขึ้นต้นด้วย %PDF และจบด้วย %%EOF", () => {
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("ฝังภาพแบบ JPEG ตรง ๆ (DCTDecode) ไม่ได้แปลงซ้ำ", () => {
    expect(text).toContain("/Filter/DCTDecode");
    expect(text).toContain(`/Length ${jpeg.length}`);
    // ไบต์ของภาพต้องอยู่ในไฟล์ครบถ้วนไม่ถูกดัดแปลง
    expect(text.indexOf(latin1(jpeg))).toBeGreaterThan(0);
  });

  it("ประกาศขนาดภาพตรงกับที่อ่านได้จากไฟล์ภาพ", () => {
    expect(text).toContain("/Width 800/Height 1131");
  });

  it("ออฟเซ็ตใน xref ชี้ไปที่หัว object จริงทุกตัว (นับเป็นไบต์)", () => {
    const m = /startxref\n(\d+)/.exec(text);
    expect(m).toBeTruthy();
    const xrefStart = Number(m![1]);
    expect(text.slice(xrefStart, xrefStart + 4)).toBe("xref");

    const offsets = [...text.slice(xrefStart).matchAll(/^(\d{10}) 00000 n $/gm)].map((x) => Number(x[1]));
    expect(offsets).toHaveLength(6);
    offsets.forEach((at, i) => {
      expect(text.slice(at, at + `${i + 1} 0 obj`.length), `object ${i + 1}`).toBe(`${i + 1} 0 obj`);
    });
  });

  it("ทุกบรรทัดของ xref ยาว 20 ไบต์เป๊ะ (ตัวอ่าน PDF บางตัวเข้มเรื่องนี้)", () => {
    const body = text.slice(text.indexOf("xref\n"));
    const lines = body.split("\n").filter((l) => /^\d{10} \d{5} [nf] $/.test(l));
    expect(lines).toHaveLength(7); // 6 object + แถวว่างแถวแรก
    for (const l of lines) {
      expect(`${l}\n`.length, l).toBe(20);
    }
  });

  it("ใส่ชื่อเอกสารลง metadata และกันวงเล็บที่ทำให้ไฟล์พัง", () => {
    expect(latin1(jpegToPdf(jpeg, undefined, { title: "A(B)C\\D" }))).toContain("/Title(ABCD)");
  });

  it("ไม่ส่งขนาดมาก็อ่านจากภาพเอง ได้ผลเท่ากับส่งมาเอง", () => {
    const a = jpegToPdf(jpeg);
    const b = jpegToPdf(jpeg, { width: 800, height: 1131 });
    expect(a.length).toBe(b.length);
  });
});

describe("ตัวช่วยฝั่งเบราว์เซอร์", () => {
  it("รับเฉพาะ data URL ที่เป็น JPEG", () => {
    expect(dataUrlToJpegBytes("data:image/png;base64,AAAA")).toBeNull();
    expect(dataUrlToJpegBytes("ไม่ใช่ data url")).toBeNull();
  });

  it("ชื่อไฟล์ปลอดภัยและคงตัวอักษรไทย", () => {
    expect(pdfFileName("FMG-RECEIPT-2569-00001")).toBe("FMG-RECEIPT-2569-00001.pdf");
    expect(pdfFileName("ใบเสร็จ 001/A")).toBe("ใบเสร็จ-001-A.pdf");
    expect(pdfFileName("///")).toBe("document.pdf");
  });
});
