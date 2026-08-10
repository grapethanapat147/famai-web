## FAM-E11: Public Catalog & Status (pub schema)

Status: Backlog
Priority: Medium
Type: Epic
Phase: 2
Refs: docs/07-public-api.md · README v1.14 · supabase/migrations/...14_public_api.sql

### Summary
หน้า/endpoint สาธารณะบน schema `pub` ที่แยกจากข้อมูลจริง: แคตตาล็อกรุ่น+ราคา+สี+รูป · สต๊อกบอกแค่ **มี/เหลือน้อย/หมด** (ไม่บอกตัวเลข/รายคัน) · ลูกค้าเช็กสถานะด้วยรหัสติดตาม 12 ตัว (ไม่ต้องล็อกอิน, ห้ามค้นด้วยเบอร์+ชื่อ) · เคสไม่ผ่านขึ้นแค่ "กรุณาติดต่อร้าน" · rate-limit ใน SQL

### Done when
anon อ่าน `pub.*` ได้ 200 / `public.*` ได้ 401, ไม่มีข้อมูลรายคัน/เหตุผลไฟแนนซ์รั่ว, เพดานเรียกทำงาน
