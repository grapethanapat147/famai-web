#!/usr/bin/env node
/* ตัวรันด่านตรวจทั้งหมด
 *
 *   node tools/qa/run.js              รันทุกชุด
 *   node tools/qa/run.js geo clock    รันเฉพาะชุดที่ชื่อมีคำนี้
 *   node tools/qa/run.js --list       ดูรายชื่อเฉย ๆ
 *   node tools/qa/run.js --jobs 1     รันทีละชุด (ค่าเริ่มต้น 3)
 *
 * ตัวรันเปิดเซิร์ฟเวอร์ static ที่ 8123 ให้เอง **จาก repo root** แล้วปิดให้ตอนจบ
 * (ต้องเสิร์ฟจาก root ไม่ใช่จากโฟลเดอร์ย่อย ไม่งั้น index.html หา asset ไม่เจอ)
 * ถ้ามีเซิร์ฟเวอร์อยู่แล้วที่พอร์ตนั้น จะใช้ตัวเดิมและไม่ไปปิดของใคร
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT   = path.resolve(__dirname, '../..');
const SUITES = path.join(__dirname, 'suites');
const PORT   = +(process.env.QA_PORT || 8123);
const BASE   = process.env.QA_URL || `http://localhost:${PORT}`;

const argv = process.argv.slice(2);
const LIST = argv.includes('--list');
const ji   = argv.indexOf('--jobs');
const JOBS = ji >= 0 ? Math.max(1, +argv[ji + 1] || 1) : 3;
const pick = argv.filter((a, i) => !a.startsWith('--') && !(ji >= 0 && i === ji + 1));

const all = fs.readdirSync(SUITES)
  .filter(f => f.endsWith('.js') && f !== 'env.js')
  .sort();
const suites = pick.length ? all.filter(f => pick.some(p => f.includes(p))) : all;

if (LIST || !suites.length) {
  console.log(all.map(f => '  ' + f.replace(/\.js$/, '')).join('\n'));
  if (!suites.length && pick.length) { console.error('\nไม่มีชุดที่ตรงกับ: ' + pick.join(' ')); process.exit(1); }
  process.exit(0);
}

const up = () => new Promise(res => {
  const r = http.get(BASE + '/index.html', s => { s.resume(); res(s.statusCode === 200); });
  r.on('error', () => res(false));
  r.setTimeout(1000, () => { r.destroy(); res(false); });
});

const wait = ms => new Promise(r => setTimeout(r, ms));

function run(file) {
  return new Promise(res => {
    const t0 = Date.now();
    const p = spawn(process.execPath, [path.join(SUITES, file)], {
      cwd: ROOT, env: { ...process.env, QA_URL: BASE } });
    let out = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => out += d);
    p.on('close', code => res({ file, code, out: out.trim(), sec: ((Date.now() - t0) / 1000).toFixed(0) }));
  });
}

(async () => {
  let server = null;
  if (!(await up())) {
    console.log(`เปิดเซิร์ฟเวอร์ทดสอบที่ ${BASE} จาก ${ROOT}`);
    server = spawn('python3', ['-m', 'http.server', String(PORT)],
      { cwd: ROOT, stdio: 'ignore', detached: true });
    for (let i = 0; i < 25 && !(await up()); i++) await wait(200);
    if (!(await up())) { console.error('เปิดเซิร์ฟเวอร์ไม่สำเร็จ'); process.exit(2); }
  } else {
    console.log(`ใช้เซิร์ฟเวอร์ที่เปิดอยู่แล้วที่ ${BASE}`);
  }

  const results = [];
  try {
    const queue = suites.slice();
    await Promise.all(Array.from({ length: Math.min(JOBS, queue.length) }, async () => {
      while (queue.length) {
        const f = queue.shift();
        const r = await run(f);
        results.push(r);
        const name = r.file.replace(/\.js$/, '');
        console.log(`${r.code === 0 ? '  ✓' : '  ✗'} ${name.padEnd(20)} ${String(r.sec).padStart(3)}s`);
      }
    }));
  } finally {
    if (server) { try { process.kill(-server.pid); } catch (_) {} }
  }

  results.sort((a, b) => a.file.localeCompare(b.file));
  const bad = results.filter(r => r.code !== 0);
  if (bad.length) {
    console.log('\n' + '─'.repeat(60));
    for (const r of bad) console.log(`\n### ${r.file}\n${r.out}`);
  }
  console.log('\n' + '─'.repeat(60));
  console.log(`ผ่าน ${results.length - bad.length}/${results.length} ชุด` +
              (bad.length ? ` · ตก: ${bad.map(r => r.file.replace(/\.js$/, '')).join(' ')}` : ' — ผ่านหมด'));
  process.exit(bad.length ? 1 : 0);
})();
