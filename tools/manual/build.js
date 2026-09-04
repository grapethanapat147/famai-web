#!/usr/bin/env node
/* สร้างคู่มือการใช้งาน 8 เล่ม (7 บทบาท + 1 เล่มผังกระบวนการ) เป็น PDF ขนาด A4 — FAM-1138
 *
 *   node tools/manual/build.js [--out docs/manual] [--port 3111] [--only sales,flow]
 *
 * เนื้อหาคู่มืออยู่ในแอปเอง (lib/manual/manual.ts) และเรนเดอร์ที่ /dev/manual/<เล่ม>
 * สคริปต์นี้ทำแค่สองอย่าง: เปิดเซิร์ฟเวอร์ dev → สั่ง Chrome พิมพ์แต่ละเล่มเป็น PDF
 * จึงไม่ต้องพึ่ง playwright หรือแพ็กเกจเพิ่ม ใช้ Chrome ที่ติดตั้งอยู่แล้วในเครื่อง
 *
 * ภาพหน้าจอในภาคผนวกคือหน้า /dev/* ที่ฝังมาแบบย่อส่วน (ไม่ใช่ภาพถ่าย) ตัวหนังสือใน PDF จึงคมและค้นหาได้
 * หน้าเหล่านั้นใช้ข้อมูลจำลองล้วน ไม่ต่อฐานข้อมูลจริง — ไม่มีข้อมูลลูกค้าจริงหลุดเข้าคู่มือ
 *
 * ถ้ามี next dev เปิดอยู่แล้วที่พอร์ตนั้น สคริปต์จะใช้ตัวที่เปิดอยู่ (เร็วกว่ามาก):
 *   npm run dev -- -p 3010   แล้ว   node tools/manual/build.js --port 3010
 */
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = path.resolve(ROOT, arg("--out", "docs/manual"));
const PORT = Number(arg("--port", 3111));
const ONLY = (arg("--only", "") || "").split(",").filter(Boolean);
const BASE = `http://127.0.0.1:${PORT}`;

/* เล่มทั้งหมด — ต้องตรงกับ MANUAL_BOOKS ใน lib/manual/manual.ts (tests/manual.test.ts คุมชื่อไฟล์ไว้) */
const BOOKS = [
  ["admin", "คู่มือสำหรับผู้ดูแล"],
  ["manager", "คู่มือสำหรับผู้บริหาร"],
  ["sales", "คู่มือสำหรับเซลล์"],
  ["stock", "คู่มือสำหรับสต๊อก"],
  ["acct", "คู่มือสำหรับบัญชี"],
  ["hr", "คู่มือสำหรับฝ่ายบุคคล"],
  ["tech", "คู่มือสำหรับช่าง"],
  ["flow", "คู่มือผังกระบวนการ"],
];

/* หน้าพรีวิวที่ไม่ใช่หน้าจอในเมนู — ไม่ต้องอุ่นไว้ */
const NOT_A_SCREEN = new Set(["manual", "ui", "capture", "support"]);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error("หา Chrome ไม่เจอ — ตั้งค่า CHROME_PATH ชี้ไปที่ไฟล์โปรแกรม Chrome ก่อน");
  }
  return found;
}

const CHROME = findChrome();
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), "famai-manual-"));

function printPdf(url, file) {
  const res = spawnSync(
    CHROME,
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      `--user-data-dir=${PROFILE}`,
      "--no-pdf-header-footer",
      "--virtual-time-budget=45000",
      `--print-to-pdf=${file}`,
      url,
    ],
    { encoding: "utf8", timeout: 180_000 },
  );
  if (!fs.existsSync(file)) {
    throw new Error(`พิมพ์ ${url} ไม่สำเร็จ: ${String(res.stderr).slice(-400)}`);
  }
}

async function alive() {
  try {
    const res = await fetch(`${BASE}/dev/manual`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** อุ่นหน้าไว้ก่อนพิมพ์ — dev server คอมไพล์ทีละหน้าตอนเปิดครั้งแรก ไม่อุ่นจะได้ภาพตอนกำลังโหลด */
async function warm(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(120_000) });
  } catch {
    /* หน้าที่อุ่นไม่ผ่านจะไปแสดงผลตอนพิมพ์เองตามปกติ */
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  let server = null;
  if (await alive()) {
    console.log(`ใช้เซิร์ฟเวอร์ที่เปิดอยู่แล้วที่ ${BASE}`);
  } else {
    console.log(`เปิด next dev ที่พอร์ต ${PORT} …`);
    server = spawn(path.join(ROOT, "node_modules", ".bin", "next"), ["dev", "--port", String(PORT)], {
      cwd: ROOT,
      env: { ...process.env, TZ: "Asia/Bangkok" },
      stdio: "ignore",
    });
    for (let i = 0; i < 240 && !(await alive()); i += 1) {
      if (i === 239) {
        throw new Error("รอเซิร์ฟเวอร์ dev เกิน 2 นาทีแล้วยังไม่พร้อม");
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  try {
    /* อุ่นทุกหน้าพรีวิวก่อน เพราะภาคผนวกฝังหน้าเหล่านี้เป็น iframe */
    const screens = fs
      .readdirSync(path.join(ROOT, "app", "dev"), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !NOT_A_SCREEN.has(d.name))
      .map((d) => d.name)
      .sort();
    console.log(`อุ่นหน้าพรีวิว ${screens.length} หน้า (ครั้งแรกช้าเพราะ dev server คอมไพล์ทีละหน้า) …`);
    for (const key of screens) {
      await warm(`${BASE}/dev/${key}`);
    }

    const built = [];
    for (const [key, title] of BOOKS) {
      if (ONLY.length > 0 && !ONLY.includes(key)) {
        continue;
      }
      const url = `${BASE}/dev/manual/${key}`;
      await warm(url);
      const file = path.join(OUT, `famai-${key}.pdf`);
      printPdf(url, file);
      const bytes = fs.statSync(file).size;
      built.push({ file: `famai-${key}.pdf`, title, bytes });
      console.log(`✓ famai-${key}.pdf  (${title}, ${(bytes / 1024).toFixed(0)} KB)`);
    }

    if (ONLY.length === 0) {
      fs.writeFileSync(
        path.join(OUT, "index.json"),
        `${JSON.stringify({ built: new Date().toISOString(), source: "/dev/manual", files: built }, null, 2)}\n`,
      );
    }
    const total = built.reduce((s, b) => s + b.bytes, 0);
    console.log(`\nได้ ${built.length} ไฟล์ รวม ${(total / 1048576).toFixed(2)} MB ที่ ${path.relative(ROOT, OUT)}/`);
  } finally {
    if (server) {
      server.kill("SIGTERM");
    }
    fs.rmSync(PROFILE, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
