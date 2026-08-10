/* v1.14 — ด่านอ่าน SQL: สิ่งที่เปิดให้ anon ต้องไม่มีคอลัมน์ต้องห้าม
   วิวใน pub ทำงานด้วยสิทธิ์เจ้าของ จึงข้าม RLS ของตารางแม่
   แปลว่ารายชื่อคอลัมน์ของวิวคือเส้นแบ่งความปลอดภัยทั้งหมด ต้องมีคนเฝ้า */
const fs = require('fs');
/* ชุดนี้ไม่เปิดเบราว์เซอร์ อ่านไฟล์ SQL ตรง ๆ — หา repo จากที่อยู่ของไฟล์ตัวเอง */
const path = require('fs').realpathSync(
  require('path').resolve(__dirname, '../../../supabase/migrations'));
const fails = [];

const files = fs.readdirSync(path).filter(f => f.endsWith('.sql')).sort();
const m14 = files.find(f => /_14_public_api/.test(f));
const m13 = files.find(f => /_13_model_photo/.test(f));
const m12 = files.find(f => /_12_attendance_sites/.test(f));
if (!m14) fails.push('ไม่พบ migration 14');
if (!m13) fails.push('ไม่พบ migration 13');
if (!m12) fails.push('ไม่พบ migration 12');

const sql = m14 ? fs.readFileSync(path + '/' + m14, 'utf8') : '';

/* ---------- 1 · ต้องถอนสิทธิ์ anon ใน public ออกก่อน ---------- */
[/revoke\s+all\s+on\s+all\s+tables\s+in\s+schema\s+public\s+from\s+anon/i,
 /revoke\s+all\s+on\s+all\s+routines\s+in\s+schema\s+public\s+from\s+anon/i,
 /alter\s+default\s+privileges\s+in\s+schema\s+public\s+revoke\s+all\s+on\s+tables\s+from\s+anon/i]
  .forEach((re, i) => { if (!re.test(sql)) fails.push(`ไม่ได้ถอนสิทธิ์ anon ใน public (ข้อ ${i + 1})`); });

/* ---------- 2 · anon ต้องได้สิทธิ์เฉพาะในสคีมา pub ---------- */
const grants = [...sql.matchAll(/grant\s+(select|execute|usage|all)[^;]*?\bto\b[^;]*?anon[^;]*;/gi)].map(x => x[0]);
if (!grants.length) fails.push('ไม่มีการให้สิทธิ์ anon เลย — เว็บขายรถจะดึงอะไรไม่ได้');
grants.forEach(g => {
  const objs = g.replace(/grant\s+\w+\s+on\s+/i, '').split(/\bto\b/i)[0];
  if (/\bpublic\./.test(objs) || /\bschema\s+public\b/i.test(objs))
    fails.push('ให้สิทธิ์ anon กับของในสคีมา public: ' + g.trim().slice(0, 90));
  if (!/pub\./.test(objs) && !/schema\s+pub\b/i.test(objs))
    fails.push('ให้สิทธิ์ anon กับของที่ไม่ได้อยู่ในสคีมา pub: ' + g.trim().slice(0, 90));
});

/* ---------- 3 · คอลัมน์ต้องห้ามต้องไม่โผล่ในสิ่งที่เปิดสาธารณะ ---------- */
const FORBID = ['cost','vat','gross_profit','discount','net_price','freebie_cost',
  'engine_no','frame_no','src_file','recv_no','po_no','supplier_inv_no',
  'tax_id','national_id','salary','bank_account','reject_reason','commission',
  'min_down_pct','rate_tiers','consent_scope'];
/* ดูเฉพาะตัว view กับ RPC ที่ให้ anon ใช้ */
const blocks = [];
const vm = sql.match(/create\s+or\s+replace\s+view\s+pub\.[\s\S]*?;/gi) || [];
const fm = sql.match(/create\s+or\s+replace\s+function\s+pub\.order_status[\s\S]*?\$\$;/i) || [];
blocks.push(...vm, ...fm);
if (!blocks.length) fails.push('ไม่พบวิว/ฟังก์ชันสาธารณะให้ตรวจ');
blocks.forEach(bl => {
  const head = bl.slice(0, 80).replace(/\s+/g, ' ');
  FORBID.forEach(c => {
    /* ยอมให้ปรากฏในคอมเมนต์ได้ (บรรทัดที่ขึ้นต้นด้วย -- หรืออยู่ใน comment on) */
    const lines = bl.split('\n').filter(l => !/^\s*--/.test(l));
    const body = lines.join('\n').replace(/comment\s+on[\s\S]*?;/gi, '');
    if (new RegExp('\\b' + c + '\\b', 'i').test(body))
      fails.push(`พบคอลัมน์ต้องห้าม "${c}" ใน ${head}…`);
  });
  if (/select\s+\*/i.test(bl))
    fails.push(`${head}… ใช้ select * — ต้องเขียนคอลัมน์ทีละชื่อ เพราะรายชื่อคอลัมน์คือเส้นแบ่งความปลอดภัย`);
});

