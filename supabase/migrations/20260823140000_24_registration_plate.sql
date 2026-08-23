-- FAM-1100 · คิวงานทะเบียน (ป้าย) — เพิ่มฟิลด์ยื่นกรมขนส่ง
-- plate_no / book_no / plate_received_at มีอยู่แล้วในตาราง registration
-- เพิ่มเฉพาะ: เลขคำขอจดทะเบียน (ยื่นกรมขนส่ง) + วันยื่น เพื่อไล่คิว "ยื่นแล้วรอเล่ม"
-- RLS: registration_branch (for all) ครอบคลุมคอลัมน์ใหม่อยู่แล้ว — ไม่ต้องเพิ่ม policy
alter table registration
  add column if not exists dlt_request_no  text,
  add column if not exists dlt_submitted_at date;
