const { chromium, EXE, BASE } = require('./env');
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const fails = [], errs = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(400);

  // สร้างรูป 640x480 จริง 3 ใบ อายุ 1 วัน / 45 วัน / 400 วัน
  const made = await p.evaluate(async () => {
    const draw = (w, h, seed) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const g = cv.getContext('2d');
      for (let i = 0; i < 60; i++) { g.fillStyle = `hsl(${(i * 13 + seed) % 360} 70% 55%)`;
        g.fillRect((i * 37) % w, (i * 53) % h, 90, 70); }
      g.fillStyle = '#000'; g.font = '40px sans-serif'; g.fillText('FAMAI ' + seed, 20, h - 30);
      return cv.toDataURL('image/jpeg', 0.7); };
    const ago = d => new Date(Date.now() - d * 864e5).toISOString();
    const ids = [];
    for (const [d, seed] of [[1, 11], [45, 22], [400, 33]])
      ids.push(await photoSave(draw(640, 480, seed), 640, 480, 'fresh', ago(d)));
    const recs = await Promise.all(ids.map(idbGet));
    return { ids, bytes: recs.map(r => r.bytes), tiers: recs.map(r => r.tier) };
  });
  if (made.tiers.some(t => t !== 'fresh')) fails.push('seeded photos not all fresh');
  if (made.bytes.some(b => b < 3000)) fails.push('seeded photos suspiciously small: ' + made.bytes);

  // ---------- agePhotos ----------
  const aged = await p.evaluate(async ids => {
    const r = await agePhotos();
    const recs = await Promise.all(ids.map(idbGet));
    return { r, recs: recs.map(x => x && { tier: x.tier, w: x.w, h: x.h, bytes: x.bytes,
      isJpeg: /^data:image\/jpeg/.test(x.data) }) };
  }, made.ids);

  const [fresh, small, gone] = aged.recs;
  if (!fresh || fresh.tier !== 'fresh' || fresh.w !== 640) fails.push('1-day-old photo was touched: ' + JSON.stringify(fresh));
  if (!small) fails.push('45-day-old photo was deleted instead of shrunk');
  else {
    if (small.tier !== 'small') fails.push('45-day tier = ' + small.tier);
    if (small.w !== 384 || small.h !== 288) fails.push(`45-day photo is ${small.w}x${small.h}, expected 384x288`);
    if (!small.isJpeg) fails.push('shrunk photo is not a jpeg');
    if (small.bytes >= made.bytes[1]) fails.push(`shrink did not reduce size (${made.bytes[1]} -> ${small.bytes})`);
    if (small.bytes < 1000) fails.push('shrunk photo is too small to see anything: ' + small.bytes);
  }
  if (gone) fails.push('400-day-old photo was not deleted');
  if (aged.r.shrunk !== 1) fails.push('shrunk count = ' + aged.r.shrunk);
  if (aged.r.deleted !== 1) fails.push('deleted count = ' + aged.r.deleted);
  if (aged.r.freed <= 0) fails.push('freed bytes = ' + aged.r.freed);

  // ---------- ไม่ย่อซ้ำ / ไม่ย้อนกลับ ----------
  const again = await p.evaluate(async id => {
    const before = (await idbGet(id)).bytes;
    const r = await agePhotos();
    const after = await idbGet(id);
    return { before, after: after.bytes, w: after.w, r };
  }, made.ids[1]);
  if (again.after !== again.before) fails.push('second pass re-encoded an already-shrunk photo');
  if (again.w !== 384) fails.push('second pass changed the size again');
  if (again.r.shrunk || again.r.deleted) fails.push('second pass did work when there was nothing to do');

  // ---------- limit ทีละไม่กี่รูป ----------
  const batched = await p.evaluate(async () => {
    const draw = () => { const cv = document.createElement('canvas'); cv.width = 640; cv.height = 480;
      const g = cv.getContext('2d'); g.fillStyle = '#456'; g.fillRect(0, 0, 640, 480);
      for (let i = 0; i < 40; i++) { g.fillStyle = `hsl(${i * 9} 60% 50%)`; g.fillRect(i * 15, i * 11, 60, 60); }
      return cv.toDataURL('image/jpeg', 0.7); };
    const ago = new Date(Date.now() - 60 * 864e5).toISOString();
    for (let i = 0; i < 7; i++) await photoSave(draw(), 640, 480, 'fresh', ago);
    const r = await agePhotos(null, 3);
    const left = (await idbAll()).filter(x => x.tier === 'fresh' && (Date.now() - new Date(x.at)) > 30 * 864e5).length;
    return { shrunk: r.shrunk, left };
  });
  if (batched.shrunk !== 3) fails.push('limit ignored: shrunk ' + batched.shrunk);
  if (batched.left !== 4) fails.push('after a limited pass, ' + batched.left + ' old photos remain (expected 4)');

  // ---------- เวลาที่บันทึกยังอยู่แม้รูปหาย ----------
  const kept = await p.evaluate(async () => {
    const a = attEnsure(ME.id, curDate());
    a.in = a.in || '08:12:34';
    a.inProof = { by: ME.id, byName: ME.name, device: 'test', photoId: 'PH_MISSING', geo: { lat: 13.7, lng: 100.5, acc: 12 } };
    go('hr');
    return { time: a.in, geo: !!a.inProof.geo };
  });
  await p.waitForTimeout(400);
  if (kept.time.split(':').length !== 3) fails.push('time lost when the photo is gone');
  const eye = await p.$('[data-attph]');
  if (eye) {
    await eye.click(); await p.waitForTimeout(500);
    const body = await p.$eval('#mdB', e => e.textContent);
    if (!/ถูกลบตามอายุ|ไม่มีไฟล์รูป/.test(body)) fails.push('missing-photo modal does not explain why');
    if (!/13\.7/.test(body)) fails.push('missing-photo modal lost the coordinates');
    await p.keyboard.press('Escape');
  }

  // ---------- หน้าจอบอกพื้นที่ที่ใช้ ----------
  await p.evaluate(() => { ATT_DAY = curDate(); go('hr'); });
  await p.waitForTimeout(900);
  const store = await p.$eval('#attStore', e => e.textContent);
  if (/กำลังอ่าน/.test(store)) fails.push('storage line never resolved');
  if (!/MB/.test(store)) fails.push('storage line has no MB figure: ' + store);
  if (!/384×288|ขนาดเต็ม/.test(store)) fails.push('storage line does not break down by tier: ' + store);

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO_PAGE_ERRORS');
  console.log('bytes fresh/shrunk:', made.bytes[1], '->', small && small.bytes);
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
