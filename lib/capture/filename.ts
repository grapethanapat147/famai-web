/** ตั้งชื่อไฟล์รูปที่แคป (FAM-1040) — pure เพื่อเทสได้ · label + วันเวลา + .png */

// ตัดอักขระต้องห้ามในชื่อไฟล์ (path separator + reserved ของ Windows/มือถือ) — คงไทย/ช่องว่าง/ขีดไว้
function safeLabel(label: string): string {
  const clean = label
    .split("")
    .filter((ch) => !'\\/:*?"<>|'.includes(ch) && ch.charCodeAt(0) >= 0x20)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return clean === "" ? "รูป" : clean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** yyyymmdd-hhmm จากเวลาท้องถิ่นของ Date ที่ส่งเข้ามา */
export function captureStamp(at: Date): string {
  return (
    `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}` +
    `-${pad(at.getHours())}${pad(at.getMinutes())}`
  );
}

/** ชื่อไฟล์ปลอดภัย: label ที่ล้างแล้ว + timestamp + .png */
export function captureFilename(label: string, at: Date): string {
  return `${safeLabel(label)}-${captureStamp(at)}.png`;
}
