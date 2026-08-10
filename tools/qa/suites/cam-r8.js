/* รูปที่ถ่ายต้องเป็นภาพเดียวกับที่เห็นในกรอบพรีวิว
   ใช้กล้องปลอมที่วาดเองจาก canvas เพื่อให้รู้แน่ว่าพิกเซลไหนควรอยู่ตรงไหน
   ลาย: แบ่งแนวตั้ง 4 แถบ  แดง | เขียว | น้ำเงิน | เหลือง  (ซ้าย→ขวา ของภาพต้นฉบับ)
        และมีแถบขาวบน-ล่างสุด ไว้ตรวจว่าถูกครอปแนวตั้งไปหรือยัง */
const { chromium, EXE, BASE } = require('./env');

/* addInitScript ส่งได้อาร์กิวเมนต์เดียว จึงต้องยัดเป็นอาเรย์แล้วแตกออกตรงนี้ */
const FAKE = ([VW, VH]) => {
  const cv = document.createElement('canvas'); cv.width = VW; cv.height = VH;
  const g = cv.getContext('2d');
  const cols = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
  cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * VW / 4, 0, VW / 4, VH); });
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, VW, VH * 0.02);                 // ขอบบนสุด
  g.fillRect(0, VH * 0.98, VW, VH * 0.02);         // ขอบล่างสุด
  const stream = cv.captureStream(30);
  navigator.mediaDevices.getUserMedia = async () => stream;
  window.__fake = { VW, VH };
};