/* ---------- 4 · จำนวนคันต้องถูกยุบเป็นถังในวิว ----------
   ต้องดูเฉพาะ "รายชื่อคอลัมน์ที่วิวคืนออกไป" ไม่ใช่ทั้งก้อน
   ชื่อชั่วคราวใน lateral subquery (เช่น count(*) as n) ไม่เคยออกไปถึงผู้เรียก */
const mv = vm.join('\n');
const outList = (() => {
  const m = mv.match(/\)\s*as\s*\nselect([\s\S]*?)\nfrom\s+public\.model_variant/i);
  return m ? m[1] : '';
})();
if (!outList) fails.push('อ่านรายชื่อคอลัมน์ที่ pub.model คืนออกไปไม่ได้');
if (!/case\s+when[\s\S]*?'order'[\s\S]*?'low'[\s\S]*?'ready'/i.test(mv))
  fails.push('วิว pub.model ไม่ได้ยุบจำนวนคันเป็น order/low/ready');
/* คอลัมน์ที่คืนออกไป (ตัวหลัง as ของแต่ละบรรทัดระดับบนสุด) ต้องไม่ใช่ตัวเลขจำนวน */
const outNames = [...outList.matchAll(/\bas\s+([a-z_]+)\s*(?:,|$)/gim)].map(x => x[1].toLowerCase());
['qty','count','n','stock','instock','branch','branch_code','branch_id'].forEach(bad => {
  if (outNames.indexOf(bad) >= 0)
    fails.push(`วิว pub.model คืนคอลัมน์ "${bad}" ออกไป — จำนวนคันและสาขาต้องไม่ออกสู่สาธารณะ`);
});
if (/\bbranch\b/i.test(outList.replace(/--[^\n]*/g, '')))
  fails.push('รายชื่อคอลัมน์ของ pub.model มีสาขาอยู่ด้วย — คู่แข่งจะรู้ยอดขายรายสาขา');

/* ---------- 5 · กฎเรื่องศักดิ์ศรีของหน้าติดตาม ---------- */
const fn = fm.join('\n');
if (fn) {
  if (!/'กรุณาติดต่อร้าน'/.test(fn))
    fails.push('order_status ไม่มีสถานะ "กรุณาติดต่อร้าน" สำหรับเคสที่ไฟแนนซ์ไม่ผ่าน');
  if (/reject_reason|company_id|finance_company/i.test(fn.replace(/--[^\n]*/g, '')))
    fails.push('order_status แตะข้อมูลการปฏิเสธหรือชื่อบริษัทไฟแนนซ์');
  if (!/security\s+definer/i.test(fn))
    fails.push('order_status ไม่ได้เป็น security definer');
  if (!/set\s+search_path\s*=\s*public/i.test(fn))
    fails.push('order_status ไม่ได้ตรึง search_path');
  if (!/public_lookup_log/.test(fn))  fails.push('order_status ไม่ได้บันทึกการเรียก');
  if (!/interval\s+'1 hour'/.test(fn)) fails.push('order_status ไม่ได้จำกัดอัตราต่อชั่วโมง');
  if (!/digest\(/.test(fn))            fails.push('order_status เก็บไอพีดิบแทนที่จะเก็บแฮช');
  if (/xxx-xxx-/.test(fn) === false)   fails.push('order_status ไม่ได้ปิดบังเบอร์ลูกค้า');
}

/* ---------- 6 · pgcrypto ต้องเรียกแบบระบุสคีมา ---------- */
if (/[^.]\bgen_random_bytes\(/.test(sql.replace(/extensions\.gen_random_bytes\(/g, 'X(')))
  fails.push('เรียก gen_random_bytes โดยไม่ระบุ extensions. — set search_path = public จะหาไม่เจอ');
if (/[^.]\bdigest\(/.test(sql.replace(/extensions\.digest\(/g, 'X(')))
  fails.push('เรียก digest โดยไม่ระบุ extensions.');

/* ---------- 7 · bucket รูปรถต้องอ่านสาธารณะแต่เขียนไม่ได้ ---------- */
if (m13) {
  const s13 = fs.readFileSync(path + '/' + m13, 'utf8');
  if (!/for\s+select[\s\S]{0,80}to\s+anon/i.test(s13)) fails.push('bucket รูปรถอ่านสาธารณะไม่ได้');
  ['insert','update','delete'].forEach(op => {
    const re = new RegExp('for\\s+' + op + '[\\s\\S]{0,160}?is_manager\\(\\)', 'i');
    if (!re.test(s13)) fails.push(`bucket รูปรถ: ${op} ไม่ได้จำกัดด้วย is_manager()`);
  });
  if (/to\s+anon[\s\S]{0,120}for\s+(insert|update|delete)/i.test(s13))
    fails.push('bucket รูปรถให้ anon เขียนได้');
}

console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_SQL_CHECKS_PASS');
console.log(`ตรวจ ${files.length} migration · สาธารณะ ${blocks.length} ก้อน`);
process.exit(fails.length ? 1 : 0);
