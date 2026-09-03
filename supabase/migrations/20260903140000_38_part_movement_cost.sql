-- 38 · แช่ต้นทุนอะไหล่ ณ เวลาที่เคลื่อนไหว (FAM-1137)
--
-- ปัญหาที่พบตอนทำรายงานกำไรอะไหล่ (FAM-1120 · fixlist ข้อ 18):
-- part_movement เก็บ "ราคาขาย" (unit_price) ณ เวลานั้น แต่ไม่เก็บ "ต้นทุน"
-- รายงานจึงต้องไปดึง part.cost ปัจจุบันมาคำนวณ → พอราคาทุนขยับ (ของขึ้นราคา/รับล็อตใหม่)
-- กำไรของเดือนที่ปิดไปแล้วก็เปลี่ยนตามย้อนหลัง โดยไม่มีอะไรเตือน
--
-- แก้: เก็บ unit_cost ไว้ในแถวการเคลื่อนไหวเลย เหมือนที่ sale.cost และ wholesale_order_line.cost ทำ

alter table part_movement
  add column if not exists unit_cost numeric(12,2);

comment on column part_movement.unit_cost is 'ต้นทุนต่อชิ้น ณ เวลาที่เคลื่อนไหว — กำไรย้อนหลังไม่ขยับตามราคาทุนปัจจุบัน (FAM-1137)';

-- เติมย้อนหลังให้แถวเดิมด้วยราคาทุนปัจจุบัน (ค่าที่ดีที่สุดเท่าที่มี — ของเดิมไม่ได้เก็บไว้)
update part_movement m
   set unit_cost = p.cost
  from part p
 where m.part_id = p.id
   and m.unit_cost is null;
