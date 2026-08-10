/* v1.14 — รูปร่างข้อมูลสาธารณะ
   ชุดนี้คือ "รายชื่อสิ่งที่เปิดได้" ที่ทดสอบได้จริง — ถ้ารายชื่ออยู่แต่ใน SQL จะแตะมันไม่ได้เลย
   ออกแบบเสมือนว่าทุกคำตอบคือข่าวประชาสัมพันธ์ */
const { chromium, EXE, BASE } = require('./env');

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const fails = [], errs = [];
  const p = await b.newPage({ viewport:{width:1440,height:900} });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto(BASE + '/index.html');
  await p.click('#lgGo'); await p.waitForTimeout(500);

  /* ---------- 1 · แคตตาล็อกรุ่น ---------- */
  const cat = await p.evaluate(() => {
    const ms = pubModels();
    return { n: ms.length, json: JSON.stringify(ms), one: ms[0],
      keys: [...new Set(ms.flatMap(m => Object.keys(m)))].sort(),
      avail: [...new Set(ms.map(m => m.availability))].sort(),
      forbid: PUB_FORBID.slice() };
  });
  if (!cat.n) fails.push('pubModels() ไม่คืนอะไรเลย');

  /* คำต้องห้ามต้องไม่โผล่ใน payload — ทั้งชื่อคีย์และค่า */
  cat.forbid.forEach(k => {
    if (new RegExp('"' + k + '"').test(cat.json))
      fails.push(`payload แคตตาล็อกมีคีย์ต้องห้าม "${k}"`);
  });
  /* ชุดคีย์ต้องตรงกับที่คู่มือบอกไว้เป๊ะ — เพิ่มคีย์ใหม่โดยไม่ตั้งใจต้องแดง */
  const WANT = ['availability','cat','cc','code','colors','model','modelTh','photo','photoFull','retail','year'];
  if (cat.keys.join(',') !== WANT.join(','))
    fails.push(`ชุดคีย์ของ pubModel = [${cat.keys}] ควรเป็น [${WANT}]`);
  /* สต๊อกต้องเป็นถัง ไม่ใช่ตัวเลข และไม่แยกสาขา */
  if (cat.avail.some(a => ['ready','low','order'].indexOf(a) < 0))
    fails.push(`availability มีค่านอกเหนือจาก ready/low/order: ${cat.avail}`);
  if (/"(qty|count|n|stock|inStock|branch)"/.test(cat.json))
    fails.push('payload แคตตาล็อกมีจำนวนคันหรือรหัสสาขาหลุดออกไป');
  if (/FMG01|FMM01|FCG01/.test(cat.json))
    fails.push('payload แคตตาล็อกมีรหัสสาขาอยู่ — คู่แข่งดึงทุกวันแล้วรู้ยอดขายรายสาขา');

  /* ถังต้องเปลี่ยนตามจำนวนจริง */
  const buckets = await p.evaluate(() => {
    const v = Object.keys(PRICE)[0];
    const keep = UNITS.filter(u => u.variant === v).map(u => [u.id, u.status]);
    const setN = n => { UNITS.filter(u => u.variant === v).forEach((u, i) => u.status = i < n ? 'available' : 'sold'); };
    CFG.lowStock = 2;
    setN(0); const a = pubModel(v).availability;
    setN(2); const c = pubModel(v).availability;
    setN(9); const d = pubModel(v).availability;
    keep.forEach(([id, st]) => { const u = UNITS.find(x => x.id === id); if (u) u.status = st; });
    return { a, c, d };
  });
  if (buckets.a !== 'order') fails.push(`ไม่มีของเลยได้ "${buckets.a}" ควรเป็น order`);
  if (buckets.c !== 'low')   fails.push(`เหลือ 2 คันได้ "${buckets.c}" ควรเป็น low`);
  if (buckets.d !== 'ready') fails.push(`เหลือ 9 คันได้ "${buckets.d}" ควรเป็น ready`);

  /* ---------- 2 · โทเคน ---------- */
  const tok = await p.evaluate(() => {
    const set = new Set(); let bad = 0;
    const re = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
    for (let i = 0; i < 10000; i++) { const t = pubToken(); if (!re.test(t)) bad++; set.add(t); }
    return { bad, uniq: set.size, sample: pubToken() };
  });
  if (tok.bad)          fails.push(`โทเคน ${tok.bad} ตัวผิดรูปแบบ (ต้องไม่มี I L O U)`);
  if (tok.uniq !== 10000) fails.push(`โทเคนซ้ำ ${10000 - tok.uniq} ตัวจาก 10,000`);

  /* การขายทุกใบต้องมีโทเคน */
  const noTok = await p.evaluate(() => SALES.filter(s => !s.pubToken).length);
  if (noTok) fails.push(`การขาย ${noTok} ใบไม่มีรหัสติดตาม`);

  /* ---------- 3 · สถานะการซื้อของลูกค้า ---------- */
  const ord = await p.evaluate(() => {
    const s = SALES.find(x => !x.void);
    const o = pubOrder(s.custId);
    return { o, json: JSON.stringify(o), keys: Object.keys(o).sort(),
      byTok: pubOrderByToken(s.pubToken), byBad: pubOrderByToken('ZZZZ-ZZZZ-ZZZZ'),
      byLower: pubOrderByToken(String(s.pubToken).toLowerCase()) };
  });
  const OWANT = ['color','customer','deliveredAt','dueAt','model','modelTh','plate','shop','status','step','steps','token'];
  if (ord.keys.join(',') !== OWANT.join(','))
    fails.push(`ชุดคีย์ของ pubOrder = [${ord.keys}] ควรเป็น [${OWANT}]`);
  if (!ord.byTok)   fails.push('ค้นด้วยรหัสที่ถูกต้องแล้วไม่เจอ');
  if (ord.byBad)    fails.push('รหัสมั่ว ๆ แต่ค้นเจอ');
  if (!ord.byLower) fails.push('พิมพ์รหัสเป็นตัวเล็กแล้วค้นไม่เจอ — ลูกค้าพิมพ์ตามที่อ่านมา');
  if (!/^xxx-xxx-\d{4}$/.test(ord.o.customer.phone))
    fails.push(`เบอร์ลูกค้าไม่ได้ถูกปิดบัง: ${ord.o.customer.phone}`);
  ['cost','gp','disc','net','engine','frame','taxId','addr'].forEach(k => {
    if (new RegExp('"' + k + '"').test(ord.json)) fails.push(`payload สถานะการซื้อมีคีย์ต้องห้าม "${k}"`);
  });

  /* การขายที่ยกเลิกแล้วต้องหาไม่เจอ */
  const voided = await p.evaluate(() => {
    const s = SALES.find(x => !x.void);
    const keep = s.void; s.void = true;
    const r = { byTok: pubOrderByToken(s.pubToken), direct: pubOrder(s.custId) };
    s.void = keep;
    return r;
  });
  if (voided.byTok || voided.direct) fails.push('การขายที่ยกเลิกแล้วยังเปิดดูสถานะได้');

  /* ---------- 4 · กฎเรื่องศักดิ์ศรี: ไฟแนนซ์ไม่ผ่านต้องไม่บอกอะไรเลย ---------- */
  const rej = await p.evaluate(() => {
    const fc = FINCASES.find(c => c.status === 'ปฏิเสธ')
      || (FINCASES[0] && Object.assign(FINCASES[0], { status:'ปฏิเสธ',
           rejectReason:'ติดไฟแนนซ์เจ้าอื่น', rejectWith:'SCB', rejectNote:'ลูกค้าแจ้งว่าจะไปปิดบัญชี' }));
    const s = SALES.find(x => x.id === fc.saleId);
    const o = pubOrder(s.custId);
    return { o, json: JSON.stringify(o),
      finNames: FIN_CO.map(f => f.name), reason: fc.rejectReason, with_: fc.rejectWith };
  });
  if (rej.o.status !== 'กรุณาติดต่อร้าน')
    fails.push(`ไฟแนนซ์ไม่ผ่านแต่หน้าติดตามขึ้นว่า "${rej.o.status}" — ต้องเป็น "กรุณาติดต่อร้าน" เท่านั้น`);
  if (/ไม่ผ่าน|ปฏิเสธ/.test(rej.json))
    fails.push('payload มีคำว่า "ไม่ผ่าน" หรือ "ปฏิเสธ" — ลูกค้าอาจเปิดลิงก์นี้ต่อหน้าครอบครัว');
  if (rej.reason && rej.json.indexOf(rej.reason) >= 0)
    fails.push('payload บอกเหตุผลที่ไฟแนนซ์ไม่ผ่าน');
  if (rej.with_ && rej.json.indexOf(rej.with_) >= 0)
    fails.push('payload บอกว่าลูกค้าติดไฟแนนซ์เจ้าไหนอยู่');
  rej.finNames.forEach(n => { if (n && rej.json.indexOf(n) >= 0)
    fails.push(`payload มีชื่อบริษัทไฟแนนซ์ "${n}"`); });
  if (!rej.o.shop || !rej.o.shop.phone)
    fails.push('บอกให้ติดต่อร้านแต่ไม่ได้ให้เบอร์ร้าน');

  /* ---------- 5 · ปุ่มคัดลอกลิงก์และออกรหัสใหม่ ---------- */
  const ui = await p.evaluate(async () => {
    const s = SALES.find(x => !x.void);
    dealGo(s.custId);
    await new Promise(r => setTimeout(r, 350));
    const copy = !!document.querySelector('[data-dlcopy]');
    const renew = !!document.querySelector('[data-dlnewtk]');
    const before = s.pubToken;
    if (renew) document.querySelector('[data-dlnewtk]').click();
    await new Promise(r => setTimeout(r, 250));
    return { copy, renew, changed: SALES.find(x => x.id === s.id).pubToken !== before,
      oldGone: !pubOrderByToken(before) };
  });
  if (!ui.copy)    fails.push('หน้าดีลไม่มีปุ่มคัดลอกลิงก์ติดตาม');
  if (!ui.renew)   fails.push('ผู้ดูแลระบบไม่มีปุ่มออกรหัสใหม่');
  if (!ui.changed) fails.push('กดออกรหัสใหม่แล้วรหัสไม่เปลี่ยน');
  if (!ui.oldGone) fails.push('ออกรหัสใหม่แล้วรหัสเดิมยังใช้ได้อยู่');

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log('ตัวอย่างรหัส ' + tok.sample + ' · รุ่นทั้งหมด ' + cat.n);
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
