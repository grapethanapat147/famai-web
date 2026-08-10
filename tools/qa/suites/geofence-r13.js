/* v1.13 — คำตัดสินตำแหน่ง: ด่านเหตุผล · การแช่ผลไว้ · โหมดสังเกต
   ด่านอยู่ใน punch() ไม่ใช่ที่ปุ่ม — ชุดนี้จึงเรียก punch() ตรง ๆ เป็นหลัก */
const { chromium, EXE, BASE } = require('./env');
const AT = { lat:13.756331, lng:100.501765 };

(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const fails = [], errs = [];
  const ctx = await b.newContext({ viewport:{width:390,height:844}, timezoneId:'Asia/Bangkok',
    permissions:['geolocation','camera'],
    geolocation:{ latitude:AT.lat, longitude:AT.lng, accuracy:12 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(400);

  /* หลักฐานปลอมสำหรับเรียก punch() ตรง ๆ — สดเสมอ ไม่ต้องเปิดกล้องจริง */
  const proof = (lat, lng, acc, reason) => ({
    openedAt: new Date().toISOString(), photoId: 'PH_test', photoAt: new Date().toISOString(),
    geo: { lat, lng, acc }, geoAt: new Date().toISOString(), reason });

  const call = (args) => p.evaluate(a => {
    ATT = ATT.filter(x => !(x.staffId === ME.id && x.date === curDate()));
    const pr = { openedAt: new Date().toISOString(), photoId: 'PH_test',
      photoAt: new Date().toISOString(), geo: a.geo, geoAt: new Date().toISOString() };
    if (a.reason !== undefined) pr.reason = a.reason;
    if (a.mode) CFG.geoMode = a.mode;
    const t = punch(ME.id, 'in', pr);
    const rec = attOf(ME.id, curDate());
    return { t, proof: rec && rec.inProof ? JSON.parse(JSON.stringify(rec.inProof)) : null };
  }, args);

  /* ---------- 1 · โหมดบังคับ + อยู่ในพื้นที่ → ผ่าน และแช่ผลไว้ครบ ---------- */
  let r = await call({ mode:'enforce', geo:{ lat:AT.lat, lng:AT.lng, acc:12 } });
  if (!r.t) fails.push('อยู่ตรงจุดพอดีแต่ลงเวลาไม่ผ่าน');
  else {
    if (r.proof.siteId !== 'SI1')  fails.push('ไม่ได้แช่ siteId ไว้ในหลักฐาน');
    if (r.proof.siteName !== 'สำนักงานใหญ่') fails.push('ไม่ได้แช่ชื่อจุดไว้');
    if (r.proof.dist !== 0)        fails.push(`dist = ${r.proof.dist} ควรเป็น 0`);
    if (r.proof.outside !== false) fails.push('อยู่ในพื้นที่แต่ outside ไม่เป็น false');
    if (r.proof.reason !== null)   fails.push('ไม่ได้อยู่นอกพื้นที่แต่มีเหตุผลติดมา');
    if (!r.proof.deviceId)         fails.push('ไม่ได้เก็บรหัสเครื่อง');
    if (!r.proof.clientAt)         fails.push('ไม่ได้เก็บนาฬิกาเครื่อง (clientAt)');
  }

  /* ---------- 2 · โหมดบังคับ + นอกพื้นที่ + ไม่มีเหตุผล → ถูกปฏิเสธ ---------- */
  r = await call({ mode:'enforce', geo:{ lat:13.80, lng:100.501765, acc:12 } });
  if (r.t)     fails.push('อยู่นอกพื้นที่และไม่ได้ให้เหตุผล แต่ punch() ยังบันทึกให้');
  if (r.proof) fails.push('ถูกปฏิเสธแล้วแต่ยังเขียนหลักฐานลงไป');

  /* เหตุผลที่เป็นช่องว่างล้วนต้องไม่นับ */
  r = await call({ mode:'enforce', geo:{ lat:13.80, lng:100.501765, acc:12 }, reason:'   ' });
  if (r.t) fails.push('เหตุผลเป็นช่องว่างล้วนแต่ผ่านด่านไปได้');

  /* ---------- 3 · โหมดบังคับ + นอกพื้นที่ + มีเหตุผล → ผ่าน และเก็บเหตุผลไว้ ---------- */
  r = await call({ mode:'enforce', geo:{ lat:13.80, lng:100.501765, acc:12 }, reason:'ออกไปส่งรถให้ลูกค้า' });
  if (!r.t) fails.push('ให้เหตุผลแล้วแต่ยังลงเวลาไม่ได้');
  else {
    if (r.proof.outside !== true)  fails.push('อยู่นอกพื้นที่แต่ outside ไม่เป็น true');
    if (r.proof.reason !== 'ออกไปส่งรถให้ลูกค้า') fails.push('ไม่ได้เก็บเหตุผลไว้');
    if (!(r.proof.dist > 4000))    fails.push(`dist = ${r.proof.dist} ควรเป็นหลายกิโล`);
  }

  /* ---------- 4 · สาขาที่ยังไม่มีจุด → ปล่อยผ่าน ติดธง nosite ---------- */
  r = await p.evaluate(() => {
    /* ME กับแถวใน STAFF อาจเป็นออบเจกต์ตัวเดียวกัน — ต้องจำค่าเดิมให้ครบก่อนแก้ ไม่งั้นคืนค่าผิด */
    const st = STAFF.find(x => x.id === ME.id);
    const keepMe = ME.branch, keepSt = st ? st.branch : null;
    ME.branch = 'FMM01'; if (st) st.branch = 'FMM01';
    ATT = ATT.filter(x => !(x.staffId === ME.id && x.date === curDate()));
    CFG.geoMode = 'enforce';
    const t = punch(ME.id, 'in', { openedAt:new Date().toISOString(), photoId:'PH_t',
      photoAt:new Date().toISOString(), geo:{lat:19.9,lng:99.9,acc:10}, geoAt:new Date().toISOString() });
    const rec = attOf(ME.id, curDate());
    const out = { t, nosite: rec && rec.inProof && rec.inProof.nosite,
      outside: rec && rec.inProof && rec.inProof.outside };
    ME.branch = keepMe; if (st) st.branch = keepSt;
    out.restored = ME.branch + '/' + (st ? st.branch : '-');
    return out;
  });
  if (!r.t)       fails.push('สาขาที่ยังไม่มีจุดลงเวลา ต้องลงเวลาได้ตามปกติ (ไม่งั้นวันแรกที่ deploy ทั้งบริษัทลงเวลาไม่ได้)');
  if (!r.nosite)  fails.push('สาขาที่ไม่มีจุด ต้องติดธง nosite ไว้');
  if (r.outside)  fails.push('สาขาที่ไม่มีจุด ต้องไม่ถือว่าอยู่นอกพื้นที่');
  if (r.restored !== 'FMG01/FMG01')
    fails.push(`คืนค่าสาขาหลังทดสอบไม่ครบ (${r.restored}) — ข้อถัดไปจะเชื่อถือไม่ได้`);

  /* ---------- 5 · โหมดสังเกต: ไกลแค่ไหนก็ผ่าน แต่ยังวัดระยะเก็บไว้ ---------- */
  r = await call({ mode:'watch', geo:{ lat:13.90, lng:100.501765, acc:12 } });
  if (!r.t)                       fails.push('โหมดสังเกตต้องไม่บล็อกใคร');
  else {
    if (r.proof.outside !== false) fails.push('โหมดสังเกตต้องไม่ตั้งธง outside');
    if (r.proof.observed !== true) fails.push('โหมดสังเกตต้องบันทึกว่า "ถ้าบังคับจะโดน" ไว้ใน observed');
    if (!(r.proof.dist > 10000))   fails.push(`โหมดสังเกตต้องยังวัดระยะเก็บไว้ — dist = ${r.proof.dist}`);
    if (r.proof.siteId !== 'SI1')  fails.push('โหมดสังเกตต้องยังบันทึกว่าจุดไหนใกล้ที่สุด');
  }

  /* ---------- 6 · ผลถูกแช่ไว้ — ขยับหมุดแล้วประวัติต้องไม่เปลี่ยน ---------- */
  const frozen = await p.evaluate(() => {
    ATT = ATT.filter(x => !(x.staffId === ME.id && x.date === curDate()));
    CFG.geoMode = 'enforce';
    punch(ME.id, 'in', { openedAt:new Date().toISOString(), photoId:'PH_t',
      photoAt:new Date().toISOString(), geo:{lat:13.756331,lng:100.501765,acc:12},
      geoAt:new Date().toISOString() });
    const rec = attOf(ME.id, curDate());
    const before = { dist: rec.inProof.dist, outside: rec.inProof.outside,
      site: rec.inProof.siteName, flags: attFlags(rec).map(f => f.k).sort().join(',') };
    /* เจ้าของขยับหมุดไปไกล 5 กิโล แล้วเปลี่ยนชื่อจุด */
    SITES[0].lat += 0.05; SITES[0].name = 'ชื่อใหม่';
    const after = { dist: rec.inProof.dist, outside: rec.inProof.outside,
      site: rec.inProof.siteName, flags: attFlags(rec).map(f => f.k).sort().join(',') };
    SITES[0].lat -= 0.05; SITES[0].name = 'สำนักงานใหญ่';
    return { before, after };
  });
  if (frozen.before.dist !== frozen.after.dist)
    fails.push(`ขยับหมุดแล้วระยะในประวัติเปลี่ยน ${frozen.before.dist} → ${frozen.after.dist}`);
  if (frozen.before.outside !== frozen.after.outside)
    fails.push('ขยับหมุดแล้วสถานะนอกพื้นที่ของประวัติเปลี่ยน');
  if (frozen.before.site !== frozen.after.site)
    fails.push('เปลี่ยนชื่อจุดแล้วชื่อในประวัติเปลี่ยนตาม');
  if (frozen.before.flags !== frozen.after.flags)
    fails.push(`ขยับหมุดแล้วธงของประวัติเปลี่ยน [${frozen.before.flags}] → [${frozen.after.flags}]`);

  /* ---------- 7 · ปลดปุ่มเองแล้วกด ยังต้องโดนปฏิเสธ (ด่านอยู่ในฟังก์ชัน) ---------- */
  const bypass = await p.evaluate(async () => {
    ATT = ATT.filter(x => !(x.staffId === ME.id && x.date === curDate()));
    CFG.geoMode = 'enforce';
    punchSheet(ME.id, 'in');
    await new Promise(r => setTimeout(r, 400));
    /* ยัดหลักฐานครบมือ แต่อยู่ไกลและไม่ให้เหตุผล */
    PS_PROOF.photoId = 'PH_t'; PS_PROOF.photoAt = new Date().toISOString();
    PS_PROOF.geo = { lat:13.90, lng:100.501765, acc:12 }; PS_PROOF.geoAt = new Date().toISOString();
    const w = document.querySelector('#psWhy'); if (w) w.value = '';
    document.querySelector('#psGo').disabled = false;   /* ปลดปุ่มเองจากคอนโซล */
    document.querySelector('#psGo').click();
    const rec = attOf(ME.id, curDate());
    const open = document.querySelector('#modal').classList.contains('on');
    closeModal();
    return { saved: !!(rec && rec.in), open };
  });
  if (bypass.saved) fails.push('ปลด disabled ของปุ่มเองแล้วกด — บันทึกผ่านไปได้ ด่านต้องอยู่ใน punch()');
  if (!bypass.open) fails.push('ถูกปฏิเสธแล้วแต่แผ่นปิดไปเลย ผู้ใช้จะไม่รู้ว่าต้องแก้อะไร');

  /* ---------- 8 · ขั้นที่ 3 โผล่เฉพาะตอนนอกพื้นที่ ---------- */
  const ui = await p.evaluate(async () => {
    CFG.geoMode = 'enforce';
    punchSheet(ME.id, 'in');
    await new Promise(r => setTimeout(r, 400));
    PS_PROOF.geo = { lat:13.756331, lng:100.501765, acc:12 }; PS_PROOF.geoAt = new Date().toISOString();
    document.querySelector('#psGeoGo').click();
    await new Promise(r => setTimeout(r, 500));
    const near = { why: document.querySelector('#psWhyBox').style.display,
                   site: document.querySelector('#psSite').textContent };
    closeModal();
    return near;
  });
  if (ui.why !== 'none') fails.push('อยู่ในพื้นที่แต่กล่องเหตุผลโผล่ขึ้นมา');
  if (!/ห่าง/.test(ui.site)) fails.push(`อยู่ในพื้นที่แต่ไม่ได้บอกว่าอยู่จุดไหน: "${ui.site}"`);

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
