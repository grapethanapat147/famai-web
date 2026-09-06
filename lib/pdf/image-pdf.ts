/**
 * สร้างไฟล์ PDF หน้าเดียวที่มีรูป JPEG หนึ่งรูปเต็มหน้า — FAM-1154
 *
 * ทำไมเขียนเอง: ต้องการให้ปุ่ม "ดาวน์โหลด PDF" ของใบเสร็จ/ใบกำกับทำงานได้ทันที
 * โดย **ไม่เพิ่ม dependency** ตามที่เจ้าของเลือกไว้ · PDF ที่มีแค่รูปเดียวมีโครงสร้างสั้นมาก
 * (5 object) จึงประกอบเองได้ตรง ๆ และได้ภาษาไทยถูกต้อง 100% เพราะเป็นภาพของหน้าจริง
 *
 * ข้อแลกเปลี่ยนที่ยอมรับแล้ว: เลือกคัดลอกข้อความใน PDF ไม่ได้ และไฟล์ใหญ่กว่า PDF แบบข้อความ
 *
 * จุดที่พลาดง่ายและระวังไว้แล้ว:
 * - ตาราง xref ต้องเป็น **ออฟเซ็ตหน่วยไบต์** ไม่ใช่จำนวนตัวอักษร (ข้อมูล JPEG เป็นไบนารี)
 *   จึงประกอบเป็น Uint8Array ตั้งแต่ต้นและนับไบต์จริงทุกก้อน
 * - ทุกบรรทัดของ xref ต้องยาว 20 ไบต์เป๊ะ ไม่งั้นโปรแกรมอ่าน PDF บางตัวจะไม่ยอมเปิด
 */

/** A4 แนวตั้ง หน่วย point (72 จุดต่อนิ้ว) */
export const A4 = { width: 595.28, height: 841.89 } as const;

export type ImagePdfOptions = {
  /** ขอบกระดาษ (point) — ค่าเริ่มต้น 24pt ≈ 8.5 มม. */
  margin?: number;
  /** ชื่อเอกสารที่ฝังใน metadata */
  title?: string;
};

function latin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}

/** ย่อรูปให้พอดีกรอบโดยคงสัดส่วน แล้ววางกึ่งกลางหน้า */
export function fitOnPage(
  pxW: number,
  pxH: number,
  page: { width: number; height: number } = A4,
  margin = 24,
): { width: number; height: number; x: number; y: number } {
  const maxW = page.width - margin * 2;
  const maxH = page.height - margin * 2;
  const safeW = pxW > 0 ? pxW : 1;
  const safeH = pxH > 0 ? pxH : 1;
  const scale = Math.min(maxW / safeW, maxH / safeH);
  const width = safeW * scale;
  const height = safeH * scale;
  return {
    width,
    height,
    x: (page.width - width) / 2,
    // PDF นับแกน Y จากล่างขึ้นบน — วางกึ่งกลางแนวตั้ง
    y: (page.height - height) / 2,
  };
}

/** ดึงขนาดจริงของภาพ JPEG จากไบต์ (อ่าน SOF marker) — คืน null ถ้าไม่ใช่ JPEG ที่อ่านได้ */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15 = เฟรมที่มีขนาดภาพ
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2) {
      return null;
    }
    i += 2 + len;
  }
  return null;
}

/**
 * ประกอบ PDF หน้าเดียวจากภาพ JPEG
 * ถ้าไม่ส่งขนาดมา จะอ่านจากไบต์ของภาพเอง — อ่านไม่ได้ถือว่าเป็นสัดส่วน A4
 */
export function jpegToPdf(
  jpeg: Uint8Array,
  size?: { width: number; height: number },
  options: ImagePdfOptions = {},
): Uint8Array<ArrayBuffer> {
  const dim = size ?? jpegSize(jpeg) ?? { width: Math.round(A4.width), height: Math.round(A4.height) };
  const box = fitOnPage(dim.width, dim.height, A4, options.margin ?? 24);
  const n = (v: number) => v.toFixed(2);

  const content = `q ${n(box.width)} 0 0 ${n(box.height)} ${n(box.x)} ${n(box.y)} cm /Im0 Do Q\n`;
  const title = (options.title ?? "").replace(/[\\()]/g, "");

  const objects: (string | Uint8Array)[][] = [
    ["<</Type/Catalog/Pages 2 0 R>>"],
    ["<</Type/Pages/Kids[3 0 R]/Count 1>>"],
    [
      `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${n(A4.width)} ${n(A4.height)}]` +
        `/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>`,
    ],
    [
      `<</Type/XObject/Subtype/Image/Width ${dim.width}/Height ${dim.height}` +
        `/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${jpeg.length}>>\nstream\n`,
      jpeg,
      "\nendstream",
    ],
    [`<</Length ${content.length}>>\nstream\n${content}endstream`],
    [`<</Title(${title})/Producer(Famai)>>`],
  ];

  const chunks: Uint8Array[] = [];
  let offset = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? latin1(part) : part;
    chunks.push(bytes);
    offset += bytes.length;
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const xref: number[] = [];
  objects.forEach((body, index) => {
    xref.push(offset);
    push(`${index + 1} 0 obj\n`);
    body.forEach(push);
    push("\nendobj\n");
  });

  const xrefStart = offset;
  // ทุกบรรทัดต้องยาว 20 ไบต์เป๊ะตามสเปก
  let table = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const at of xref) {
    table += `${String(at).padStart(10, "0")} 00000 n \n`;
  }
  table += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R/Info ${objects.length} 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;
  push(table);

  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(new ArrayBuffer(total));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** แปลง data URL ของ toJpeg() เป็นไบต์ — คืน null ถ้าไม่ใช่ JPEG */
export function dataUrlToJpegBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0 || !/^data:image\/jpe?g;base64$/i.test(dataUrl.slice(0, comma))) {
    return null;
  }
  const binary = atob(dataUrl.slice(comma + 1));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/** ชื่อไฟล์ที่ปลอดภัยกับทุกระบบ — คงตัวอักษรไทยไว้ (เลขที่เอกสารเป็นละติน อยู่แล้ว) */
export function pdfFileName(docNo: string): string {
  const safe = docNo.replace(/[^\p{L}\p{M}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "");
  return `${safe || "document"}.pdf`;
}
