/* ด่านกันโกงที่เพิ่มหลังผลตรวจ — ทุกข้อเคยเป็นช่องโหว่จริง */
const { chromium, EXE, BASE } = require('./env');
(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['camera'] });
  const fails = [], errs = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgUsers [data-id="ST2"]');           // ผู้จัดการ
  await p.click('#lgGo'); await p.waitForTimeout(500);

  // ---------- 1. ลงเวลาแทนคนอื่นไม่ได้ แม้เรียกฟังก์ชันตรง ----------
  const proxy = await p.evaluate(() => {
    const other = STAFF.find(s => s.id !== ME.id);
    const i = ATT.findIndex(a => a.staffId === other.id && a.date === curDate());
    if (i >= 0) ATT.splice(i, 1);
    const ret = punch(other.id, 'in');
    return { ret, wrote: !!attOf(other.id, curDate()),
      mine: (() => { const j = ATT.findIndex(a => a.staffId === ME.id && a.date === curDate());
        return j >= 0 ? ATT[j].in : null; })() };
  });
  if (proxy.ret !== null) fails.push('punch() for someone else returned ' + proxy.ret + ' instead of null');
  if (proxy.wrote) fails.push('punch() wrote an attendance row for another employee');

  // ---------- 2. รหัสรูปไม่ชนกันข้ามรอบเปิดแอป ----------
  const ids1 = await p.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 3; i++) out.push(await photoSave('data:image/jpeg;base64,AAAA', 8, 8, 'fresh'));
    return out;
  });
  await p.reload(); await p.click('#lgGo'); await p.waitForTimeout(500);
  const ids2 = await p.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 3; i++) out.push(await photoSave('data:image/jpeg;base64,BBBB', 8, 8, 'fresh'));
    return out;
  });
  const overlap = ids1.filter(x => ids2.includes(x));
  if (overlap.length) fails.push('photo ids collide across reloads: ' + overlap.join(','));
  if (ids1.some(x => /^PH\d+$/.test(x))) fails.push('photo id still uses the resettable counter: ' + ids1[0]);
  const survived = await p.evaluate(async ids => {
    const recs = await Promise.all(ids.map(idbGet));
    return recs.filter(Boolean).length;
  }, ids1);
  if (survived !== 3) fails.push(`only ${survived}/3 earlier photos survived the second session`);

  // ---------- 3. กล้องหน้าถูกบังคับ ----------
  /* v1.8 เลิกใช้ camShot() ที่ถ่ายอัตโนมัติ เปลี่ยนเป็น camOpen() ที่ต่อภาพสดเข้า <video> จริง
     จึงต้องมี element ให้มันต่อ และต้อง camStop() ปิด stream ทิ้งเองหลังตรวจเสร็จ */
  const cam = await p.evaluate(async () => {
    let got = null;
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = c => { got = JSON.parse(JSON.stringify(c)); return real(c); };
    const v = document.createElement('video'); v.muted = true; document.body.appendChild(v);
    try { await camOpen(v); } catch (e) { /* ไม่มีกล้องจริงก็ยังอ่าน constraint ที่ขอไปได้ */ }
    camStop(); v.remove();
    return got;
  });
  if (!cam || !cam.video || !cam.video.facingMode) fails.push('camOpen does not request a facing mode: ' + JSON.stringify(cam));
  else if (JSON.stringify(cam.video.facingMode).indexOf('user') < 0)
    fails.push('camOpen does not ask for the front camera: ' + JSON.stringify(cam.video.facingMode));

  // ---------- 4. ธง "บัญชีที่กดไม่ใช่เจ้าของแถว" ----------
  const notme = await p.evaluate(() => {
    const other = STAFF.find(s => s.id !== ME.id);
    const a = { staffId: other.id, date: curDate(), in: '08:20:00', out: '17:40:00',
      inProof: { by: ME.id, byName: ME.name } };
    const f = attFlags(a);
    const clean = attFlags({ staffId: other.id, date: curDate(), in: '08:20:00', out: '17:40:00',
      inProof: { by: other.id, byName: other.name } });
    return { flagged: f.some(x => x.k === 'notme'), cleanFlagged: clean.some(x => x.k === 'notme'),
      queued: f.filter(x => x.k !== 'nophoto').length > 0 };
  });
  if (!notme.flagged) fails.push('no flag when a different account punched the row');
  if (notme.cleanFlagged) fails.push('false positive: own-account punch flagged as someone else');
  if (!notme.queued) fails.push('the wrong-account flag does not put the record in the review queue');

  // ---------- 5. ตรวจ/แก้บันทึกของตัวเองไม่ได้ ----------
  const selfRv = await p.evaluate(async () => {
    const a = attEnsure(ME.id, curDate());
    a.in = a.in || '09:20:00'; a.out = a.out || '17:40:00'; delete a.review;
    await attPersonSheet(ME.id, curDate());
    await new Promise(r => setTimeout(r, 120));
    return { hasOk: !!document.querySelector('#psOk'), hasFlag: !!document.querySelector('#psFlag'),
      hasFix: !!document.querySelector('#psFix'),
      warns: /ตรวจหรือแก้เองไม่ได้/.test(document.querySelector('#drwB').textContent) };
  });
  if (selfRv.hasOk || selfRv.hasFlag || selfRv.hasFix) fails.push('review buttons shown on your own record: ' + JSON.stringify(selfRv));
  if (!selfRv.warns) fails.push('no explanation shown when opening your own record');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  // แต่ต้องตรวจของคนอื่นได้ตามปกติ
  const otherRv = await p.evaluate(async () => {
    const q = attQueue(curDate().slice(0, 7)).filter(x => x.s.id !== ME.id);
    if (!q.length) return { skip: true };
    await attPersonSheet(q[0].s.id, q[0].a.date);
    await new Promise(r => setTimeout(r, 120));
    return { hasOk: !!document.querySelector('#psOk'), hasFix: !!document.querySelector('#psFix') };
  });
  if (otherRv.skip) fails.push('no other-person record in the queue to verify the positive case');
  else if (!otherRv.hasOk || !otherRv.hasFix) fails.push('manager cannot review someone else: ' + JSON.stringify(otherRv));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);

  // ---------- 6. ยืนยันรวดข้ามบันทึกของตัวเอง ----------
  const bulk = await p.evaluate(() => {
    const ym = curDate().slice(0, 7);
    const a = attEnsure(ME.id, curDate());
    a.in = '09:30:00'; a.out = '17:40:00'; delete a.review;      // ทำให้ติดธงสาย
    go('hr');
    const rv = document.querySelector('#hrTabRv'); if (rv) rv.click();
    const before = attQueue(ym).length;
    document.querySelector('#rvAllOk').click();
    const left = attQueue(ym);
    const mineStill = !attOf(ME.id, curDate()).review;
    return { before, after: left.length, mineStill,
      leftOwners: [...new Set(left.map(x => x.s.id))], me: ME.id,
      othersLeft: left.filter(x => x.s.id !== ME.id).map(x => x.s.nick + '/' + x.a.date) };
  });
  await p.waitForTimeout(300);
  if (!bulk.mineStill) fails.push('bulk approve confirmed the manager’s own record');
  if (!bulk.after) fails.push('bulk approve emptied the queue — the own record should have been left behind');
  if (bulk.othersLeft.length)
    fails.push('bulk approve skipped records that are not the reviewer’s own: ' + bulk.othersLeft.join(', '));

  // ---------- 7. นาฬิกาเครื่องเพี้ยนไม่ลบหลักฐานทิ้ง ----------
  const clock = await p.evaluate(async () => {
    const before = (await idbAll()).length;
    const r = await agePhotos(new Date(Date.now() + 800 * 864e5).toISOString());
    return { before, after: (await idbAll()).length, deleted: r.deleted, skipped: r.skipped };
  });
  if (clock.after !== clock.before) fails.push(`clock set 800 days ahead deleted ${clock.before - clock.after} photos`);
  if (!clock.skipped) fails.push('ageing did not report why it skipped');

  // แต่การย่อตามปกติต้องยังทำงาน
  const still = await p.evaluate(async () => {
    const id = await photoSave('data:image/jpeg;base64,' + 'A'.repeat(400), 640, 480, 'fresh',
      new Date(Date.now() - 45 * 864e5).toISOString());
    const r = await agePhotos();
    return { tier: (await idbGet(id) || {}).tier, checked: r.checked, skipped: r.skipped };
  });
  if (still.skipped) fails.push('normal ageing was skipped: ' + still.skipped);

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
