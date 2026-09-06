import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ลิสต์ที่ผู้ใช้เห็นต้องเรียงแบบคาดเดาได้เสมอ — FAM-1151
 *
 * สองเรื่องที่กันไว้:
 * 1) ลิสต์ระเบียนที่สะสมตามเวลา ต้องเอา "ใหม่ล่าสุด" ขึ้นบน (ไม่ใช่เก่าสุด)
 * 2) query ที่ไม่มี ORDER BY เลย Postgres ไม่รับประกันลำดับ — แถวสลับที่ได้ทุกครั้งที่โหลด
 *
 * ตรวจที่ระดับซอร์สเพราะเทสต์ในโปรเจกต์ไม่ต่อฐานข้อมูล
 * หมายเหตุ: บางหน้าเรียงฝั่ง client หลังประกอบแถว (งานทะเบียนเรียงตามวันค้าง ·
 * พนักงาน/ภาพรวมการเข้างานเรียงตามชื่อ · เงินเดือนเรียงตามยอดสุทธิ · รุ่นรถมีตัวเลือกเรียงของตัวเอง)
 * จึงไม่นับรวมที่นี่ — ที่นี่คุมเฉพาะลำดับที่มาจาก SQL
 */

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/** [ไฟล์, ตาราง, คอลัมน์วันที่] — ทุกอันต้องเป็น ascending: false */
const NEWEST_FIRST: [string, string, string][] = [
  ["app/(app)/stock/page.tsx", "motorcycle_unit", "received_at"],
  ["app/(app)/deal/page.tsx", "sale", "sold_at"],
  ["app/(app)/quote/page.tsx", "quotation", "quote_date"],
  ["app/(app)/expense/page.tsx", "expense", "spent_at"],
  ["app/(app)/wholesale/page.tsx", "wholesale_order", "sold_at"],
  ["app/(app)/transfer/page.tsx", "unit_transfer", "requested_at"],
  ["app/(app)/audit/page.tsx", "audit_log", "at"],
  ["app/(app)/service/page.tsx", "service_job", "checked_in_at"],
  ["app/(app)/acct/page.tsx", "document", "doc_no"],
];

describe("ลิสต์ระเบียนเรียงใหม่ล่าสุดขึ้นบน (FAM-1151)", () => {
  it.each(NEWEST_FIRST)("%s: %s เรียงตาม %s จากใหม่ไปเก่า", (file, _table, column) => {
    const src = read(file);
    const re = new RegExp(`\\.order\\("${column}",\\s*\\{[^}]*ascending:\\s*false`);
    expect(src, `${file} ต้องมี .order("${column}", { ascending: false })`).toMatch(re);
  });

  it("ไม่มีลิสต์ไหนหลงเหลือ ascending: true บนคอลัมน์วันที่", () => {
    const dateCols = new Set(NEWEST_FIRST.map(([, , c]) => c));
    const offenders: string[] = [];
    for (const [file] of NEWEST_FIRST) {
      for (const m of read(file).matchAll(/\.order\("(\w+)",\s*\{[^}]*ascending:\s*true/g)) {
        if (dateCols.has(m[1])) {
          offenders.push(`${file} → ${m[1]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
