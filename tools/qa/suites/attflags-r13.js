/* v1.13 — ธงจับพิรุธ + คิวตรวจ + ด่านส่งออกเงินเดือน
   ธงที่ขึ้นกับคนทำถูกคือธงที่ทำให้ผู้จัดการเลิกอ่านคิว แล้วธงอื่นตายตามไปด้วย
   ชุดนี้จึงตรวจทั้ง "ต้องขึ้น" และ "ต้องไม่ขึ้น" */
const { chromium, EXE, BASE } = require('./env');

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const fails = [], errs = [];
  const ctx = await b.newContext({ viewport:{width:1440,height:900}, timezoneId:'Asia/Bangkok',
    permissions:['geolocation'], geolocation:{ latitude:13.756331, longitude:100.501765, accuracy:12 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(600);

  /* สร้างประวัติเองทั้งหมด แล้วถาม attFlags — ไม่พึ่ง seed ที่เปลี่ยนตามวัน */
  const flagsFor = rows => p.evaluate(rs => {
    ATT = ATT.filter(x => x.staffId !== 'ST1');
    const mk = r => {
      const a = { staffId:'ST1', date:r.date, in:r.in||null, out:r.out||null, status:'' };
      const proof = (g, extra) => Object.assign({ by:'ST1', byName:'x', deviceId:r.dev||'DEV1',
        photoId:'PH', geo:g, siteId:'SI1', siteName:'สำนักงานใหญ่', dist:0, outside:false,
        nosite:false, reason:null, timeSrc:'server', skewMs:0 }, extra||{});
      if (r.in)  a.inProof  = proof(r.geoIn  || {lat:13.756331,lng:100.501765,acc:10}, r.exIn);
      if (r.out) a.outProof = proof(r.geoOut || {lat:13.756331,lng:100.501765,acc:10}, r.exOut);
      return a;
    };
    rs.forEach(r => ATT.push(mk(r)));
    const last = ATT[ATT.length - 1];
    return { flags: attFlags(last).map(f => f.k).sort(), needs: rvNeeds(attFlags(last)) };
  }, rows);

  const D = n => { const d = new Date(Date.now() - n * 864e5);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  const has = (o, k) => o.flags.indexOf(k) >= 0;

  /* ---------- 1 · ลงเวลาปกติ ต้องไม่มีธงเรื่องตำแหน่งเลย ---------- */
  let r = await flagsFor([{ date:D(2), in:'08:20:00', out:'17:40:00' }]);
  ['outside','georep','newdev','jump','geopin','clockskew','lowacc','nosite'].forEach(k => {
    if (has(r, k)) fails.push(`ลงเวลาปกติแต่ติดธง ${k}`);
  });

  /* ---------- 2 · นอกพื้นที่ ---------- */
  r = await flagsFor([{ date:D(2), in:'08:20:00', out:'17:40:00',
    exIn:{ outside:true, dist:4900, reason:'ไปส่งรถ' } }]);
  if (!has(r,'outside')) fails.push('นอกพื้นที่แต่ไม่ติดธง outside');
  if (!r.needs)          fails.push('ธง outside ต้องเข้าคิวตรวจ');

  /* ---------- 3 · พิกัดหยาบ / ยังไม่ตั้งจุด = ข้อมูลประกอบ ไม่ลากเข้าคิว ---------- */
  r = await flagsFor([{ date:D(2), in:'08:20:00', out:'17:30:00',
    geoIn:{lat:13.756331,lng:100.501765,acc:900} }]);
  if (!has(r,'lowacc')) fails.push('พิกัดหยาบ 900 ม. แต่ไม่ติดธง lowacc');
  if (r.needs)          fails.push(`ธง lowacc อย่างเดียวไม่ควรลากผู้จัดการเข้ามาตรวจ (ธงที่ได้: ${r.flags})`);
  r = await flagsFor([{ date:D(2), in:'08:20:00', out:'17:30:00',
    exIn:{ nosite:true, siteId:null, siteName:null, dist:null },
    exOut:{ nosite:true, siteId:null, siteName:null, dist:null } }]);
  if (!has(r,'nosite')) fails.push('สาขาไม่มีจุดแต่ไม่ติดธง nosite');
  if (r.needs)          fails.push(`ธง nosite อย่างเดียวไม่ควรลากผู้จัดการเข้ามาตรวจ (ธงที่ได้: ${r.flags})`);

  /* ---------- 4 · georep: ซ้ำ 2 ครั้งยังไม่ติด · ซ้ำติดกัน 3 ครั้งต้องติด ---------- */
  const same = { lat:13.700000, lng:100.400000, acc:33 };
  r = await flagsFor([
    { date:D(4), in:'08:00:00', geoIn:same },
    { date:D(3), in:'08:00:00', geoIn:same }]);
  if (has(r,'georep')) fails.push('พิกัดซ้ำแค่ 2 ครั้งไม่ควรติดธง georep (WiFi ในตึกซ้ำได้จริง)');
  r = await flagsFor([
    { date:D(4), in:'08:00:00', geoIn:same },
    { date:D(3), in:'08:00:00', geoIn:same },
    { date:D(2), in:'08:00:00', geoIn:same }]);
  if (!has(r,'georep')) fails.push('พิกัดซ้ำเป๊ะติดกัน 3 ครั้งต้องติดธง georep');
  if (!r.needs)         fails.push('ธง georep ต้องเข้าคิวตรวจ');
  /* ค่าที่ต่างกันแม้แต่หลักเดียวต้องไม่นับว่าซ้ำ */
  r = await flagsFor([
    { date:D(4), in:'08:00:00', geoIn:same },
    { date:D(3), in:'08:00:00', geoIn:{lat:13.700001,lng:100.400000,acc:33} },
    { date:D(2), in:'08:00:00', geoIn:same }]);
  if (has(r,'georep')) fails.push('พิกัดต่างกันหนึ่งหลักแต่ยังนับว่าซ้ำ');

  /* ---------- 5 · newdev: ครั้งแรกในชีวิตต้องไม่ติดธง ---------- */
  r = await flagsFor([{ date:D(2), in:'08:00:00', dev:'DEVNEW' }]);
  if (has(r,'newdev'))
    fails.push('ลงเวลาครั้งแรกในชีวิตติดธงเครื่องใหม่ — วันแรกที่เปิดใช้ทุกคนจะเข้าคิวพร้อมกัน');
  r = await flagsFor([
    { date:D(4), in:'08:00:00', dev:'DEV_A' },
    { date:D(2), in:'08:00:00', dev:'DEV_B' }]);
  if (!has(r,'newdev')) fails.push('เปลี่ยนเครื่องแล้วต้องติดธง newdev');
  r = await flagsFor([
    { date:D(4), in:'08:00:00', dev:'DEV_A' },
    { date:D(2), in:'08:00:00', dev:'DEV_A' }]);
  if (has(r,'newdev')) fails.push('เครื่องเดิมแต่ติดธง newdev');

  /* ---------- 6 · jump: ระยะกับเวลาไม่สอดคล้อง ---------- */
  r = await flagsFor([{ date:D(2), in:'08:00:00', out:'08:10:00',
    geoIn:{lat:13.756331,lng:100.501765,acc:10}, geoOut:{lat:14.100000,lng:100.501765,acc:10} }]);
  if (!has(r,'jump')) fails.push('เข้า-ออกห่าง 38 กม. ใน 10 นาที ต้องติดธง jump');
  r = await flagsFor([{ date:D(2), in:'08:00:00', out:'17:00:00',
    geoIn:{lat:13.756331,lng:100.501765,acc:10}, geoOut:{lat:14.100000,lng:100.501765,acc:10} }]);
  if (has(r,'jump')) fails.push('ห่าง 9 ชั่วโมง เดินทาง 38 กม. ได้สบาย ไม่ควรติดธง');
  /* 100 กม. ใน 40 นาที = 150 กม./ชม. เป็นไปไม่ได้ — ห้ามมีเพดานช่วงเวลามากลบเคสนี้ */
  r = await flagsFor([{ date:D(2), in:'08:00:00', out:'08:40:00',
    geoIn:{lat:13.756331,lng:100.501765,acc:10}, geoOut:{lat:14.656331,lng:100.501765,acc:10} }]);
  if (!has(r,'jump')) fails.push('100 กม. ใน 40 นาที ต้องติดธง jump — อย่าใส่เพดานช่วงเวลามากลบ');

  /* ---------- 7 · geopin: ค่าไม่ขยับเลยตลอดหลายครั้งที่อ่าน ---------- */
  r = await flagsFor([{ date:D(2), in:'08:00:00',
    geoIn:{lat:13.756331,lng:100.501765,acc:10,n:8,still:7} }]);
  if (!has(r,'geopin')) fails.push('อ่านพิกัด 8 ครั้งไม่ขยับเลย ต้องติดธง geopin');
  r = await flagsFor([{ date:D(2), in:'08:00:00',
    geoIn:{lat:13.756331,lng:100.501765,acc:10,n:2,still:1} }]);
  if (has(r,'geopin')) fails.push('อ่านแค่ 2 ครั้งยังบอกอะไรไม่ได้ ไม่ควรติดธง');

  /* ---------- 8 · clockskew ---------- */
  r = await flagsFor([{ date:D(2), in:'08:00:00', exIn:{ skewMs: 9*60*1000 } }]);
  if (!has(r,'clockskew')) fails.push('นาฬิกาเครื่องต่าง 9 นาที ต้องติดธง clockskew');
  r = await flagsFor([{ date:D(2), in:'08:00:00', exIn:{ skewMs: 30*1000 } }]);
  if (has(r,'clockskew')) fails.push('ต่าง 30 วินาทีเป็นเรื่องปกติ ไม่ควรติดธง');

  /* ---------- 9 · ธง together ต้องไม่มีอยู่ในระบบ (เจ้าของสั่งตัด) ---------- */
  const src = await p.evaluate(() => attFlags.toString() + String(typeof attTogether));
  if (/together/.test(src))
    fails.push('ยังมีธง together อยู่ — เจ้าของสั่งตัดเพราะร้านเล็กและเพื่อนเตือนกันแล้วลงพร้อมกันเป็นเรื่องปกติ');
  const ip = await p.evaluate(() => document.documentElement.innerHTML.indexOf('egress') >= 0
    || /x-forwarded-for/i.test(document.documentElement.innerHTML));
  if (ip) fails.push('ยังมีการยืนยันด้วยไอพีร้านอยู่ — เจ้าของสั่งตัด');

  /* ---------- 10 · ด่านส่งออกเงินเดือน ---------- */
  const pay = await p.evaluate(() => {
    const ym = curDate().slice(0, 7);
    const d = curDate();
    ATT = ATT.filter(x => x.staffId !== 'ST3');
    ATT.push({ staffId:'ST3', date:d, in:'08:10:00', out:'17:30:00', status:'',
      inProof:{ by:'ST3', byName:'x', photoId:'PH', deviceId:'D1',
        geo:{lat:13.9,lng:100.5,acc:10}, siteId:'SI1', siteName:'สำนักงานใหญ่',
        dist:16000, outside:true, reason:'ไปส่งรถ', timeSrc:'server', skewMs:0 } });
    const before = prUnchecked(ym);
    let blocked = false;
    const realToast = window.toast;
    const t0 = { n: 0 }; window.toast = (...a) => { t0.n++; return realToast.apply(null, a); };
    blocked = prBlocked(ym);
    /* ตรวจแล้วต้องส่งออกได้ */
    const rec = ATT.find(x => x.staffId === 'ST3' && x.date === d);
    attReview(rec, 'ok', '');
    const after = prUnchecked(ym);
    const blocked2 = prBlocked(ym);
    window.toast = realToast;
    return { before, blocked, after, blocked2 };
  });
  if (!pay.before)  fails.push('รายการนอกพื้นที่ที่ยังไม่ตรวจ ไม่ถูกนับเข้า prUnchecked');
  if (!pay.blocked) fails.push('ยังตรวจไม่ครบแต่ส่งออกเงินเดือนได้');
  if (pay.after)    fails.push('ตรวจแล้วแต่ยังนับว่าค้างอยู่');
  if (pay.blocked2) fails.push('ตรวจครบแล้วแต่ยังส่งออกไม่ได้');

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
