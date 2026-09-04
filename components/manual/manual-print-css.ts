/**
 * สไตล์ของคู่มือฉบับพิมพ์ (FAM-1138) — แยกจากธีมของแอปโดยตั้งใจ
 * คู่มือถูกพิมพ์เป็น PDF เสมอ จึงตรึงเป็นพื้นขาวตัวหนังสือดำ ไม่ตามธีมมืดของแอป
 * ฟอนต์ใช้ Noto Sans Thai ตัวเดียวกับแอป (self-host ผ่านตัวแปร --f-thai ที่ root layout ตั้งไว้)
 */
export const MANUAL_PRINT_CSS = `
@page { size: A4; margin: 16mm 17mm; }

html[data-theme] body, body {
  background: #ffffff;
  color: #15181b;
  font-family: var(--f-thai), "Noto Sans Thai", "Loma", sans-serif;
  font-size: 10.5pt;
  line-height: 1.75;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
* { box-sizing: border-box; }
.sheet { max-width: 176mm; margin: 0 auto; padding: 12mm 0 20mm; }

h1 { font-size: 24pt; font-weight: 700; line-height: 1.3; letter-spacing: -0.01em; margin: 0; }
h2 {
  font-size: 14pt; font-weight: 700; margin: 22pt 0 8pt;
  padding-bottom: 5pt; border-bottom: 1.5pt solid #15181b; break-after: avoid;
}
h3 { font-size: 11.5pt; font-weight: 600; margin: 14pt 0 4pt; break-after: avoid; }
p { margin: 0 0 7pt; }
ol, ul { margin: 0 0 8pt 17pt; padding: 0; }
li { margin: 0 0 3pt; }

.cover { min-height: 232mm; display: flex; flex-direction: column; justify-content: center; break-after: page; }
.cover .eyebrow { font-size: 10pt; letter-spacing: 0.16em; text-transform: uppercase; color: #6b7076; margin-bottom: 10pt; }
.cover h1 { font-size: 33pt; }
.cover .role { font-size: 19pt; font-weight: 600; color: #c8102e; margin-top: 4pt; }
.cover .why { font-size: 11.5pt; color: #40464c; margin-top: 16pt; max-width: 132mm; }
.cover .meta { margin-top: auto; font-size: 9pt; color: #6b7076; border-top: 1pt solid #dde1e5; padding-top: 8pt; }
.cover .toc { margin-top: 18pt; font-size: 10pt; color: #40464c; }
.cover .toc b { color: #15181b; }

.lead { font-size: 10.5pt; color: #40464c; margin-bottom: 10pt; }

table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 0 0 10pt; }
th { text-align: left; font-weight: 600; background: #f4f6f8; padding: 5pt 7pt; border-bottom: 1pt solid #dde1e5; }
td { padding: 5pt 7pt; border-bottom: 0.5pt solid #e8ebee; vertical-align: top; }
tr { break-inside: avoid; }

.tag {
  display: inline-block; font-size: 8pt; font-weight: 600; padding: 1.5pt 6pt;
  border-radius: 9pt; background: #f4f6f8; color: #40464c; white-space: nowrap;
}
.tag.no { background: #fbe9ec; color: #9f0c24; }
.tag.yes { background: #e7f5ec; color: #1b6b39; }
.tag.role { color: #ffffff; }

.step { break-inside: avoid; margin: 0 0 9pt; padding-left: 21pt; position: relative; }
.step .n {
  position: absolute; left: 0; top: 1.5pt; width: 15pt; height: 15pt; border-radius: 50%;
  background: #15181b; color: #fff; font-size: 8.5pt; font-weight: 700; text-align: center; line-height: 15pt;
}
.step .t { font-weight: 600; }
.step .w { font-size: 9pt; color: #6b7076; }
.step.mine .n { background: #c8102e; }

.warn { break-inside: avoid; border-left: 2.5pt solid #c8102e; background: #fbe9ec; padding: 7pt 10pt; margin: 0 0 7pt; }
.note { break-inside: avoid; border-left: 2.5pt solid #1b6b39; background: #e7f5ec; padding: 7pt 10pt; margin: 0 0 7pt; }

.sample { break-inside: avoid; border: 1pt solid #dde1e5; border-radius: 5pt; margin: 0 0 9pt; overflow: hidden; }
.sample .hd { background: #f4f6f8; padding: 4pt 9pt; font-weight: 600; font-size: 10pt; border-bottom: 1pt solid #dde1e5; }
.sample ul { margin: 6pt 9pt 6pt 24pt; font-size: 9.5pt; }

/* ภาพหน้าจอ = หน้าพรีวิวจริงที่ฝังมาแบบย่อส่วน (ไม่ใช่ภาพถ่าย) ตัวหนังสือจึงคมและค้นหาได้ใน PDF
   กรอบกว้าง 72 มม. = 272.1 px · ย่อจากความกว้างมือถือ 390 px ด้วยอัตรา 0.6978 */
.figs { break-before: page; }
.grid2 { display: flex; flex-wrap: wrap; gap: 7mm; justify-content: center; }
.fig { break-inside: avoid; text-align: center; }
.fig .frame {
  width: 72mm; height: 158.6mm; overflow: hidden; background: #fff;
  border: 1pt solid #dde1e5; border-radius: 4pt; position: relative;
}
/* จอมือถือยาวกว่ากรอบเสมอ — ไล่สีจางที่ขอบล่างให้รู้ว่ายังมีต่อ ไม่ใช่ภาพถูกตัดขาด */
.fig .frame::after {
  content: ""; position: absolute; inset: auto 0 0 0; height: 14mm;
  background: linear-gradient(to bottom, rgba(255,255,255,0), #ffffff);
}
.fig iframe { width: 390px; height: 860px; border: 0; display: block; transform: scale(0.6978); transform-origin: top left; }
.fig .cap { font-size: 9pt; color: #6b7076; margin-top: 4pt; }

.foot { font-size: 8.5pt; color: #6b7076; border-top: 1pt solid #dde1e5; padding-top: 6pt; margin-top: 16pt; }

/* บนจอ (เปิดดูในเบราว์เซอร์) ทำให้ดูเหมือนกระดาษ — ตอนพิมพ์เอาออก */
@media screen {
  body { background: #e9ebee; }
  .sheet { background: #fff; padding: 16mm 17mm; margin: 8mm auto; box-shadow: 0 2px 18px rgba(0,0,0,0.12); }
}
@media print {
  .no-print { display: none !important; }
  .sheet { max-width: none; margin: 0; padding: 0; box-shadow: none; }
}
`;
