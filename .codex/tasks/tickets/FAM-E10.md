## FAM-E10: Automation — Cron & LINE (Phase 3)

Status: Backlog
Priority: Medium
Type: Epic
Phase: 3
Refs: docs/02-architecture.md §4.4, §7 · Spec §6.5

### Summary
Vercel Cron 5 งาน (สร้างงานติดตาม, เตือนรอทะเบียนเกิน, สต๊อกค้าง >90 วัน, เช็กระยะตามไมล์, เตือนปิดเงินเดือน) — API route + `CRON_SECRET`, UTC offset +7 · LINE Messaging API (เช็กระยะ/ทะเบียนออก/พ.ร.บ.ใกล้หมด/สรุปยอด) **ออกแบบให้อยู่ในโควตาฟรี 300 ข้อความ/เดือน**: เข้ากลุ่ม, รวมข้อความ, rich menu

### Done when
cron 5 งานทำงานเห็น log, LINE แจ้งเตือนจริงอยู่ในโควตาฟรี, กันซ้ำ/คำนวณ "เมื่อวาน" ถูก timezone
