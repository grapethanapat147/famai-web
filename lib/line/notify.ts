import "server-only";

/**
 * ส่งข้อความ text เข้า LINE (push ไปยัง LINE_NOTIFY_TO = กลุ่ม/ผู้ใช้ฝ่ายร้าน) · E10
 * ไม่ตั้งค่า token/ปลายทาง → ไม่ส่ง (no-op) ให้ cron ทำงานต่อได้โดยไม่พัง
 */
export async function pushLineText(text: string): Promise<{ sent: boolean; reason?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_NOTIFY_TO;
  if (!token || !to) {
    return { sent: false, reason: "line-not-configured" };
  }
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
    });
    return res.ok ? { sent: true } : { sent: false, reason: `line-http-${res.status}` };
  } catch {
    return { sent: false, reason: "line-fetch-failed" };
  }
}
