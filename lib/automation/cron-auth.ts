/** ตรวจสิทธิ์เรียก cron — เทียบ Authorization: Bearer <CRON_SECRET> แบบ constant-time (E10) */

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** true เมื่อ header ตรงกับ secret ที่ตั้งไว้ · ไม่ตั้ง secret หรือไม่มี header = ปฏิเสธ */
export function isAuthorizedCron(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !authHeader) {
    return false;
  }
  return safeEqual(authHeader, `Bearer ${secret}`);
}
