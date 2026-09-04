import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * ชั้นซ้อนเต็มจอที่ถูกเปิดจากแถบบน ต้องแขวนใต้ <body> ด้วย portal — FAM-1142
 *
 * ทำไม: element ที่ position:fixed จะยึดกับ ancestor ที่มี transform / filter / backdrop-filter
 * แทนที่จะยึดกับหน้าจอ (CSS containing block)
 * ของจริงที่เจอ: แถบบน (`components/shell/TopBar.tsx`) มี `backdrop-blur`
 * → ปุ่มแคปหน้าจอบนแถบนั้นเปิด Modal แล้ว popup ถูกบีบให้สูงเท่าแถบบน (วัดได้ 280×56 แทน 280×895)
 *
 * ไม่มี jsdom ในโปรเจกต์ (เทสต์เป็น pure logic ล้วน) จึงกันการถอยหลังที่ระดับซอร์สแทน
 */

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

/** คอมโพเนนต์ที่ถูกเรนเดอร์จากแถบบน (ancestor มี backdrop-blur) — ต้อง portal เท่านั้น */
const MUST_PORTAL = ["components/ui/Modal.tsx", "components/search/SearchLauncher.tsx"];

/**
 * ไฟล์อื่นที่วาดชั้นซ้อนเต็มจอ — วันนี้ยังไม่ต้อง portal เพราะไม่ได้อยู่ใต้ ancestor ที่มี
 * transform/filter/backdrop-filter (ตรวจแล้วใน FAM-1142) แต่ถ้ามีไฟล์ใหม่โผล่มา ต้องมาตรวจซ้ำ
 * ว่ามันถูกเรนเดอร์ตรงไหน ถ้าอยู่ใต้แถบที่เบลอเมื่อไหร่ ต้องย้ายไป portal
 */
const OTHER_OVERLAYS = [
  "components/capture/CaptureButton.tsx",
  "components/shell/MobileNav.tsx",
  "components/ui/Drawer.tsx",
  "components/ui/FilterBar.tsx",
];

function filesWithFullScreenOverlay(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(rel);
      } else if (entry.name.endsWith(".tsx") && /className="[^"]*\bfixed inset-0\b/.test(read(rel))) {
        found.push(rel);
      }
    }
  };
  ["components", "app"].forEach(walk);
  return found.sort();
}

describe("ชั้นซ้อนที่เปิดจากแถบบนต้องใช้ portal (FAM-1142)", () => {
  it.each(MUST_PORTAL)("%s เรนเดอร์ผ่าน createPortal ไปที่ document.body", (file) => {
    const src = read(file);
    expect(src, `${file} ต้อง import createPortal`).toMatch(/import\s*\{[^}]*createPortal[^}]*\}\s*from\s*"react-dom"/);
    expect(src, `${file} ต้องส่ง document.body เป็นปลายทางของ portal`).toContain("document.body");
  });

  it("แถบบนยังมี backdrop-blur อยู่ — เหตุผลที่ต้อง portal ยังเป็นจริง", () => {
    expect(read("components/shell/TopBar.tsx")).toContain("backdrop-blur");
  });

  it("มีชั้นซ้อนเต็มจอเท่าที่รู้จัก — ไฟล์ใหม่ต้องมาตรวจว่าต้อง portal ไหม", () => {
    expect(filesWithFullScreenOverlay()).toEqual([...MUST_PORTAL, ...OTHER_OVERLAYS].sort());
  });
});
