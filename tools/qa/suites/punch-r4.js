/* ด่านของ punch() ตามกติกา v1.8 — เขียนใหม่ทั้งไฟล์
   ของเดิมเป็นชุดของ v1.5 ที่ยิงใส่ camShot() และ inProof.pending ซึ่งถูกลบไปแล้ว
   กติกาปัจจุบัน: ลงเวลาได้เฉพาะบัญชีตัวเอง · ต้องมีทั้งรูปและพิกัด · หลักฐานต้องสดไม่เกิน 120 วินาที
   ด่านทุกชั้นอยู่ใน punch() ไม่ใช่ที่ปุ่ม — เทสต์นี้จึงเรียกฟังก์ชันตรง ๆ ไม่ผ่าน UI */
const { chromium, EXE, BASE } = require('./env');

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ timezoneId: 'Asia/Bangkok', viewport: { width: 390, height: 844 },
    permissions: ['geolocation'], geolocation: { latitude: 13.7563, longitude: 100.5018 } });
  const p = await ctx.newPage();
  const fails = [], errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(400);

  const r = await p.evaluate(async () => {
    const out = {};
    const me = ME.id;
    /* ล้างแถวของวันนี้ก่อน ไม่งั้นข้อมูลตัวอย่างจะบังผลลัพธ์ */
    const clear = () => { const i = ATT.findIndex(a => a.staffId === me && a.date === curDate());
      if (i >= 0) ATT.splice(i, 1); };
    const now = () => new Date().toISOString();
    const good = () => ({ photoId: 'PH_test', photoAt: now(), geo: { lat: 13.75, lng: 100.5, acc: 12 }, geoAt: now() });
    const other = STAFF.find(s => s.id !== me).id;

    /* 1 · ลงเวลาแทนคนอื่นไม่ได้
       ข้อมูลตัวอย่างมีแถวของคนอื่นอยู่แล้ว จึงต้องเทียบก่อน-หลัง ไม่ใช่ดูว่ามีแถวหรือไม่ */
    clear();
    const beforeOther = JSON.stringify(attOf(other, curDate()));
    out.other = punch(other, 'in', good());
    out.otherTouched = JSON.stringify(attOf(other, curDate())) !== beforeOther;

    /* 2 · ขาดรูป / ขาดพิกัด / ไม่มีหลักฐานเลย */
    clear();
    const noPhoto = good(); delete noPhoto.photoId;
    out.noPhoto = punch(me, 'in', noPhoto);
    const noGeo = good(); delete noGeo.geo;
    out.noGeo = punch(me, 'in', noGeo);
    out.noProof = punch(me, 'in', null);

    /* 3 · หลักฐานเก่าเกิน 120 วินาที — ถ่ายที่ร้านแล้วเดินไปกดยืนยันที่อื่นต้องไม่ผ่าน */
    const stalePhoto = good(); stalePhoto.photoAt = new Date(Date.now() - 200e3).toISOString();
    out.stalePhoto = punch(me, 'in', stalePhoto);
    const staleGeo = good(); staleGeo.geoAt = new Date(Date.now() - 200e3).toISOString();
    out.staleGeo = punch(me, 'in', staleGeo);
    out.stillEmpty = !attOf(me, curDate());       /* ทุกกรณีข้างบนต้องไม่เขียนอะไรลงไปเลย */

    /* 4 · หลักฐานครบและสด — ผ่าน และต้องเก็บถึงวินาที */
    const t0 = hhmmss(new Date());
    out.ok = punch(me, 'in', good());
    const a = attOf(me, curDate());
    out.stored = a && a.in;
    out.parts = out.stored ? out.stored.split(':').length : 0;
    out.t0 = t0;
    out.by = a && a.inProof && a.inProof.by;
    out.byName = a && a.inProof && a.inProof.byName;
    out.device = !!(a && a.inProof && a.inProof.device);
    out.photoKept = a && a.inProof && a.inProof.photoId;
    out.geoKept = !!(a && a.inProof && a.inProof.geo);

    /* 5 · ลงเวลาออกเขียนแถวเดียวกันของวันนี้ ไม่ใช่แถวใหม่ */
    out.out = punch(me, 'out', good());
    out.rows = ATT.filter(x => x.staffId === me && x.date === curDate()).length;
    out.outStored = attOf(me, curDate()).out;
    return out;
  });

  const sec = s => (+s.slice(0, 2)) * 3600 + (+s.slice(3, 5)) * 60 + (+s.slice(6, 8));
  const no = (v, m) => { if (v !== null) fails.push(m + ' — punch() คืนค่า ' + JSON.stringify(v) + ' แทน null'); };

  no(r.other, 'ลงเวลาแทนคนอื่นสำเร็จ');
  if (r.otherTouched) fails.push('ลงเวลาแทนคนอื่นแล้วแถวของเขาถูกแก้จริง');
  no(r.noPhoto,    'ไม่มีรูปแต่ลงเวลาได้');
  no(r.noGeo,      'ไม่มีพิกัดแต่ลงเวลาได้');
  no(r.noProof,    'ไม่มีหลักฐานเลยแต่ลงเวลาได้');
  no(r.stalePhoto, 'รูปเก่าเกิน 120 วินาทีแต่ลงเวลาได้');
  no(r.staleGeo,   'พิกัดเก่าเกิน 120 วินาทีแต่ลงเวลาได้');
  if (!r.stillEmpty) fails.push('ถูกด่านปฏิเสธแล้วแต่ยังมีแถวลงเวลาเกิดขึ้น');

  if (!r.ok) fails.push('หลักฐานครบและสดแล้วยังลงเวลาไม่ได้');
  if (r.stored !== r.ok) fails.push('punch() คืน ' + r.ok + ' แต่เก็บ ' + r.stored);
  if (r.parts !== 3) fails.push('เวลาที่เก็บไม่มีวินาที: ' + r.stored);
  if (r.stored && Math.abs(sec(r.stored) - sec(r.t0)) > 1)
    fails.push('เวลาที่เก็บ ' + r.stored + ' ห่างจากวินาทีที่กด ' + r.t0);
  if (!r.by || !r.byName) fails.push('ไม่ได้บันทึกว่าใครเป็นคนกด');
  if (!r.device) fails.push('ไม่ได้บันทึกอุปกรณ์ที่ใช้กด');
  if (r.photoKept !== 'PH_test') fails.push('ไม่ได้เก็บรหัสรูปไว้ในหลักฐาน');
  if (!r.geoKept) fails.push('ไม่ได้เก็บพิกัดไว้ในหลักฐาน');
  if (!r.out) fails.push('ลงเวลาออกไม่สำเร็จทั้งที่หลักฐานครบ');
  if (r.rows !== 1) fails.push('วันเดียวกันมี ' + r.rows + ' แถว ควรมีแถวเดียว');
  if (!r.outStored) fails.push('ลงเวลาออกแล้วไม่มีเวลาออกในแถว');

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
