/* v1.15 — ตั้งจุดลงเวลาจากลิงก์ Google Maps
   ไม่ต้องไปยืนที่ร้านก็ตั้งได้ · ลิงก์ Google Maps มีหลายรูปแบบมาก จึงต้องตรวจให้ครบ */
const { chromium, EXE, BASE } = require('./env');

/* [ข้อความที่วาง, lat ที่ควรได้, lng ที่ควรได้, คำอธิบาย] */
const OK = [
  ['https://www.google.com/maps/place/Famai/@13.7563,100.5018,17z/data=!3m1!4b1!4m6!3m5!1s0x1!8m2!3d13.751234!4d100.492345!16s%2Fg%2F1',
    13.751234, 100.492345, 'ลิงก์ place — ต้องเอาหมุดจริง (!3d!4d) ไม่ใช่จุดกึ่งกลางแผนที่ (@)'],
  ['https://www.google.com/maps/@13.756331,100.501765,17z', 13.756331, 100.501765, 'ลิงก์ @ อย่างเดียว'],
  ['https://www.google.com/maps?q=13.7563,100.5018', 13.7563, 100.5018, 'q= ธรรมดา'],
  ['https://maps.google.com/?q=13.7563,100.5018&z=17', 13.7563, 100.5018, 'q= บน maps.google.com'],
  ['https://www.google.com/maps/search/?api=1&query=13.7563%2C100.5018', 13.7563, 100.5018, 'query= แบบเข้ารหัส %2C'],
  ['https://www.google.com/maps?ll=13.7563,100.5018&z=15', 13.7563, 100.5018, 'll='],
  ['13.7563, 100.5018', 13.7563, 100.5018, 'พิมพ์พิกัดเองมีเว้นวรรค'],
  ['13.7563,100.5018', 13.7563, 100.5018, 'พิมพ์พิกัดเองไม่มีเว้นวรรค'],
  ['  13.756331 , 100.501765  ', 13.756331, 100.501765, 'มีช่องว่างหน้าหลัง'],
  ['https://www.google.com/maps/place/x/@-33.8688,151.2093,17z/data=!4m5!3m4!1s0x0!8m2!3d-33.865143!4d151.209900',
    -33.865143, 151.2099, 'พิกัดติดลบ (ซิดนีย์) — ต้องอ่านได้ แต่จะเตือนว่าอยู่นอกไทย']
];

