/* พนักงานด้วยกันดูของกันและกันไม่ได้ — ตรวจทุกทางที่ข้อมูลเคยรั่ว */
const { chromium, EXE, BASE } = require('./env');
const ROLE_ID = { admin:'ST1', manager:'ST2', sales:'ST3', stock:'ST6', acct:'ST7', hr:'ST8', tech:'ST9' };
const BOSS = ['admin','manager','hr'];

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const fails = [], errs = [];
  const login = async (p, id) => {
    await p.goto(BASE + '/index.html');
    await p.click(`#lgUsers [data-id="${id}"]`);
    await p.click('#lgGo'); await p.waitForTimeout(450);
  };

  for (const [role, id] of Object.entries(ROLE_ID)) {
    const boss = BOSS.includes(role);
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(`[${role}] ${e.message}`));
    await login(p, id);

    // ---------- หน้าภาพรวมการเข้างาน ----------
    const canSee = await p.evaluate(() => canSee('attend'));
    if (canSee !== boss) fails.push(`[${role}] canSee('attend') = ${canSee}, expected ${boss}`);
    const inMenu = await p.evaluate(() => MENU.some(m => m.k === 'attend' && m.r.includes(ME.role)));
    if (inMenu !== boss) fails.push(`[${role}] attend in menu = ${inMenu}`);
    if (!boss) {
      // เข้าตรงต้องถูกบล็อก และถ้าเรียก renderer ตรงก็ต้องไม่วาดข้อมูล
      const blocked = await p.evaluate(() => { go('attend');
        return { cur: CUR, list: (document.querySelector('#abList') || {}).innerHTML || '',
          count: (document.querySelector('#abCount') || {}).innerHTML || '' }; });
      if (blocked.cur === 'attend') fails.push(`[${role}] go('attend') let them in`);
      const direct = await p.evaluate(() => { rAttend();
        return { list: document.querySelector('#abList').innerHTML,
          count: document.querySelector('#abCount').innerHTML }; });
      if (direct.list.trim() || direct.count.trim())
        fails.push(`[${role}] calling rAttend() directly rendered colleague data`);
    }

    // ---------- ตารางลงเวลา ----------
    await p.evaluate(() => go('hr')); await p.waitForTimeout(400);
    const att = await p.evaluate(() => {
      // .crow = การ์ด 1 ใบต่อ 1 คน (tbody tr มีแถวห่อการ์ดปนอยู่ด้วย จึงนับไม่ได้)
      const rows = [...document.querySelectorAll('#attTable .crow')];
      return { n: rows.length, txt: document.querySelector('#attTable').textContent,
        others: STAFF.filter(s => s.id !== ME.id).map(s => s.nick) };
    });
    if (boss) { if (att.n < 2) fails.push(`[${role}] manager sees only ${att.n} attendance rows`); }
    else {
      if (att.n !== 1) fails.push(`[${role}] sees ${att.n} attendance rows, expected 1 (self only)`);
      const leaked = att.others.filter(n => att.txt.includes(n));
      if (leaked.length) fails.push(`[${role}] attendance table shows colleagues: ${leaked.join(', ')}`);
    }

    // ---------- ย้อนวันแล้วยังต้องเห็นแค่ตัวเอง ----------
    if (!boss) {
      const back = await p.evaluate(() => {
        const d = [...new Set(ATT.map(a => a.date))].sort();
        ATT_DAY = d[d.length - 4]; rHr();
        const txt = document.querySelector('#attTable').textContent;
        return { leaked: STAFF.filter(s => s.id !== ME.id).map(s => s.nick).filter(n => txt.includes(n)) };
      });
      if (back.leaked.length) fails.push(`[${role}] past-day view leaks colleagues: ${back.leaked.join(', ')}`);
      await p.evaluate(() => { ATT_DAY = curDate(); rHr(); });
    }

    // ---------- รูป/พิกัดของเพื่อน ----------
    const photo = await p.evaluate(async () => {
      const other = STAFF.find(s => s.id !== ME.id);
      const a = attEnsure(other.id, curDate());
      a.in = a.in || '08:10:00';
      a.inProof = { by: other.id, byName: other.name, device: 'x', photoId: 'PH_TEST',
        geo: { lat: 13.7, lng: 100.5, acc: 9 } };
      rHr();
      const btns = [...document.querySelectorAll('[data-attph]')].map(x => x.dataset.attph);
      const mineOnly = btns.every(x => x.split('|')[0] === ME.id);
      // เรียกแผ่นตรวจของคนอื่นตรง ๆ
      const before = document.querySelector('#drw').classList.contains('on');
      await attPersonSheet(other.id, curDate());
      await new Promise(r => setTimeout(r, 150));
      const opened = document.querySelector('#drw').classList.contains('on');
      const body = opened ? document.querySelector('#drwB').textContent : '';
      return { btns: btns.length, mineOnly, opened, hasGeo: /13\.7/.test(body) };
    });
    if (!boss) {
      if (!photo.mineOnly) fails.push(`[${role}] photo buttons rendered for colleagues' records`);
      if (photo.opened) fails.push(`[${role}] attPersonSheet() opened a colleague's evidence`);
      if (photo.hasGeo) fails.push(`[${role}] saw a colleague's GPS coordinates`);
    } else if (!photo.opened) fails.push(`[${role}] manager cannot open the review sheet`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);

    // ---------- ใบลา ----------
    const lv = await p.evaluate(() => {
      const bs = [...document.querySelectorAll('#hrTabs button')];
      bs[1].click();
      const txt = document.querySelector('#lvTable').textContent;
      const opts = [...document.querySelectorAll('#lvWho option')].map(o => o.value);
      /* ประเภทการลาของคนอื่น = สิ่งที่ต้องไม่หลุด (v1.11) — วันที่กับชื่อเปิดได้ */
      const mine = LEAVES.filter(l => l.staffId === ME.id).map(l => l.type);
      const otherTypes = [...new Set(LEAVES.filter(l => {
        const st = STAFF.find(x => x.id === l.staffId);
        return l.staffId !== ME.id && st && inScope(st.branch);
      }).map(l => l.type))].filter(t => mine.indexOf(t) < 0);
      return { txt, opts, otherTypes, others: STAFF.filter(s => s.id !== ME.id).map(s => s.nick) };
    });
    if (!boss) {
      /* v1.11: เห็นชื่อกับวันที่ของเพื่อนร่วมงานได้ แต่ต้องไม่เห็นว่าเขาลาอะไร */
      const leakedType = lv.otherTypes.filter(t => lv.txt.includes(t));
      if (leakedType.length) fails.push(`[${role}] leave table leaks colleagues' leave TYPE: ${leakedType.join(', ')}`);
      if (lv.opts.length !== 1 || lv.opts[0] !== id)
        fails.push(`[${role}] leave form lets them pick someone else: ${lv.opts.join(',')}`);
      // ยื่นแทนคนอื่นด้วยการยัดค่าใน select ต้องไม่ผ่าน
      const forged = await p.evaluate(() => {
        const other = STAFF.find(s => s.id !== ME.id);
        const sel = document.querySelector('#lvWho');
        sel.innerHTML = '<option value="' + other.id + '">x</option>'; sel.value = other.id;
        const n = LEAVES.length;
        document.querySelector('#lvSave').click();
        const added = LEAVES.slice(n);
        return { added: added.length, forOther: added.some(l => l.staffId !== ME.id) };
      });
      if (forged.forOther) fails.push(`[${role}] filed a leave request for a colleague`);
    } else if (lv.opts.length < 2) fails.push(`[${role}] manager cannot file leave for the team`);

    // ---------- ปฏิทิน ----------
    if (await p.evaluate(() => canSee('cal'))) {
      const cal = await p.evaluate(() => {
        const ev = calEvents().filter(e => e.k === 'leave');
        const mineNick = (STAFF.find(s => s.id === ME.id) || {}).nick;
        return { total: ev.length,
          others: ev.filter(e => !e.t.includes(mineNick)).map(e => e.t) };
      });
      /* v1.11: วันลาของทีมเปิดให้ทุกคนเห็นแล้ว แต่ป้ายต้องบอกแค่ "ลา · ชื่อเล่น" ไม่บอกประเภท */
      const leakCal = cal.others.filter(t => /ป่วย|กิจ|พักร้อน|คลอด/.test(t));
      if (leakCal.length) fails.push(`[${role}] calendar leaks leave type: ${leakCal.slice(0,3).join(', ')}`);
    }
    await p.close();
  }

  // ---------- ออกจากระบบแล้วต้องไม่เหลือของเดิมใน DOM ----------
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
  p2.on('pageerror', e => errs.push('logout ' + e.message));
  await login(p2, 'ST8');                       // HR เปิดหน้าเงินเดือนไว้
  await p2.evaluate(() => go('payroll')); await p2.waitForTimeout(400);
  const had = await p2.$eval('#prTable', e => e.textContent.length);
  if (had < 50) fails.push('payroll table did not render for HR — logout test is meaningless');
  await p2.evaluate(() => doLogout());
  await p2.waitForTimeout(900);
  const after = await p2.evaluate(() => ({
    pr: (document.querySelector('#prTable') || {}).textContent || '',
    rv: (document.querySelector('#rvTable') || {}).textContent || '',
    loggedOut: !!document.querySelector('#login') && !document.querySelector('#login').classList.contains('off') }));
  if (after.pr.length > 20) fails.push('payroll data still in the DOM after logout');
  if (after.rv.length > 20) fails.push('review queue still in the DOM after logout');
  if (!after.loggedOut) fails.push('logout did not return to the login screen');
  await p2.close();

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
