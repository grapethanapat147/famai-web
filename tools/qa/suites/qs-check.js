/* v1.15 — ตัวอย่าง "เริ่มใน 5 นาที" ใน docs/07-public-api.md ต้องใช้ได้จริง
   คู่มือที่บอกว่า "คัดลอกไปวางแล้วได้เลย" คือโค้ดที่ไม่มีใครรัน จนกว่าจะมีด่านตรวจ
   รอบ v1.15 เจอว่าตัวอย่างลืมใส่ Accept-Profile: pub ทุกอัน จึงยิงไป public.model
   ที่คนนอกแตะไม่ได้ ได้ 404 ทุกคำขอ — ชุดนี้เกิดมาเพื่อกันไม่ให้พลาดซ้ำ

   ดึงบล็อก HTML ออกจากตัวคู่มือตรง ๆ ไม่ได้เขียนใหม่ แก้คู่มือให้ผิดเมื่อไหร่ก็แดงทันที
   เบราว์เซอร์ในกล่องทดสอบออกเน็ตไม่ได้ จึงดักคำขอแล้วป้อน payload ที่เก็บไว้แทน
   แต่ยังตรวจ "หัวข้อคำขอ" ว่าตรงกับที่เซิร์ฟเวอร์ต้องการ ซึ่งเป็นจุดที่เคยพลาด */
const { chromium, EXE } = require('./env');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const DOC  = path.join(ROOT, 'docs/07-public-api.md');
const LIVE = fs.readFileSync(path.join(__dirname, 'fixtures/pub-model.json'), 'utf8');

(async () => {
  const fails = [], errs = [];

  const md = fs.readFileSync(DOC, 'utf8');
  const m = md.match(/```html\n([\s\S]*?)```/);
  if (!m) { console.log('FAILS:\nหาบล็อก html ในคู่มือไม่เจอ'); process.exit(1); }
  const html = m[1]
    .replace('https://<โปรเจกต์>.supabase.co', 'https://example.supabase.co')
    .replace('<publishable key>', 'sb_publishable_TEST');

  const b = await chromium.launch({ executablePath: EXE });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  let seen = null;
  await p.route('**://*.supabase.co/**', route => {
    seen = { url: route.request().url(), headers: route.request().headers() };
    route.fulfill({ status: 200, contentType: 'application/json', body: LIVE });
  });
  await p.setContent(html, { waitUntil: 'load' });
  await p.waitForFunction(() => document.querySelectorAll('.card').length > 0, { timeout: 10000 })
        .catch(() => fails.push('ไม่มีการ์ดขึ้นเลยใน 10 วินาที'));

  /* ---------- 1 · คำขอที่ตัวอย่างยิงออกไป ต้องเป็นคำขอที่เซิร์ฟเวอร์ยอมรับ ---------- */
  if (!seen) fails.push('ตัวอย่างไม่ได้ยิงคำขอไปที่ Supabase เลย');
  else {
    if ((seen.headers['accept-profile'] || '') !== 'pub')
      fails.push('ขาด Accept-Profile: pub → ของจริงจะได้ 404 public.model');
    if (!seen.headers['apikey']) fails.push('ขาด apikey');
    if (!/\/rest\/v1\/model\b/.test(seen.url)) fails.push('ยิงผิด endpoint: ' + seen.url);
  }

  /* ---------- 2 · วาดข้อมูลจริงออกมาถูก ---------- */
  const r = await p.evaluate(() => ({
    cards: document.querySelectorAll('.card').length,
    tags: [...new Set([...document.querySelectorAll('.tag')].map(e => e.textContent))],
    first: (document.querySelector('.card') || {}).innerText,
    text: document.body.innerText
  }));
  const want = JSON.parse(LIVE).length;
  if (r.cards !== want) fails.push(`ได้ ${r.cards} การ์ด ควรเป็น ${want}`);
  if (r.tags.some(t => !['มีรถพร้อมส่ง', 'เหลือน้อย', 'สั่งจอง'].includes(t)))
    fails.push('ป้ายสต๊อกเพี้ยน: ' + JSON.stringify(r.tags));
  if (/undefined|NaN|\[object/.test(r.text)) fails.push('มีค่าเพี้ยนบนหน้า (undefined/NaN)');
  if (!/฿/.test(r.text)) fails.push('ไม่มีราคาขึ้นเลย');

  /* ---------- 3 · ของต้องห้ามต้องไม่มีทางโผล่ เพราะ API ไม่ได้ส่งมาตั้งแต่ต้น ---------- */
  for (const w of ['cost', 'ต้นทุน', 'gross', 'engine_no', 'frame_no', 'เลขเครื่อง', 'เลขถัง', 'vat'])
    if (r.text.toLowerCase().includes(w.toLowerCase())) fails.push('คำต้องห้ามโผล่บนหน้า: ' + w);
  if (/\bready\b|\blow\b|\border\b/.test(r.text)) fails.push('ค่าดิบของ availability หลุดออกจอ');

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