const BAD = [
  ['https://maps.app.goo.gl/aBcDeFgHiJk', 'ลิงก์ย่อ — อ่านไม่ได้ ต้องบอกให้เปิดลิงก์ก่อน'],
  ['https://www.google.com/maps/place/Famai+Motor', 'ลิงก์ที่ไม่มีพิกัดเลย'],
  ['สาขาหนึ่ง หลังตลาด', 'ข้อความธรรมดา'],
  ['0,0', 'กลางมหาสมุทร = พาร์สพลาดแน่'],
  ['999,999', 'เกินขอบเขตพิกัด'],
  ['13.7563', 'มีตัวเดียว'],
  ['', 'ว่าง']
];

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const fails = [], errs = [];
  const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Asia/Bangkok',
    permissions:['geolocation'], geolocation:{ latitude:13.756331, longitude:100.501765, accuracy:15 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(450);

  /* ---------- 1 · รูปแบบที่ต้องอ่านได้ ---------- */
  for (const [txt, lat, lng, why] of OK) {
    const g = await p.evaluate(t => parseGeo(t), txt);
    if (!g) { fails.push(`อ่านไม่ได้: ${why} — "${txt.slice(0,60)}"`); continue; }
    if (Math.abs(g.lat - lat) > 1e-6 || Math.abs(g.lng - lng) > 1e-6)
      fails.push(`${why} — ได้ ${g.lat},${g.lng} ควรเป็น ${lat},${lng}`);
  }

  /* ---------- 2 · รูปแบบที่ต้องไม่อ่าน (ยอมไม่รู้ ดีกว่าเดาผิด) ---------- */
  for (const [txt, why] of BAD) {
    const g = await p.evaluate(t => parseGeo(t), txt);
    if (g) fails.push(`ไม่ควรอ่านได้แต่กลับได้ ${g.lat},${g.lng}: ${why} — "${txt}"`);
  }

  /* ---------- 3 · แยกลิงก์ย่อออกจากลิงก์เสียทั่วไป ---------- */
  const shortDetect = await p.evaluate(() => ({
    a: geoShortLink('https://maps.app.goo.gl/x1y2'),
    b: geoShortLink('https://goo.gl/maps/abc'),
    c: geoShortLink('https://www.google.com/maps/place/x')
  }));
  if (!shortDetect.a || !shortDetect.b) fails.push('จับลิงก์ย่อไม่ได้');
  if (shortDetect.c) fails.push('ลิงก์เต็มถูกเข้าใจผิดว่าเป็นลิงก์ย่อ');

  /* ---------- 4 · เตือนเมื่ออยู่นอกประเทศไทย ---------- */
  const th = await p.evaluate(() => ({
    bkk: inThailand({lat:13.7563, lng:100.5018}),
    cnx: inThailand({lat:18.7883, lng:98.9853}),
    syd: inThailand({lat:-33.8688, lng:151.2093})
  }));
  if (!th.bkk || !th.cnx) fails.push('พิกัดในไทยถูกมองว่าอยู่นอกไทย');
  if (th.syd) fails.push('พิกัดต่างประเทศไม่ถูกเตือน');

  /* ---------- 5 · ใช้งานจริงบนหน้าจอ ---------- */
  await p.evaluate(() => go('settings')); await p.waitForTimeout(300);
  await p.click('#cfTabs button[data-p="cf4"]'); await p.waitForTimeout(200);

  const paste = async txt => {
    await p.evaluate(t => {
      const el = document.querySelector('#siPaste');
      el.value = t; el.dispatchEvent(new Event('input', { bubbles:true }));
    }, txt);
    await p.waitForTimeout(150);
    return p.evaluate(() => ({ pin: SI_PIN ? { ...SI_PIN } : null,
      html: document.querySelector('#siGeo').innerHTML }));
  };

  let r = await paste('https://www.google.com/maps/place/x/@13.70,100.40,17z/data=!3m1!4b1!4m2!3d13.712345!4d100.412345');
  if (!r.pin) fails.push('วางลิงก์ที่ถูกต้องแล้ว SI_PIN ยังว่าง');
  else {
    if (Math.abs(r.pin.lat - 13.712345) > 1e-6) fails.push(`วางลิงก์แล้วได้ lat ${r.pin.lat}`);
    if (r.pin.acc !== null) fails.push('พิกัดจากลิงก์ไม่ควรมีค่าความแม่นยำปลอม ๆ');
    if (!/แผนที่/.test(r.html)) fails.push('ไม่ได้บอกว่าพิกัดมาจากลิงก์แผนที่');
  }

  r = await paste('https://maps.app.goo.gl/aBcDeF');
  if (r.pin) fails.push('ลิงก์ย่ออ่านไม่ได้แต่ยังตั้ง SI_PIN');
  if (!/เปิดลิงก์/.test(r.html)) fails.push('ลิงก์ย่อควรบอกวิธีแก้ ไม่ใช่แค่บอกว่าผิด');

  r = await paste('อะไรก็ไม่รู้');
  if (r.pin) fails.push('ข้อความมั่ว ๆ แต่ยังตั้ง SI_PIN');

  /* บันทึกจริงด้วยพิกัดจากลิงก์ */
  const saved = await p.evaluate(() => {
    document.querySelector('#siPaste').value =
      'https://www.google.com/maps/place/x/@13.70,100.40,17z/data=!4m2!3d13.722222!4d100.433333';
    document.querySelector('#siPaste').dispatchEvent(new Event('input', { bubbles:true }));
    document.querySelector('#siName').value = 'ร้านย่อยจากแผนที่';
    document.querySelector('#siBranch').value = 'FMM01';
    const ok = siteSave();
    const s = SITES[SITES.length - 1];
    return { ok, lat: s.lat, lng: s.lng, pinAcc: s.pinAcc, branch: s.branch,
      cleared: document.querySelector('#siPaste').value === '' };
  });
  if (!saved.ok)                        fails.push('บันทึกจุดจากลิงก์แผนที่ไม่สำเร็จ');
  if (Math.abs(saved.lat - 13.722222) > 1e-6) fails.push(`จุดที่บันทึกได้ lat ${saved.lat}`);
  if (saved.pinAcc !== null)            fails.push('จุดจากลิงก์ไม่ควรมี pinAcc');
  if (!saved.cleared)                   fails.push('บันทึกแล้วไม่ได้ล้างช่องวางลิงก์');

  /* พิกัดนอกไทยต้องเตือนแต่ไม่ห้าม */
  const foreign = await paste('-33.8688, 151.2093');
  if (!foreign.pin)            fails.push('พิกัดต่างประเทศควรอ่านได้ (เตือนอย่างเดียว ไม่ห้าม)');
  if (!/นอกประเทศไทย/.test(foreign.html)) fails.push('พิกัดต่างประเทศไม่ได้ขึ้นคำเตือน');

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
