const { chromium, EXE, BASE } = require('./env');
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const fails = [], errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(400);

  // ---------- ข้อมูล seed ----------
  const seed = await p.evaluate(() => {
    const dates = [...new Set(ATT.map(a => a.date))].sort();
    const withSec = ATT.filter(a => a.in && a.in.split(':').length === 3).length;
    const inCount = ATT.filter(a => a.in).length;
    return { rows: ATT.length, days: dates.length, first: dates[0], last: dates[dates.length - 1],
      withSec, inCount, sunday: dates.filter(d => new Date(d + 'T00:00:00').getDay() === 0).length,
      dupes: ATT.length - new Set(ATT.map(a => a.staffId + '|' + a.date)).size };
  });
  if (seed.days < 30) fails.push('seed: only ' + seed.days + ' distinct days');
  /* วันสุดท้ายของ seed ต้องเป็น "วันทำงานล่าสุดที่ไม่เกินวันนี้" ไม่ใช่ "วันนี้" เฉย ๆ
     ร้านปิดวันอาทิตย์ ถ้าวันนี้เป็นอาทิตย์ วันสุดท้ายย่อมเป็นเสาร์ — ไม่ใช่บั๊ก */
  const lastWork = await p.evaluate(() => {
    let d = curDate();
    for (let i = 0; i < 8; i++) { if (isWorkDay(d)) return d; d = addDays(d, -1); }
    return curDate();
  });
  if (seed.last !== lastWork)
    fails.push(`seed: วันสุดท้าย ${seed.last} ควรเป็นวันทำงานล่าสุด ${lastWork}`);
  if (seed.sunday) fails.push('seed: ' + seed.sunday + ' Sunday rows — shop is closed');
  if (seed.dupes) fails.push('seed: ' + seed.dupes + ' duplicate staffId+date keys');
  if (seed.withSec !== seed.inCount) fails.push(`seed: ${seed.inCount - seed.withSec} punches without seconds`);

  // ---------- toSec / ผ่อนผัน 5 นาที ----------
  const grace = await p.evaluate(() => {
    CFG.lateGrace = 5; CFG.workIn = '08:30'; CFG.workOut = '17:30';
    const mk = t => ({ in: t, out: '17:30:00' });
    return { s: toSec('08:33:20'), on: attCalc(mk('08:30:00')).late, at33: attCalc(mk('08:33:00')).late,
      at35: attCalc(mk('08:35:00')).late, at3501: attCalc(mk('08:35:01')).late, at36: attCalc(mk('08:36:00')).late,
      lateMin36: attCalc(mk('08:36:00')).lateMin };
  });
  if (grace.s !== 8 * 3600 + 33 * 60 + 20) fails.push('toSec wrong: ' + grace.s);
  if (grace.on || grace.at33 || grace.at35) fails.push('grace: should not be late at 08:30/08:33/08:35');
  if (!grace.at3501) fails.push('grace: 08:35:01 must be late (seconds must count)');
  if (!grace.at36) fails.push('grace: 08:36 must be late');
  if (Math.abs(grace.lateMin36 - 1) > 0.001) fails.push('grace: 08:36 lateMin = ' + grace.lateMin36 + ' expected 1');

  // ---------- OT คิดจากเวลาเลิกงาน ไม่ใช่เลข 8.5 ลอย ๆ ----------
  const ot = await p.evaluate(() => {
    const c = attCalc({ in: '08:30:00', out: '19:00:30' });
    return { otH: c.otH, hrs: c.hrs };
  });
  if (Math.abs(ot.otH - 1.5083333) > 0.001) fails.push('OT hours = ' + ot.otH + ' expected 1.5083 (19:00:30 − 17:30)');
  if (Math.abs(ot.hrs - 10.508333) > 0.001) fails.push('worked hours = ' + ot.hrs);

  // ---------- ไม่ตอกบัตร = ไม่มีชั่วโมง (เลิกแถม 8 ชม.) ----------
  const gift = await p.evaluate(() => {
    const id = 'ST_TEST_' + Date.now();
    STAFF.push({ id, name: 'ทดสอบ ไม่ตอกบัตร', nick: 'ทดสอบ', role: 'tech', branch: 'FMG01', salary: 30000, bank: '-', ssn: '-' });
    const ym = curDate().slice(0, 7);
    const m = attMonth(id, ym);
    const r = prCalc(ym).find(x => x.s.id === id);
    STAFF.pop();
    return { hrs: m.hrs, workDays: m.workDays, missDays: m.missDays, ot: r.ot, lateD: r.lateD, net: r.net, base: r.base, ssn: r.ssn };
  });
  if (gift.hrs !== 0 || gift.workDays !== 0) fails.push('no-punch staff got hours: ' + JSON.stringify(gift));
  if (gift.ot !== 0 || gift.lateD !== 0) fails.push('no-punch staff got OT/late money: ' + JSON.stringify(gift));
  if (gift.net !== gift.base - gift.ssn) fails.push('no-punch net wrong: ' + JSON.stringify(gift));

  // ---------- เงินเดือนตรงกับที่คำนวณมือจาก ATT จริง ----------
  const pay = await p.evaluate(() => {
    const ym = curDate().slice(0, 7), today = curDate();
    const s = STAFF[0];
    // สูตรอิสระ: เดินทุกแถวของเดือนนี้ตรงจาก ATT
    let otSec = 0, lateSec = 0, hrs = 0, wd = 0;
    const inRef = toSec(CFG.workIn), outRef = toSec(CFG.workOut), g = CFG.lateGrace * 60;
    ATT.filter(a => a.staffId === s.id && a.date.slice(0, 7) === ym && a.date <= today && a.in && a.status !== 'ลา')
      .forEach(a => { wd++;
        const i = toSec(a.in), o = a.out ? toSec(a.out) : 0;
        if (o > i) hrs += (o - i) / 3600;
        if (o) otSec += Math.max(0, o - outRef);
        lateSec += Math.max(0, i - inRef - g); });
    const hourly = s.salary / 30 / 8;
    const expOt = Math.round(otSec / 3600 * hourly * CFG.otRate);
    const expLate = Math.round(lateSec / 60 * (hourly / 60));
    const r = prCalc(ym).find(x => x.s.id === s.id);
    return { expOt, expLate, gotOt: r.ot, gotLate: r.lateD, expWd: wd, gotWd: r.att.workDays,
      expHrs: +hrs.toFixed(4), gotHrs: +r.att.hrs.toFixed(4) };
  });
  if (pay.gotOt !== pay.expOt) fails.push(`payroll OT ${pay.gotOt} != hand-calc ${pay.expOt}`);
  if (pay.gotLate !== pay.expLate) fails.push(`payroll late ${pay.gotLate} != hand-calc ${pay.expLate}`);
  if (pay.gotWd !== pay.expWd) fails.push(`payroll workDays ${pay.gotWd} != ${pay.expWd}`);
  if (Math.abs(pay.gotHrs - pay.expHrs) > 0.001) fails.push(`payroll hours ${pay.gotHrs} != ${pay.expHrs}`);
  if (!pay.expOt) fails.push('seed produced zero OT this month — nothing to verify');

  // ---------- ใบลาอนุมัติแล้วไม่นับเป็นวันไม่มีบันทึก ----------
  const lv = await p.evaluate(() => {
    const s = STAFF[0], ym = curDate().slice(0, 7);
    const d = ATT.filter(a => a.staffId === s.id && a.date.slice(0, 7) === ym && a.date < curDate()).map(a => a.date).sort();
    const target = d[0];
    const idx = ATT.findIndex(a => a.staffId === s.id && a.date === target);
    const saved = ATT[idx]; ATT.splice(idx, 1);
    const before = attMonth(s.id, ym).missDays;
    LEAVES.push({ id: 'LVTEST', staffId: s.id, type: 'ลากิจ', from: target, to: target, status: 'อนุมัติแล้ว' });
    const after = attMonth(s.id, ym);
    LEAVES.pop(); ATT.splice(idx, 0, saved);
    return { before, missAfter: after.missDays, leaveAfter: after.leaveDays };
  });
  if (lv.missAfter !== lv.before - 1) fails.push(`approved leave did not clear the missing day (${lv.before} -> ${lv.missAfter})`);
  if (!lv.leaveAfter) fails.push('approved leave not counted as a leave day');

  // ---------- หน้าจอ: เลือกวันย้อนหลังได้ + ปุ่มลงเวลาโผล่เฉพาะวันนี้ ----------
  await p.evaluate(() => go('hr')); await p.waitForTimeout(300);
  const todayBtns = await p.$$eval('[data-in],[data-out]', e => e.length);
  if (!todayBtns) fails.push('hr: no punch button on today for admin');
  const yst = await p.evaluate(() => { const d = [...new Set(ATT.map(a => a.date))].sort();
    ATT_DAY = d[d.length - 3]; rHr(); return ATT_DAY; });
  await p.waitForTimeout(250);
  const backBtns = await p.$$eval('[data-in],[data-out]', e => e.length);
  if (backBtns) fails.push('hr: punch buttons must not appear on a past day (' + yst + ')');
  const hasFix = await p.$$eval('[data-fix]', e => e.length);
  if (!hasFix) fails.push('hr: admin has no แก้ไข button on a past day');
  const hdr = await p.$eval('#hrDate', e => e.textContent);
  if (!hdr || hdr === '—') fails.push('hr: date header empty');
  const cards = await p.$$eval('#attTable .crow', e => e.length);
  if (cards < 5) fails.push('hr: attendance cards missing at 390 (' + cards + ')');
  const sum = await p.$eval('#attSum', e => e.textContent);
  if (!/ทั้งเดือน/.test(sum)) fails.push('hr: summary lacks the month block');
  // แผ่นเลือกวัน
  if (!await p.isVisible('#attFilt')) fails.push('hr: เลือกวัน button hidden at 390');
  await p.click('#attFilt'); await p.waitForTimeout(300);
  if (!await p.evaluate(() => !!document.querySelector('#fsBody #attDay'))) fails.push('hr: attDay not moved into sheet');
  await p.click('#fsDone'); await p.waitForTimeout(250);
  const fsum = await p.$eval('#attFsum', e => e.textContent.trim());
  if (!fsum) fails.push('hr: filter summary empty');
  await p.evaluate(() => { ATT_DAY = curDate(); rHr(); });

  // ---------- หน้าเงินเดือน: สลับงวดแล้วตัวเลขเปลี่ยน ----------
  await p.evaluate(() => go('payroll')); await p.waitForTimeout(300);
  const pr = await p.evaluate(() => {
    const cur = prCalc(curDate().slice(0, 7)).reduce((s, r) => s + r.ot, 0);
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    const prev = iso(new Date(d.getFullYear(), d.getMonth(), 2)).slice(0, 7);
    return { cur, prev: prCalc(prev).reduce((s, r) => s + r.ot, 0), prevYm: prev,
      opts: [...document.querySelectorAll('#prMonth option')].map(o => o.value) };
  });
  if (pr.opts.length < 3) fails.push('payroll: month picker has ' + pr.opts.length + ' options');
  if (!pr.prev) fails.push('payroll: previous month has zero OT — 45-day history not reaching it');
  if (pr.prev === pr.cur) fails.push('payroll: previous month equals current — month filter not applied');
  const note = await p.$eval('#prNote', e => e.textContent);
  if (!note.trim()) fails.push('payroll: note empty');
  const prCards = await p.$$eval('#prTable .crow', e => e.length);
  if (prCards < 5) fails.push('payroll: cards missing at 390');
  const slip = await p.$eval('#prSlip', e => e.textContent);
  if (!/สรุปการมาทำงาน/.test(slip)) fails.push('payroll: slip lacks attendance summary');
  if (!/ผ่อนผันวันละ/.test(slip)) fails.push('payroll: slip lacks the grace note');

  // ---------- รายงานเงินเดือน ----------
  await p.evaluate(() => go('report')); await p.waitForTimeout(250);
  const rp = await p.evaluate(() => { RP_SEL = 'payroll'; rReport(); const d = rpBuild('payroll');
    return { head: d.head.map(h => h.t), n: d.rows.length, note: d.note,
      cards: document.querySelectorAll('#rpTable .crow').length }; });
  if (!rp.head.includes('วันทำงาน') || !rp.head.includes('OT (ชม.)')) fails.push('report payroll: attendance columns missing');
  if (!rp.cards) fails.push('report payroll: no cards at 390');

  // ---------- ตั้งค่าผ่อนผันแก้ได้จริง ----------
  await p.evaluate(() => go('settings')); await p.waitForTimeout(250);
  const cfg = await p.evaluate(() => {
    const before = $('#cfGrace').value;
    $('#cfGrace').value = '15'; $('#cfSave').click();
    const applied = CFG.lateGrace;
    const stillLate = attCalc({ in: '08:40:00', out: '17:30:00' }).late;
    $('#cfGrace').value = before; $('#cfSave').click();
    return { before, applied, stillLate, typeOk: typeof applied === 'number' };
  });
  if (cfg.before !== '5') fails.push('settings: default grace shown as ' + cfg.before);
  if (cfg.applied !== 15 || !cfg.typeOk) fails.push('settings: grace not saved as a number (' + cfg.applied + ')');
  if (cfg.stillLate) fails.push('settings: 08:40 should not be late with a 15-minute grace');

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO_PAGE_ERRORS');
  console.log('seed:', JSON.stringify(seed));
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
