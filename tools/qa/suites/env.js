/* ที่เดียวที่รู้ว่า Playwright · Chromium · และเซิร์ฟเวอร์ทดสอบอยู่ตรงไหน
   ชุดตรวจทุกไฟล์ require ตัวนี้ ย้ายเครื่องแล้วแก้ที่นี่ที่เดียว
   หรือจะสั่งทับด้วยตัวแปรสภาพแวดล้อมก็ได้ ไม่ต้องแก้ไฟล์:
     QA_PLAYWRIGHT=/path/to/playwright  QA_CHROMIUM=/path/to/chromium  QA_URL=http://localhost:8123 */
const PW   = process.env.QA_PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright';
const EXE  = process.env.QA_CHROMIUM   || '/opt/pw-browsers/chromium';
const BASE = (process.env.QA_URL       || 'http://localhost:8123').replace(/\/+$/, '');

let chromium;
try {
  ({ chromium } = require(PW));
} catch (e) {
  console.error('หา Playwright ไม่เจอที่ ' + PW + '\n' +
    'ตั้ง QA_PLAYWRIGHT ให้ชี้ไปที่โฟลเดอร์ playwright แล้วรันใหม่\n' + e.message);
  process.exit(2);
}

module.exports = { chromium, EXE, BASE, PW };
