-- FAM-1094 · หมายเหตุตอนรับรถเข้าสต๊อก
-- motorcycle_unit มี price_note (เฉพาะเรื่องราคา) อยู่แล้ว — เพิ่ม note ทั่วไป (สภาพรถ/ที่มา/ข้อสังเกต)
alter table motorcycle_unit
  add column if not exists note text;
