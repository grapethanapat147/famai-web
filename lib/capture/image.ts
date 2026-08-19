/**
 * แคป element → PNG data URL (FAM-1040)
 *
 * ใช้ `toSvg` ของ html-to-image (ส่วนยาก: clone DOM + inline computed style + ฝังฟอนต์)
 * แล้ว rasterize เป็น canvas เอง — เพราะ `toPng/toCanvas` ของ lib ค้างในหลายเบราว์เซอร์
 * (รอ image ภายในไม่จบ) ส่วน toSvg + วาด canvas เองทำงานได้ทุกที่และเร็ว
 *
 * โหลด html-to-image แบบ dynamic (ไม่ถ่วง bundle จนกว่าจะใช้จริง)
 */

function loadImage(src: string, timeoutMs = 15000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = window.setTimeout(() => reject(new Error("โหลดรูปนานเกินไป")), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("สร้างรูปไม่สำเร็จ"));
    };
    img.src = src;
  });
}

export async function elementToPngDataUrl(
  el: HTMLElement,
  opts: { pixelRatio?: number; background?: string } = {},
): Promise<string> {
  const pixelRatio = opts.pixelRatio ?? 2;
  const rect = el.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  const { toSvg } = await import("html-to-image");
  const svgUrl = await toSvg(el);
  const img = await loadImage(svgUrl);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("เบราว์เซอร์ไม่รองรับ canvas");
  }
  ctx.scale(pixelRatio, pixelRatio);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}
