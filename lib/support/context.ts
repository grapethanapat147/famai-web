/**
 * แคปหน้าจอส่งซัพพอร์ต (FAM-1106) — ชื่อไฟล์ + ข้อมูลบริบท (ฟังก์ชันบริสุทธิ์ ทดสอบได้)
 * ไม่แนบข้อมูลลับ — เฉพาะหน้า/เวลา/ขนาดจอ/เบราว์เซอร์ + ข้อความที่ผู้ใช้พิมพ์เอง
 */

/** สลัก slug จาก path เช่น "/registration" → "registration", "/" → "home" */
export function supportSlug(path: string): string {
  const first = path.replace(/^\/+|\/+$/g, "").split("/")[0] || "home";
  const cleaned = first.replace(/[^a-z0-9-]/gi, "");
  return cleaned || "home";
}

/** ชื่อไฟล์รูป เช่น "famai-dash-20260824-1530.png" */
export function supportFileName(path: string, atISO: string): string {
  const m = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(atISO);
  const stamp = m ? `${m[1]}${m[2]}${m[3]}-${m[4]}${m[5]}` : "capture";
  return `famai-${supportSlug(path)}-${stamp}.png`;
}

/** ชื่อเบราว์เซอร์ย่อจาก user-agent (พอให้ซัพพอร์ตรู้ว่าใช้อะไร) */
export function shortUA(ua: string): string {
  if (/Edg\//.test(ua)) {
    return "Edge";
  }
  if (/Chrome\//.test(ua)) {
    return "Chrome";
  }
  if (/Firefox\//.test(ua)) {
    return "Firefox";
  }
  if (/Safari\//.test(ua)) {
    return "Safari";
  }
  return "อื่นๆ";
}

export type SupportInfo = { path: string; atISO: string; width: number; height: number; ua: string; note?: string };

/** บรรทัดข้อมูลบริบทสำหรับส่งซัพพอร์ต (คัดลอกไปแปะแชท) */
export function supportContextLines(info: SupportInfo): string[] {
  const lines = [`หน้า: ${info.path}`, `เวลา: ${info.atISO}`, `จอ: ${info.width}×${info.height}`, `เบราว์เซอร์: ${shortUA(info.ua)}`];
  const note = (info.note ?? "").trim();
  if (note !== "") {
    lines.unshift(`ปัญหา: ${note}`);
  }
  return lines;
}
