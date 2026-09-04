import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ฟอนต์ต้อง self-host ผ่าน next/font ทุกตัว — FAM-1143
 * ถ้า --f-mono หลุดกลับไปเป็นฟอนต์ระบบล้วน พนักงานคนละเครื่องจะเห็นเลขเครื่องคนละแบบ
 * (แมคเห็น SF Mono · วินโดวส์เห็นอย่างอื่น) และเลข 0/O 1/l จะแยกยากไม่เท่ากัน
 */
const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("ฟอนต์ของระบบ", () => {
  it("--f-mono ใช้ฟอนต์ที่ self-host เป็นตัวแรก แล้วค่อยตกไปฟอนต์ระบบ", () => {
    const line = read("app/globals.css").split("\n").find((l) => l.includes("--f-mono:"));
    expect(line, "หา --f-mono ใน globals.css ไม่เจอ").toBeTruthy();
    expect(line).toMatch(/--f-mono:\s*var\(--f-roboto-mono\)/);
    expect(line, "ต้องมีฟอนต์ระบบไว้ตกกรณีโหลดไม่ทัน").toContain("monospace");
  });

  it("layout ประกาศ Roboto Mono และผูกตัวแปรไว้ที่ <html>", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toMatch(/Roboto_Mono\(\{[^}]*variable:\s*"--f-roboto-mono"/);
    expect(layout).toContain("${robotoMono.variable}");
  });

  it("ไม่มีการเรียกฟอนต์จาก Google ตอนรันไทม์ (self-host ตอน build เท่านั้น)", () => {
    const layout = read("app/layout.tsx");
    expect(layout).not.toContain("fonts.googleapis.com");
    expect(layout).not.toContain("fonts.gstatic.com");
  });
});
