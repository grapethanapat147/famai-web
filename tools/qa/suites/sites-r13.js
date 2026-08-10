/* v1.13 — จุดลงเวลา: สิทธิ์ · การปักหมุด · กติกาการลบ · ตัววัดระยะ
   ด่านทุกตัวต้องอยู่ใน siteSave() ไม่ใช่ที่ปุ่ม — ชุดนี้เรียกฟังก์ชันตรง ๆ เพื่อพิสูจน์ */
const { chromium, EXE, BASE } = require('./env');
const ROLE_ID = { admin:'ST1', manager:'ST2', sales:'ST3', stock:'ST6', acct:'ST7', hr:'ST8', tech:'ST9' };
const CAN_EDIT = ['admin','manager'];
const SI1 = { lat:13.756331, lng:100.501765 };

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const fails = [], errs = [];
  const ctxOpt = { viewport:{width:1440,height:900}, timezoneId:'Asia/Bangkok',
    permissions:['geolocation'],
    geolocation:{ latitude:SI1.lat, longitude:SI1.lng, accuracy:15 } };
  const login = async (p,id) => { await p.goto(BASE + '/index.html');
    await p.click(`#lgUsers [data-id="${id}"]`); await p.click('#lgGo'); await p.waitForTimeout(400); };

  /* ---------- 1 · ตัววัดระยะต้องตรงกับค่าที่รู้จริง ---------- */
  {
    const ctx = await b.newContext(ctxOpt); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('[dist] ' + e.message));
    await login(p, 'ST1');
    const d = await p.evaluate(() => ({
      deg:  distM({lat:0,lng:0},{lat:1,lng:0}),               /* 1 องศาละติจูด ≈ 111195 ม. */
      near: distM({lat:13.7,lng:100.5},{lat:13.7,lng:100.501}),/* 0.001 องศาลองจิจูดที่ละติจูด 13.7 ≈ 108 ม. */
      zero: distM({lat:13.7,lng:100.5},{lat:13.7,lng:100.5}),
      swap: distM({lat:13.7,lng:100.5},{lat:13.701,lng:100.5}), /* 0.001 องศาละติจูด ≈ 111 ม. */
      /* ที่ละติจูด 60 ลองจิจูดหดเหลือครึ่งเดียว — ถ้าสลับ lat/lng ค่าจะผิดเป็นเท่าตัว ไม่ใช่ผิดนิดเดียว */
      hiLng: distM({lat:60,lng:0},{lat:60,lng:0.01}),           /* ≈ 556 ม. */
      hiLat: distM({lat:60,lng:0},{lat:60.01,lng:0})            /* ≈ 1112 ม. */
    }));
    if (Math.abs(d.deg - 111195) > 5)  fails.push(`distM 1 องศาละติจูด = ${d.deg} ควรเป็น ~111195`);
    if (Math.abs(d.near - 108) > 3)    fails.push(`distM 0.001 องศาลองจิจูด = ${d.near} ควรเป็น ~108`);
    if (d.zero !== 0)                  fails.push(`distM จุดเดียวกัน = ${d.zero} ควรเป็น 0`);
    if (Math.abs(d.swap - 111) > 3)    fails.push(`distM 0.001 องศาละติจูด = ${d.swap} ควรเป็น ~111`);
    if (Math.abs(d.hiLng - 556) > 8)   fails.push(`distM 0.01 องศาลองจิจูดที่ละติจูด 60 = ${d.hiLng} ควรเป็น ~556 (lat/lng สลับกันหรือเปล่า)`);
    if (Math.abs(d.hiLat - 1112) > 8)  fails.push(`distM 0.01 องศาละติจูดที่ละติจูด 60 = ${d.hiLat} ควรเป็น ~1112 (lat/lng สลับกันหรือเปล่า)`);

    /* nearestSite: สาขาที่มีจุด vs สาขาที่ยังไม่มี */
    const n = await p.evaluate(() => ({
      inside:  nearestSite('FMG01', {lat:13.756331, lng:100.501765, acc:10}),
      edge:    nearestSite('FMG01', {lat:13.757500, lng:100.501765, acc:10}),  /* ~130 ม. */
      far:     nearestSite('FMG01', {lat:13.800000, lng:100.501765, acc:10}),  /* ~4.8 กม. */
      nosite:  nearestSite('FMM01', {lat:13.756331, lng:100.501765, acc:10})
    }));
    if (!n.inside || n.inside.outside) fails.push('nearestSite: อยู่ตรงหมุดแล้วยังบอกว่านอกพื้นที่');
    if (n.inside && n.inside.siteId !== 'SI1') fails.push('nearestSite: ไม่ได้คืนจุด SI1');
    if (!n.edge || n.edge.outside)     fails.push(`nearestSite: ห่าง ${n.edge && n.edge.dist} ม. ยังอยู่ในรัศมี 150 แต่บอกว่านอกพื้นที่`);
    if (!n.far || !n.far.outside)      fails.push('nearestSite: ห่างหลายกิโลแล้วยังบอกว่าอยู่ในพื้นที่');
    if (n.nosite !== null)             fails.push('nearestSite: สาขาที่ไม่มีจุดต้องคืน null (ปล่อยผ่าน)');

    /* ผ่อนผันตามความคลาดเคลื่อน แต่ต้องมีเพดาน geoSlack */
    const slack = await p.evaluate(() => ({
      loose: nearestSite('FMG01', {lat:13.757900, lng:100.501765, acc:100}),  /* ~175 ม. acc 100 → ผ่อนผันได้ */
      cap:   nearestSite('FMG01', {lat:13.760000, lng:100.501765, acc:9000})  /* ~408 ม. acc มหาศาล → ต้องไม่ผ่าน */
    }));
    if (!slack.loose || slack.loose.outside) fails.push('ผ่อนผัน: acc 100 ที่ระยะ ~175 ม. ควรยังนับว่าอยู่ในพื้นที่');
    if (!slack.cap   || !slack.cap.outside)  fails.push('เพดาน geoSlack: acc มหาศาลไม่ควรทำให้ผ่านได้ทุกระยะ');
    await ctx.close();
  }

  /* ---------- 2 · สิทธิ์ 7 บทบาท — ด่านต้องอยู่ในฟังก์ชัน ---------- */
  for (const [role, id] of Object.entries(ROLE_ID)) {
    const ctx = await b.newContext(ctxOpt); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`[${role}] ${e.message}`));
    await login(p, id);
    const may = CAN_EDIT.includes(role);
    const can = await p.evaluate(() => canEditSites());
    if (can !== may) fails.push(`[${role}] canEditSites() = ${can} ควรเป็น ${may}`);

    /* เรียก siteSave() ตรง ๆ โดยไม่ต้องเข้าหน้าตั้งค่าเลย — ปุ่มถูกซ่อนไม่ใช่การกัน
       เติมสาขาที่อยู่ในขอบเขตให้ก่อน เพื่อให้ด่านเดียวที่เหลือคือด่านสิทธิ์ */
    const forced = await p.evaluate(() => {
      const before = SITES.length;
      const sel = document.querySelector('#siBranch');
      sel.innerHTML = '<option value="' + myBranches()[0] + '">x</option>';
      sel.value = myBranches()[0];
      document.querySelector('#siName').value = 'แอบเพิ่มจากคอนโซล';
      SI_PIN = { lat:13.9, lng:100.9, acc:10 };
      const ok = siteSave();
      return { ok, added: SITES.length - before };
    });
    if (!may && forced.added)
      fails.push(`[${role}] เรียก siteSave() ตรง ๆ แล้วเพิ่มจุดได้ทั้งที่ไม่มีสิทธิ์`);
    if (may && !forced.added)
      fails.push(`[${role}] มีสิทธิ์แต่ siteSave() ไม่ทำงาน`);

    const seeSettings = await p.evaluate(() => MENU.some(m => m.k === 'settings' && m.r.includes(ME.role)));
    if (!seeSettings) { await ctx.close(); continue; }

    await p.evaluate(() => go('settings')); await p.waitForTimeout(300);
    const hasTab = await p.$('#cfTabs button[data-p="cf4"]');
    if (!hasTab) fails.push(`[${role}] ไม่มีแท็บจุดลงเวลา`);
    await p.click('#cfTabs button[data-p="cf4"]'); await p.waitForTimeout(200);
    if (await p.isVisible('#siFormCard') !== may)
      fails.push(`[${role}] ฟอร์มเพิ่มจุด visible = ${!may}`);
    await ctx.close();
  }

  /* ---------- 3 · กติกาของฟอร์ม (ใช้บทบาทผู้บริหาร) ---------- */
  {
    const ctx = await b.newContext(ctxOpt); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('[form] ' + e.message));
    await login(p, 'ST2');
    await p.evaluate(() => go('settings')); await p.waitForTimeout(300);
    await p.click('#cfTabs button[data-p="cf4"]'); await p.waitForTimeout(200);

    const set = (name, branch) => p.evaluate(([n, br]) => {
      document.querySelector('#siName').value = n;
      if (br) document.querySelector('#siBranch').value = br;
    }, [name, branch]);

    /* ไม่ได้ปักหมุด → เพิ่มไม่ได้ */
    await set('จุดไม่มีหมุด', 'FMG01');
    let r = await p.evaluate(() => { SI_PIN = null; const n = SITES.length; siteSave(); return SITES.length - n; });
    if (r) fails.push('เพิ่มจุดได้ทั้งที่ยังไม่ได้ปักหมุด');

    /* ชื่อว่าง → เพิ่มไม่ได้ */
    await set('', 'FMG01');
    r = await p.evaluate(() => { SI_PIN = {lat:13.7,lng:100.5,acc:9}; const n = SITES.length; siteSave(); return SITES.length - n; });
    if (r) fails.push('เพิ่มจุดได้ทั้งที่ชื่อว่าง');

    /* ชื่อซ้ำในสาขาเดียวกัน → เพิ่มไม่ได้ */
    await set('สำนักงานใหญ่', 'FMG01');
    r = await p.evaluate(() => { SI_PIN = {lat:13.7,lng:100.5,acc:9}; const n = SITES.length; siteSave(); return SITES.length - n; });
    if (r) fails.push('เพิ่มจุดชื่อซ้ำในสาขาเดียวกันได้');

    /* สาขานอกขอบเขต → เพิ่มไม่ได้ (ยัดค่าที่ไม่มีใน select) */
    r = await p.evaluate(() => {
      document.querySelector('#siName').value = 'จุดสาขาแปลก';
      const s = document.querySelector('#siBranch');
      s.innerHTML = '<option value="ZZZ99">นอกระบบ</option>'; s.value = 'ZZZ99';
      SI_PIN = {lat:13.7,lng:100.5,acc:9};
      const n = SITES.length; siteSave(); return SITES.length - n;
    });
    if (r) fails.push('เพิ่มจุดให้สาขาที่ไม่ได้ดูแลได้');

    /* กรณีถูกต้อง → เพิ่มได้จริง และค่าที่เก็บถูกต้อง */
    await p.evaluate(() => go('settings')); await p.waitForTimeout(250);
    await p.click('#cfTabs button[data-p="cf4"]'); await p.waitForTimeout(200);
    const good = await p.evaluate(() => {
      document.querySelector('#siName').value = 'ร้านย่อยบางแค';
      document.querySelector('#siBranch').value = 'FMM01';
      document.querySelector('#siRadius').value = '250';
      SI_PIN = {lat:13.720000, lng:100.400000, acc:11};
      const ok = siteSave();
      const s = SITES[SITES.length - 1];
      return { ok, n: SITES.length, s };
    });
    if (!good.ok) fails.push('เพิ่มจุดที่ถูกต้องแล้วไม่สำเร็จ');
    else {
      if (good.s.branch !== 'FMM01') fails.push('จุดใหม่ผูกสาขาผิด');
      if (good.s.radius !== 250)     fails.push(`จุดใหม่รัศมี ${good.s.radius} ควรเป็น 250`);
      if (good.s.pinAcc !== 11)      fails.push('จุดใหม่ไม่ได้เก็บความแม่นของหมุด');
      if (good.s.active !== true)    fails.push('จุดใหม่ควรเปิดใช้งานทันที');
    }

    /* รัศมีต้องไม่มีตัวเลือกต่ำกว่า 100 ม. */
    const radii = await p.$$eval('#siRadius option', o => o.map(x => +x.value));
    if (radii.some(x => x < 100)) fails.push(`รัศมีมีตัวเลือกต่ำกว่า 100 ม.: ${radii}`);

    /* จุดที่มีการลงเวลาอ้างอยู่ ลบไม่ได้ */
    await p.evaluate(() => {
      const a = ATT.find(x => x.staffId === 'ST1' && x.in) || ATT[0];
      a.inProof = Object.assign({}, a.inProof || {}, { siteId:'SI1' });
      rSites();
    });
    await p.waitForTimeout(150);
    const del = await p.evaluate(() => {
      const n = SITES.length;
      const btn = document.querySelector('[data-sid="SI1"]');
      if (btn) btn.click();
      return { removed: n - SITES.length, hadBtn: !!btn, refs: siteRefs('SI1') };
    });
    if (!del.hadBtn) fails.push('ไม่มีปุ่มลบจุดให้ทดสอบ');
    if (!del.refs)   fails.push('siteRefs ไม่นับการลงเวลาที่อ้างจุดนี้');
    if (del.removed) fails.push('ลบจุดที่มีการลงเวลาอ้างอยู่ได้');

    /* ปิดใช้งานแทนได้ และ sitesOf ต้องไม่คืนจุดที่ปิดแล้ว */
    const off = await p.evaluate(() => {
      if (!siteById('SI1')) return { gone:true };
      const btn = document.querySelector('[data-sit="SI1"]'); if (btn) btn.click();
      const s = siteById('SI1');
      return { active: s && s.active, n: sitesOf('FMG01').length };
    });
    if (off.gone)        fails.push('SI1 หายไปก่อนถึงขั้นทดสอบการปิดใช้งาน');
    else if (off.active) fails.push('กดปิดใช้งานแล้วยัง active อยู่');
    else if (off.n)      fails.push('sitesOf ยังคืนจุดที่ปิดใช้งานแล้ว');
    await ctx.close();
  }

  /* ---------- 4 · ค่าตั้งต้นและการบันทึกเกณฑ์ ---------- */
  {
    const ctx = await b.newContext(ctxOpt); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push('[cfg] ' + e.message));
    await login(p, 'ST1');
    const d = await p.evaluate(() => ({ mode: CFG.geoMode, acc: CFG.geoAcc, slack: CFG.geoSlack }));
    if (d.mode !== 'watch') fails.push(`geoMode เริ่มต้น = ${d.mode} ควรเป็น watch (เปิดแบบสังเกตก่อน)`);
    if (d.acc !== 120)      fails.push(`geoAcc เริ่มต้น = ${d.acc}`);
    if (d.slack !== 100)    fails.push(`geoSlack เริ่มต้น = ${d.slack}`);

    await p.evaluate(() => go('settings')); await p.waitForTimeout(300);
    const saved = await p.evaluate(() => {
      document.querySelector('#cfGeoMode').value = 'enforce';
      document.querySelector('#cfGeoAcc').value = '90';
      document.querySelector('#cfGeoSlack').value = '60';
      document.querySelector('#cfSave').click();
      return { mode: CFG.geoMode, acc: CFG.geoAcc, slack: CFG.geoSlack };
    });
    if (saved.mode !== 'enforce') fails.push('บันทึกโหมดไม่ติด');
    if (saved.acc !== 90 || typeof saved.acc !== 'number')   fails.push(`geoAcc หลังบันทึก = ${JSON.stringify(saved.acc)} ต้องเป็นตัวเลข 90`);
    if (saved.slack !== 60 || typeof saved.slack !== 'number') fails.push(`geoSlack หลังบันทึก = ${JSON.stringify(saved.slack)} ต้องเป็นตัวเลข 60`);
    await ctx.close();
  }

  console.log(fails.length ? 'FAILS:\n' + fails.join('\n') : 'ALL_CHECKS_PASS');
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'NO_PAGE_ERRORS');
  await b.close();
  process.exit(fails.length || errs.length ? 1 : 0);
})();