/* อ่านสีตรงกลางของแต่ละส่วนในสี่ส่วนแนวนอนจาก dataURL */
const READ = src => new Promise(res => {
  const im = new Image();
  im.onload = () => {
    const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    const g = cv.getContext('2d'); g.drawImage(im, 0, 0);
    const at = (fx, fy) => { const d = g.getImageData(Math.round(im.width * fx),
      Math.round(im.height * fy), 1, 1).data;
      return [d[0], d[1], d[2]].map(v => v > 200 ? 255 : (v < 60 ? 0 : 128)).join(','); };
    res({ w: im.width, h: im.height,
      bands: [0.125, 0.375, 0.625, 0.875].map(fx => at(fx, 0.5)),
      /* สองจุดนี้เลือกมาให้ "ครอปแบบ cover" กับ "ยัดทั้งเฟรม" ให้สีต่างกัน
         จุดกลางแถบทั้งสี่แยกสองแบบนี้ไม่ออก เพราะแถบกว้างเท่ากันหมด */
      edge: [at(0.22, 0.5), at(0.78, 0.5)],
      top: at(0.5, 0.005), bottom: at(0.5, 0.995) });
  };
  im.src = src;
});

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const fails = [], errs = [];

  const run = async (VW, VH, label) => {
    const ctx = await b.newContext({ timezoneId: 'Asia/Bangkok', viewport: { width: 390, height: 844 },
      permissions: ['camera', 'geolocation'], geolocation: { latitude: 13.7563, longitude: 100.5018 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`[${label}] ${e.message}`));
    await p.addInitScript(FAKE, [VW, VH]);
    await p.goto(BASE + '/index.html');
    await p.click('#lgUsers [data-id="ST3"]');
    await p.click('#lgGo'); await p.waitForTimeout(500);
    await p.evaluate(() => { const i = ATT.findIndex(a => a.staffId === ME.id && a.date === curDate());
      if (i >= 0) ATT.splice(i, 1); refreshAll(); });
    await p.waitForTimeout(300);
    await p.click('#pcIn'); await p.waitForTimeout(1500);

    const live = await p.evaluate(() => ({ vw: $('#psVid').videoWidth, vh: $('#psVid').videoHeight,
      mirror: getComputedStyle($('#psVid')).transform }));
    if (live.vw !== VW || live.vh !== VH)
      fails.push(`[${label}] กล้องปลอมไม่ทำงาน ได้ ${live.vw}×${live.vh}`);
    // ภาพสดต้องพลิกซ้าย-ขวา (matrix(-1, 0, 0, 1, 0, 0))
    if (!/^matrix\(-1,/.test(live.mirror))
      fails.push(`[${label}] ภาพสดไม่ได้พลิกซ้าย-ขวา: ${live.mirror}`);

    await p.click('#psShot'); await p.waitForTimeout(800);
    const shot = await p.evaluate(async () => {
      const rec = await idbGet(PS_PROOF.photoId);
      return rec && rec.data;
    });
    if (!shot) { fails.push(`[${label}] ไม่ได้รูป`); await ctx.close(); return; }
    const got = await p.evaluate(READ, shot);
    // ภาพนิ่งที่แสดงต้องไม่ถูกพลิกซ้ำ (พลิกไปแล้วตอนวาด)
    const stillT = await p.evaluate(() => getComputedStyle($('#psImg')).transform);
    if (stillT !== 'none' && /^matrix\(-1,/.test(stillT))
      fails.push(`[${label}] ภาพนิ่งถูกพลิกซ้ำ กลับด้านจากที่ถ่ายไว้`);
    await ctx.close();
    return got;
  };

  /* ---------- 1. กล้อง 4:3 พอดีกรอบ ---------- */
  {
    const g = await run(640, 480, '4:3');
    if (g) {
      if (g.w !== 640 || g.h !== 480) fails.push(`4:3 รูปเป็น ${g.w}×${g.h}`);
      // พลิกซ้าย-ขวาแล้ว ลำดับสีต้องกลับเป็น เหลือง | น้ำเงิน | เขียว | แดง
      const want = ['255,255,0', '0,0,255', '0,255,0', '255,0,0'];
      if (g.bands.join(' | ') !== want.join(' | '))
        fails.push(`4:3 ลำดับสีหลังถ่าย = ${g.bands.join(' | ')} ควรเป็น ${want.join(' | ')} (พลิกซ้าย-ขวา)`);
      if (g.top !== '255,255,255' || g.bottom !== '255,255,255')
        fails.push(`4:3 ขอบบน-ล่างหาย แปลว่าถูกครอปแนวตั้งทั้งที่ไม่ควร (${g.top} / ${g.bottom})`);
      /* 4:3 พอดีกรอบ ไม่ต้องครอปข้าง จุด 0.22/0.78 จึงตกที่ เหลือง | แดง */
      if (g.edge.join(' | ') !== '255,255,0 | 255,0,0')
        fails.push(`4:3 จุดตรวจครอป = ${g.edge.join(' | ')} ควรเป็น 255,255,0 | 255,0,0`);
    }
  }

  /* ---------- 2. กล้อง 16:9 แบบมือถือจริง — ต้องครอปข้างเหมือนที่พรีวิวแสดง ---------- */
  {
    const g = await run(1280, 720, '16:9');
    if (g) {
      if (g.w !== 640 || g.h !== 480) fails.push(`16:9 รูปเป็น ${g.w}×${g.h}`);
      /* cover ครอปกลาง 960 จาก 1280 → เหลือ x 160–1120 ของต้นฉบับ ย่อ 1.5 เท่าลงกรอบ 640
         พลิกซ้าย-ขวาด้วย จุดที่อ่าน X ในภาพผลลัพธ์จึงย้อนกลับเป็น x = 160 + 1.5×(640−X)
         อ่านที่ 1/8, 3/8, 5/8, 7/8 (X = 80, 240, 400, 560) = x 1000, 760, 520, 280 ในต้นฉบับ
         แถบเดิมกว้าง 320 ต่อสี → แดง[0,320) เขียว[320,640) น้ำเงิน[640,960) เหลือง[960,1280)
         จึงได้ เหลือง | น้ำเงิน | เขียว | แดง เท่ากับกรณี 4:3 (ลำดับกลับด้านครบทั้ง 4 สี)
         ต่างกันแค่ตรงที่ 16:9 ครอปหัวท้ายทิ้ง ทำให้ปลายแดงกับปลายเหลืองหายไปบางส่วน */
      const want = ['255,255,0', '0,0,255', '0,255,0', '255,0,0'];
      if (g.bands.join(' | ') !== want.join(' | '))
        fails.push(`16:9 ลำดับสีหลังถ่าย = ${g.bands.join(' | ')} ควรเป็น ${want.join(' | ')} (พลิกซ้าย-ขวา)`);
      if (g.top !== '255,255,255' || g.bottom !== '255,255,255')
        fails.push(`16:9 ขอบบน-ล่างหาย — ครอปแนวตั้งผิด (${g.top} / ${g.bottom})`);
      /* ข้อชี้ขาดว่าครอปข้างจริงหรือแค่ยัดทั้งเฟรม
         ครอป: X=140.8 → x 908.8 = น้ำเงิน · X=499.2 → x 370 = เขียว
         ยัดทั้งเฟรม: X=140.8 → x 998.4 = เหลือง · X=499.2 → x 281.6 = แดง */
      if (g.edge.join(' | ') !== '0,0,255 | 0,255,0')
        fails.push(`16:9 จุดตรวจครอป = ${g.edge.join(' | ')} ควรเป็น 0,0,255 | 0,255,0\n`
          + '        (แปลว่ายัดทั้งเฟรมลงกรอบแทนที่จะครอปกลางแบบที่พรีวิวแสดง)');
    }
  }

  /* ---------- 3. กล้องแนวตั้ง 9:16 — ต้องครอปบน-ล่าง ---------- */
  {
    const g = await run(720, 1280, '9:16');
    if (g) {
      if (g.w !== 640 || g.h !== 480) fails.push(`9:16 รูปเป็น ${g.w}×${g.h}`);
      /* cover: กว้างเต็ม 720 ครอปสูงเหลือ 540 กลาง → แถบขาวบน-ล่างต้องหายไป */
      if (g.top === '255,255,255' || g.bottom === '255,255,255')
        fails.push('9:16 ขอบขาวบน-ล่างยังอยู่ — ไม่ได้ครอปแนวตั้งแบบ cover');
      const want = ['255,255,0', '0,0,255', '0,255,0', '255,0,0'];
      if (g.bands.join(' | ') !== want.join(' | '))
        fails.push(`9:16 ลำดับสี = ${g.bands.join(' | ')} ควรเป็น ${want.join(' | ')}`);
      /* แนวตั้งใช้ความกว้างเต็ม ไม่ครอปข้าง จุดตรวจจึงเหมือน 4:3 */
      if (g.edge.join(' | ') !== '255,255,0 | 255,0,0')
        fails.push(`9:16 จุดตรวจครอป = ${g.edge.join(' | ')} ควรเป็น 255,255,0 | 255,0,0`);
    }
  }

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
