-- FAM-1105 · ส่งมอบรถ — เก็บสถานที่ + ผู้ส่งมอบ (delivered_at มีอยู่แล้ว)
-- ปิดวงจรดีล: ป้ายขาว → ส่งมอบแล้ว พร้อมบันทึกว่าใครส่งมอบที่ไหน
-- RLS: registration_branch (for all) ครอบคลุมคอลัมน์ใหม่อยู่แล้ว
alter table registration
  add column if not exists delivery_place text,
  add column if not exists delivered_by   uuid references app_user(id);
