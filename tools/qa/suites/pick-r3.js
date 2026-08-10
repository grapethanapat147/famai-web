const { chromium, EXE, BASE } = require('./env');
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const fails = []; p.on('pageerror', e => fails.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(400);

  // ตารางค่างวดมือถือ: ชิปงวด + รายการเรียงถูกไปแพง + ปุ่มใช้ตัวเลือกนี้ยังไหลเข้าฟอร์มขาย
  await p.evaluate(() => { go('sell'); sellTab('p2'); finCompare(); });
  await p.waitForTimeout(250);
  const chips = await p.$$eval('#fTermChips .chip', e => e.map(x => x.dataset.term));
  if (!chips.length) fails.push('fTermChips: no term chips at 390');
  const cards = await p.$$eval('#finCmp .crow', e => e.length);
  if (!cards) fails.push('finCmp: no cards at 390');
  // เรียงจากถูกไปแพงจริงไหม
  const order = await p.$$eval('#finCmp .crow[data-pick] .crr', e => e.map(x => parseFloat(x.textContent.replace(/[^\d.]/g, ''))));
  if (order.length > 1 && order.some((v, i) => i && v < order[i - 1])) fails.push('finCmp cards not sorted cheapest-first: ' + order);
  // เลือกงวด 36 แล้วกดใช้ตัวเลือกแรก
  await p.evaluate(() => { $('#fNet').value = '60000'; $('#fDown').value = '9000'; finCompare(); });
  await p.waitForTimeout(150);
  await p.click('#fTermChips [data-term="36"]'); await p.waitForTimeout(200);
  const pick = await p.$eval('#finCmp .crow[data-pick]', e => e.dataset.pick);
  await p.click('#finCmp .crow[data-pick]'); await p.waitForTimeout(250);
  const form = await p.evaluate(() => ({ pay: $('#sPay').value, term: $('#sTerm').value, fin: $('#sFinCo').value,
    down: $('#sDown').value, p1: $('#p1').classList.contains('on') }));
  if (form.pay !== 'finance') fails.push('pick: sPay=' + form.pay);
  if (form.term !== pick.split('|')[1]) fails.push(`pick: term ${form.term} != ${pick.split('|')[1]}`);
  if (form.fin !== pick.split('|')[0]) fails.push(`pick: finco ${form.fin} != ${pick.split('|')[0]}`);
  if (!form.p1) fails.push('pick: did not switch to p1');

  /* v1.11: กระดานคัมบังของทะเบียน/ไฟแนนซ์ถูกลบไปพร้อมหน้าเก่า
     ความคืบหน้าย้ายไปเป็นแถบไอคอนบนหน้าดีล ตรวจที่ steps-r10 / deal-r10 แทน */
  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
