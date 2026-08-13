/**
 * แปลงตาราง → CSV (ฟังก์ชันบริสุทธิ์ ทดสอบได้) · escape ตาม RFC 4180
 * นำหน้าด้วย BOM ตอนดาวน์โหลดจริง (ให้ Excel อ่านไทยถูก) — ทำในตัวเรียก
 */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}
