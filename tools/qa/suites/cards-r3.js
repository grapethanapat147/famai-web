const { chromium, EXE, BASE } = require('./env');
/* ตารางที่ควรเป็นการ์ดที่ 390px: screen -> table ids
   ยกเว้น #stTable ในหน้าสต๊อก — v1.7 เจ้าของสั่งกลับกฎนี้ว่าแท็บ "ตาราง" ต้องเป็นตารางจริง
   4 คอลัมน์พอดีจอ เพื่อกวาดตาดูหลายคันพร้อมกัน จึงย้ายไปตรวจแบบตรงข้ามที่ท้ายไฟล์ */
const WANT = {
  dash:['#recentSales','#chStaff'], recv:['#rRecent'],
  transfer:['#tList'], quote:['#qList'],
  /* v1.11: ลูกค้า/ติดตาม/ทะเบียน/ไฟแนนซ์ รวมเป็นหน้าเดียว — ตารางที่เหลือคือของหน้าดีล */
  deal:['#dlTable','#dlTasks'],
  ar:['#arTable'], service:['#svTable','#svRemind'],
  /* v1.12: อะไหล่ + เบิก/ขาย + ของแถม รวมเป็นสามแท็บในหน้าเดียว */
  parts:['#pTable','#msTable','#gTable'], expense:['#eTable'],
  hr:['#attTable','#lvTable'], payroll:['#prTable','#prComm'],
  users:['#uTable','#roleTable'], imp:['#impLog'], settings:['#vmTable','#fcTable','#siTable'],
};
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const fails = []; p.on('pageerror', e => fails.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(400);
  for (const [screen, ids] of Object.entries(WANT)) {
    await p.evaluate(k => go(k), screen); await p.waitForTimeout(160);
    // เดินทุกแท็บย่อยเพื่อให้ตารางในแต่ละ pane ถูกวาด
    const n = await p.$$eval('.screen.on .tabs button', e => e.length);
    for (let i = 0; i < Math.max(1, n); i++) {
      if (n) { const bs = await p.$$('.screen.on .tabs button'); if (bs[i]) await bs[i].click(); await p.waitForTimeout(160); }
      for (const id of ids) {
        const r = await p.evaluate(sel => { const t = document.querySelector(sel);
          if (!t) return null;
          return { cards: t.querySelectorAll('.crow').length, rows: t.querySelectorAll('tbody tr').length,
                   isCards: t.classList.contains('cards'), empty: !!t.querySelector('.empty') }; }, id);
        if (r && r.rows && !r.isCards && !r.empty) fails.push(`${screen}${n ? ' tab' + i : ''} ${id}: still a table (${r.rows} rows)`);
      }
    }
  }
  /* ข้อยกเว้นที่เจ้าของสั่งกลับใน v1.7 — แท็บ "ตาราง" ในหน้าสต๊อกต้องเป็นตารางจริง
     4 คอลัมน์พอดีจอ 390px ไม่ใช่การ์ด และต้องไม่ทำให้เลื่อนซ้าย-ขวา */
  await p.evaluate(() => { go('stock'); stView = 'table'; rStock(); });
  await p.waitForTimeout(250);
  const st = await p.evaluate(() => {
    const t = document.querySelector('#stTable'); if (!t) return null;
    const head = t.querySelector('thead tr');
    return { cards: t.classList.contains('cards'), narrow: t.classList.contains('stbl'),
      rows: t.querySelectorAll('tbody tr').length, cols: head ? head.children.length : 0,
      overflow: t.scrollWidth - t.clientWidth };
  });
  if (!st) fails.push('stock: ไม่พบ #stTable');
  else {
    if (st.cards)     fails.push('stock #stTable กลายเป็นการ์ด — v1.7 สั่งให้เป็นตารางจริง');
    if (!st.narrow)   fails.push('stock #stTable ไม่ได้ใช้คลาส stbl ของจอแคบ');
    if (!st.rows)     fails.push('stock #stTable ไม่มีแถวเลย');
    if (st.cols !== 4) fails.push(`stock #stTable มี ${st.cols} คอลัมน์ ควรเป็น 4 พอดีจอ`);
    if (st.overflow > 1) fails.push(`stock #stTable ล้นออกข้าง ${st.overflow}px`);
  }

  console.log(fails.length ? 'FAILS:\n' + [...new Set(fails)].join('\n') : 'ALL_TABLES_ARE_CARDS');
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
