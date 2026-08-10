/* v1.13 — เวลาที่บันทึกต้องมาจากเซิร์ฟเวอร์ ไม่ใช่นาฬิกาของพนักงาน
   ขับด้วย SRV_SKEW ตัวจริง ไม่ใช่การ stub — จึงทดสอบกลไกที่ใช้งานจริง
   (punchNow เป็น const ระดับสคริปต์ stub ผ่าน window ไม่ได้อยู่แล้ว) */
const { chromium, EXE, BASE } = require('./env');
const AT = { lat:13.756331, lng:100.501765 };
const H = 3600 * 1000;

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const fails = [], errs = [];
  const ctx = await b.newContext({ viewport:{width:390,height:844}, timezoneId:'Asia/Bangkok',
    permissions:['geolocation'], geolocation:{ latitude:AT.lat, longitude:AT.lng, accuracy:12 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(700);

  /* ลงเวลาโดยตั้งส่วนต่างนาฬิกาไว้ก่อน แล้วคืนทั้งเวลาที่บันทึกและเวลาเครื่องขณะนั้น */
  const punchWithSkew = skew => p.evaluate(s => {
    SRV_SKEW = s;
    const dev = new Date();                       /* เวลาเครื่อง ณ วินาทีที่กด */
    ATT = ATT.filter(x => x.staffId !== ME.id);   /* ล้างของคนนี้ให้หมด กันแถวเก่ากวน */
    const t = punch(ME.id, 'in', { openedAt:new Date().toISOString(), photoId:'PH_t',
      photoAt:new Date().toISOString(), geo:{lat:13.756331,lng:100.501765,acc:12},
      geoAt:new Date().toISOString() });
    const rec = ATT.find(x => x.staffId === ME.id && x.in === t);
    const pr = rec ? JSON.parse(JSON.stringify(rec.inProof)) : null;
    /* แปลงเป็นเวลาท้องถิ่นในหน้าเว็บ ไม่ใช่ฝั่ง Node ซึ่งเป็น UTC */
    if (pr && pr.clientAt) pr.clientLocal = new Date(pr.clientAt).toTimeString().slice(0,8);
    return { t, date: rec && rec.date, devTime: dev.toTimeString().slice(0,8),
      devDate: iso(dev), proof: pr };
  }, skew);

  const secs = s => { const q = String(s).split(':'); return +q[0]*3600 + +q[1]*60 + +q[2]; };
  /* ผลต่างวินาทีแบบวนรอบ 24 ชม. */
  const gapSec = (a, bb) => { let d = Math.abs(secs(a) - secs(bb)); return Math.min(d, 86400 - d); };

  /* ---------- 1 · เทียบนาฬิกากับเซิร์ฟเวอร์ได้จริงตั้งแต่เข้าระบบ ---------- */
  const synced = await p.evaluate(() => ({ skew: SRV_SKEW, src: timeSrc() }));
  if (synced.src !== 'server')
    fails.push(`ยังไม่ได้เทียบนาฬิกากับเซิร์ฟเวอร์ตอนเข้าระบบ — timeSrc = ${synced.src}`);
  if (synced.skew === null || Math.abs(synced.skew) > 5000)
    fails.push(`ส่วนต่างนาฬิกาที่วัดได้ = ${synced.skew} ms ควรใกล้ 0 บนเครื่องทดสอบ`);

  /* ---------- 2 · เวลาที่บันทึก = เวลาเครื่อง + ส่วนต่างของเซิร์ฟเวอร์ ---------- */
  const r2 = await punchWithSkew(2 * H);
  if (!r2.t) fails.push('ลงเวลาไม่สำเร็จตอนตั้งส่วนต่างนาฬิกา');
  else {
    const want = (secs(r2.devTime) + 7200) % 86400;
    const got  = secs(r2.t);
    if (Math.min(Math.abs(got - want), 86400 - Math.abs(got - want)) > 5)
      fails.push(`เวลาที่บันทึก ${r2.t} ไม่ได้บวกส่วนต่างเซิร์ฟเวอร์ (+2 ชม.) จากเวลาเครื่อง ${r2.devTime}`
        + ' — ยังใช้นาฬิกาเครื่องตรง ๆ อยู่หรือเปล่า');
  }

  /* ---------- 3 · นาฬิกาเครื่องถูกเก็บไว้เป็นหลักฐาน ไม่ใช่ถูกใช้คิดเงิน ---------- */
  if (r2.proof) {
    if (!r2.proof.clientAt) fails.push('ไม่ได้เก็บนาฬิกาเครื่อง (clientAt)');
    else {
      const cAt = r2.proof.clientLocal;
      if (gapSec(cAt, r2.devTime) > 5)
        fails.push(`clientAt (${cAt}) ควรเป็นเวลาเครื่องจริง (${r2.devTime}) ไม่ใช่เวลาที่แก้แล้ว`);
      if (gapSec(cAt, r2.t) < 7200 - 60)
        fails.push('clientAt กับเวลาที่บันทึกควรต่างกัน 2 ชม. เพื่อให้ผู้จัดการเห็นว่านาฬิกาเครื่องเพี้ยน');
    }
    if (Math.abs((r2.proof.skewMs || 0) - 2 * H) > 5000)
      fails.push(`ไม่ได้เก็บส่วนต่างนาฬิกาไว้ — skewMs = ${r2.proof.skewMs}`);
    if (r2.proof.timeSrc !== 'server') fails.push(`timeSrc = ${r2.proof.timeSrc} ควรเป็น server`);
  }

  /* ---------- 4 · วันของแถวมาจากเวลาเซิร์ฟเวอร์ ไม่ใช่ curDate() ของเครื่อง ---------- */
  const r4 = await punchWithSkew(26 * H);
  const wantDate = await p.evaluate(() => punchDate());
  if (r4.date !== wantDate)
    fails.push(`แถวลงวัน ${r4.date} ควรเป็น ${wantDate} ตามเวลาเซิร์ฟเวอร์ (เครื่องอยู่วัน ${r4.devDate})`);
  if (r4.date === r4.devDate)
    fails.push('แถวยังลงตามวันของนาฬิกาเครื่อง — ตั้งนาฬิกาเป็นวันอื่นแล้วเขียนทับแถววันอื่นได้');

  /* ---------- 5 · เทียบนาฬิกาไม่ได้ = ยังลงเวลาได้ แต่บอกตรง ๆ ว่าใช้เวลาเครื่อง ---------- */
  const r5 = await punchWithSkew(null);
  if (!r5.t)                       fails.push('เทียบนาฬิกาไม่ได้แล้วลงเวลาไม่ได้เลย — ต้องยังลงได้');
  if (r5.proof.timeSrc !== 'device') fails.push(`ไม่ได้บอกว่าเวลามาจากเครื่อง — timeSrc = ${r5.proof.timeSrc}`);
  if (r5.proof.skewMs !== null)      fails.push('ไม่รู้ส่วนต่างนาฬิกา แต่กลับบันทึกตัวเลขมั่ว ๆ ไว้');
  if (gapSec(r5.t, r5.devTime) > 5)  fails.push('ไม่มีส่วนต่างแล้วเวลาที่บันทึกควรเท่านาฬิกาเครื่องพอดี');

  /* ---------- 6 · นาฬิกาบนแผ่นลงเวลาต้องเป็นเวลาเดียวกับที่จะถูกบันทึก ---------- */
  const shown = await p.evaluate(async () => {
    SRV_SKEW = 5 * 3600 * 1000;
    punchSheet(ME.id, 'in');
    await new Promise(r => setTimeout(r, 300));
    const el = document.querySelector('#psNow').textContent;
    const want = hhmmss(punchNow());
    closeModal(); SRV_SKEW = 0;
    return { el, want };
  });
  if (gapSec(shown.el, shown.want) > 3)
    fails.push(`นาฬิกาบนแผ่นแสดง ${shown.el} แต่เวลาที่จะบันทึกคือ ${shown.want} — ผู้ใช้เห็นคนละเลขกับที่ระบบเก็บ`);

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
