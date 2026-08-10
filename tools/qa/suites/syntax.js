/* ด่านไวยากรณ์ — `node --check` ไม่รับไฟล์ .html จึงต้องดึง <script> ออกมาคอมไพล์เอง
   ชุดนี้เร็วที่สุดและควรผ่านก่อนเสมอ ถ้าตัวนี้แดง ชุดอื่นแดงตามหมดโดยไม่มีความหมาย */
const fs = require('fs'), vm = require('vm'), path = require('path');
const FILE = path.resolve(__dirname, '../../../index.html');
const html = fs.readFileSync(FILE, 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
if (!blocks.length) { console.log('FAILS:\nไม่พบ <script> ใน index.html'); process.exit(1); }
blocks.forEach((code, i) => {
  try { new vm.Script(code, { filename: `index.html#script${i}` }); }
  catch (e) { console.log(`FAILS:\nไวยากรณ์ผิดใน script ${i}: ${e.message}`); process.exit(1); }
});
console.log(`ALL_CHECKS_PASS (${blocks.length} script block)`);
