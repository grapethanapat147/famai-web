import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * README บอกจำนวนไฟล์ migration และหมายเลขล่าสุด — เกรพใช้ตัวเลขนี้ตรวจว่ารัน SQL ครบหรือยัง
 * ตัวเลขนี้ค้างมาแล้วสองรอบ (FAM-1135 แก้ครั้งหนึ่ง แล้วค้างอีกทันทีที่ migration 38 เข้ามา)
 * เทสต์นี้ผูกตัวเลขใน README กับโฟลเดอร์จริง จะได้ไม่ต้องมาไล่แก้ด้วยมืออีก (FAM-1140)
 */

const ROOT = process.cwd();

function migrationFiles(): string[] {
  return fs
    .readdirSync(path.join(ROOT, "supabase", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** ชื่อไฟล์รูปแบบ <timestamp>_<เลขลำดับ>_<ชื่อ>.sql — เอาเลขลำดับออกมา */
function serialOf(file: string): number | null {
  const m = /^\d+_(\d+)_/.exec(file);
  return m ? Number(m[1]) : null;
}

describe("ตัวเลข migration ใน README ตรงกับของจริง", () => {
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const line = readme.split("\n").find((l) => l.includes("supabase/migrations/`"));

  it("README มีบรรทัดที่บอกจำนวน migration", () => {
    expect(line, "หาบรรทัด `supabase/migrations/` ใน README ไม่เจอ").toBeTruthy();
    expect(line).toMatch(/\*\*\d+ ไฟล์ \(หมายเลขล่าสุด \d+\)/);
  });

  it("จำนวนไฟล์และหมายเลขล่าสุดตรงกับโฟลเดอร์ supabase/migrations", () => {
    const m = /\*\*(\d+) ไฟล์ \(หมายเลขล่าสุด (\d+)\)/.exec(line ?? "");
    expect(m, "รูปแบบข้อความใน README เปลี่ยนไป — แก้เทสต์นี้ให้ตรงด้วย").toBeTruthy();

    const files = migrationFiles();
    const serials = files.map(serialOf).filter((n): n is number => n !== null);
    expect(Number(m?.[1]), "จำนวนไฟล์ใน README ไม่ตรงกับของจริง").toBe(files.length);
    expect(Number(m?.[2]), "หมายเลขล่าสุดใน README ไม่ตรงกับของจริง").toBe(Math.max(...serials));
  });

  it("เลขลำดับ migration ไม่ซ้ำกัน (กันสองสาขาใช้เลขเดียวกัน)", () => {
    const serials = migrationFiles().map(serialOf).filter((n): n is number => n !== null);
    expect(new Set(serials).size).toBe(serials.length);
  });
});
