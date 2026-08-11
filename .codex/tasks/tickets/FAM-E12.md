## FAM-E12: AI SDK Integration (deferred)

Status: Backlog
Priority: Low
Type: Epic
Phase: later
Refs: ผู้ใช้เลือก "ยังไม่ใช้ตอนนี้ เดินสายไว้ทีหลัง"

### Summary
ติดตั้ง Vercel AI SDK + วาง abstraction บาง ๆ ฝั่ง server (route handler ถือ API key) ไว้ให้เปิดใช้ทีหลัง — ยังไม่ทำฟีเจอร์ AI ใน Phase 1 · ไอเดียอนาคต: ผู้ช่วยวิเคราะห์ (ถามภาษาไทย, ต้องเคารพ RLS/role), ช่วยนำเข้า .xls, ร่างข้อความติดตามลูกค้า

### Design constraints (ตอนเปิดใช้)
- AI ต้องเรียกข้อมูลผ่านชั้นเดียวกับ user จริง (เคารพ RLS + money-strip) — ห้ามให้ AI เห็น money-fields ที่ role นั้นไม่มีสิทธิ์
- API key ฝั่ง server เท่านั้น · log/limit การเรียก

### Done when
SDK ติดตั้ง + endpoint ตัวอย่างปิดไว้ พร้อมเปิดเมื่อผู้ใช้สั่ง
