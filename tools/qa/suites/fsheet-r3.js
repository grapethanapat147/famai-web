const { chromium, EXE, BASE } = require('./env');
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const fails = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => fails.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(400);

  // --- รายงาน ---
  await p.evaluate(() => go('report')); await p.waitForTimeout(300);
  if (!await p.isVisible('#rpFilt')) fails.push('report: ตัวกรอง button hidden at 390');
  if (await p.isVisible('#rpMonth')) fails.push('report: rpMonth still in header at 390');
  const sum0 = await p.$eval('#rpFsum', e => e.textContent.trim());
  if (!sum0) fails.push('report: summary line empty');
  await p.click('#rpFilt'); await p.waitForTimeout(300);
  if (!await p.$eval('#fsheet', e => e.classList.contains('on'))) fails.push('report: sheet did not open');
  if (!await p.$eval('body', e => e.classList.contains('lock'))) fails.push('report: body.lock missing');
  const inSheet = await p.evaluate(() => !!document.querySelector('#fsBody #rpMonth'));
  if (!inSheet) fails.push('report: rpMonth not moved into sheet');
  // เปลี่ยนสาขาแล้วรายงานต้องวาดใหม่
  const before = await p.$eval('#rpTable', e => e.innerHTML.length);
  await p.evaluate(() => { const s = $('#rpBranch'); if (s.options.length > 1) { s.value = s.options[1].value; s.onchange(); } });
  await p.waitForTimeout(250);
  const sumAfter = await p.$eval('#rpFsum', e => e.textContent);
  await p.click('#fsDone'); await p.waitForTimeout(300);
  if (await p.$eval('#fsheet', e => e.classList.contains('on'))) fails.push('report: sheet did not close');
  if (await p.$eval('body', e => e.classList.contains('lock'))) fails.push('report: body.lock stuck after close');
  const backHome = await p.evaluate(() => { const el = document.querySelector('#rpMonth');
    return !!(el && el.closest('.card') && el.closest('.hd')); });
  if (!backHome) fails.push('report: rpMonth not returned to header');
  const sum1 = await p.$eval('#rpFsum', e => e.textContent.trim());
  if (!sum1 || sum1 === sum0) fails.push(`report: summary did not update (${sum0} -> ${sum1})`);

  // แท็บ daily: แถววันที่ต้องโผล่ แถวเดือนต้องซ่อน
  await p.evaluate(() => { RP_SEL = 'daily'; rReport(); }); await p.waitForTimeout(200);
  await p.click('#rpFilt'); await p.waitForTimeout(300);
  const rows = await p.evaluate(() => ({
    day: getComputedStyle(document.querySelector('#rpDay').closest('.fsrow')).display,
    month: getComputedStyle(document.querySelector('#rpMonth').closest('.fsrow')).display }));
  if (rows.day === 'none') fails.push('daily: rpDay row hidden in sheet');
  if (rows.month !== 'none') fails.push('daily: rpMonth row should be hidden in sheet');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);

  // ออกจากหน้าไปหน้าอื่นขณะแผ่นเปิด ต้องไม่ทิ้ง control ค้าง
  await p.click('#rpFilt'); await p.waitForTimeout(250);
  await p.evaluate(() => go('dash')); await p.waitForTimeout(250);
  const stranded = await p.evaluate(() => !!document.querySelector('#fsBody .inp'));
  if (stranded) fails.push('control stranded in sheet after navigating away');

  // --- ลูกค้าและดีล (v1.11 รวมตัวกรองของติดตาม/ทะเบียน/ไฟแนนซ์ไว้ชุดเดียว) ---
  for (const [screen, btn, sum, tabIdx] of [['deal', '#dlFilt', '#dlFsum', null]]) {
    await p.evaluate(k => go(k), screen); await p.waitForTimeout(250);
    if (tabIdx != null) { const bs = await p.$$('.screen.on .tabs button'); await bs[tabIdx].click(); await p.waitForTimeout(250); }
    if (!await p.isVisible(btn)) { fails.push(`${screen}: ${btn} not visible`); continue; }
    await p.click(btn); await p.waitForTimeout(300);
    if (!await p.$eval('#fsheet', e => e.classList.contains('on'))) fails.push(`${screen}: sheet did not open`);
    const n = await p.$$eval('#fsBody .fsrow', e => e.length);
    if (!n) fails.push(`${screen}: sheet empty`);
    await p.click('#fsDone'); await p.waitForTimeout(300);
    const s = await p.$eval(sum, e => e.textContent.trim());
    if (!s) fails.push(`${screen}: summary line empty`);
  }

  // เดสก์ท็อป: ต้องไม่มีปุ่มตัวกรอง ตัวกรองอยู่ในหัวการ์ดตามเดิม
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(400);
  await p.evaluate(() => go('report')); await p.waitForTimeout(300);
  if (await p.isVisible('#rpFilt')) fails.push('desktop: ตัวกรอง button should be hidden');
  // rpMonth ถูกซ่อนโดยตั้งใจในแท็บปิดยอดรายวัน — ใช้ rpBranch ที่โชว์ทุกแท็บเป็นตัวตรวจ
  if (!await p.isVisible('#rpBranch')) fails.push('desktop: rpBranch should be in header');
  await p.evaluate(() => { RP_SEL = 'sales'; rReport(); }); await p.waitForTimeout(200);
  if (!await p.isVisible('#rpMonth')) fails.push('desktop: rpMonth should be in header on month-based tabs');

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
