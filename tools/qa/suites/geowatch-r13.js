/* v1.13 — เฝ้าดูตำแหน่งแทนการอ่านครั้งเดียว
   ค่าที่แม่นที่สุดต้องชนะ · geoAt ต้องขยับตาม · ปิดแผ่นแล้วต้องเลิกเฝ้าดู */
const { chromium, EXE, BASE } = require('./env');
const AT = { lat:13.756331, lng:100.501765 };

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const fails = [], errs = [];
  const ctx = await b.newContext({ viewport:{width:390,height:844}, timezoneId:'Asia/Bangkok',
    permissions:['geolocation','camera'],
    geolocation:{ latitude:AT.lat, longitude:AT.lng, accuracy:500 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(400);

  /* ---------- 1 · ค่าที่แม่นที่สุดชนะ ไม่ใช่ค่าแรก ---------- */
  await p.evaluate(() => { window.__fix = []; punchSheet(ME.id, 'in'); });
  await p.waitForTimeout(600);
  const first = await p.evaluate(() => PS_PROOF.geo && PS_PROOF.geo.acc);
  if (first !== 500) fails.push(`ค่าแรกที่ได้ acc = ${first} ควรเป็น 500`);
  const firstAt = await p.evaluate(() => PS_PROOF.geoAt);

  await ctx.setGeolocation({ latitude:AT.lat+0.0001, longitude:AT.lng, accuracy:200 });
  await p.waitForTimeout(500);
  const second = await p.evaluate(() => PS_PROOF.geo && PS_PROOF.geo.acc);
  if (second !== 200) fails.push(`หลังได้ค่าที่แม่นขึ้น acc = ${second} ควรเป็น 200`);

  /* ค่าที่แย่ลงต้องไม่ทับของดี */
  await ctx.setGeolocation({ latitude:AT.lat+0.0002, longitude:AT.lng, accuracy:900 });
  await p.waitForTimeout(500);
  const worse = await p.evaluate(() => PS_PROOF.geo && PS_PROOF.geo.acc);
  if (worse !== 200) fails.push(`ค่าที่แย่ลง (900) ไปทับค่าที่ดีกว่า — ตอนนี้ acc = ${worse}`);

  /* geoAt ต้องขยับตามทุกครั้งที่มีค่าใหม่ ไม่งั้นคนถ่ายรูปช้าจะโดนด่านหลักฐานเก่า 120 วิ */
  const laterAt = await p.evaluate(() => PS_PROOF.geoAt);
  if (!(new Date(laterAt) > new Date(firstAt)))
    fails.push('geoAt ไม่ขยับตามค่าใหม่ — คนที่ถ่ายรูปช้าจะโดนด่านหลักฐานเก่าเกิน 120 วินาที');

  /* ---------- 2 · แม่นพอแล้วหยุดเฝ้าดูเอง ---------- */
  await ctx.setGeolocation({ latitude:AT.lat, longitude:AT.lng, accuracy:12 });
  await p.waitForTimeout(600);
  const good = await p.evaluate(() => ({ acc: PS_PROOF.geo.acc, watching: GEO_WATCH !== null }));
  if (good.acc !== 12)  fails.push(`ได้ค่าแม่น 12 แล้วแต่ PS_PROOF.geo.acc = ${good.acc}`);
  if (good.watching)    fails.push('แม่นพอแล้ว (≤20 ม.) แต่ยังเฝ้าดูต่อ — กินแบตเปล่า');

  /* ---------- 3 · ปิดแผ่นแล้วต้องเลิกเฝ้าดูจากที่เดียว ---------- */
  await ctx.setGeolocation({ latitude:AT.lat, longitude:AT.lng, accuracy:400 });
  await p.evaluate(() => { closeModal(); punchSheet(ME.id, 'out'); });
  await p.waitForTimeout(500);
  const during = await p.evaluate(() => GEO_WATCH !== null);
  await p.evaluate(() => closeModal());
  await p.waitForTimeout(200);
  const after = await p.evaluate(() => GEO_WATCH !== null);
  if (!during) fails.push('เปิดแผ่นแล้วไม่ได้เริ่มเฝ้าดูตำแหน่ง');
  if (after)   fails.push('ปิดแผ่นแล้วยังเฝ้าดูตำแหน่งค้างอยู่ — ต้องหยุดใน closeModal()');

  /* ---------- 4 · ปุ่มปักหมุดใช้การเฝ้าดูตัวเดียวกัน ---------- */
  await ctx.setGeolocation({ latitude:13.72, longitude:100.40, accuracy:300 });
  await p.evaluate(() => go('settings')); await p.waitForTimeout(300);
  await p.click('#cfTabs button[data-p="cf4"]'); await p.waitForTimeout(200);
  await p.click('#siPin'); await p.waitForTimeout(500);
  const pin1 = await p.evaluate(() => SI_PIN && SI_PIN.acc);
  await ctx.setGeolocation({ latitude:13.7201, longitude:100.40, accuracy:9 });
  await p.waitForTimeout(600);
  const pin2 = await p.evaluate(() => ({ acc: SI_PIN && SI_PIN.acc, watching: GEO_WATCH !== null }));
  if (pin1 !== 300)   fails.push(`ปักหมุด: ค่าแรก acc = ${pin1} ควรเป็น 300`);
  if (pin2.acc !== 9) fails.push(`ปักหมุด: ไม่ได้เก็บค่าที่แม่นที่สุด — acc = ${pin2.acc} ควรเป็น 9`);
  if (pin2.watching)  fails.push('ปักหมุด: แม่นพอแล้วยังเฝ้าดูต่อ');

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
