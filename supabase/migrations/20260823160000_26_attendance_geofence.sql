-- FAM-1101 · ลงเวลาแบบตรวจพิกัด (geofence)
-- branch: จุดศูนย์กลางร้าน + รัศมีที่อนุญาตให้ลงเวลา (ตั้งค่าต่อบริษัท — ว่าง = ปิด geofence)
-- attendance: เก็บพิกัด + ระยะห่างตอนลงเวลาเข้า
-- RLS: branch ใช้ grant, attendance ใช้ policy เดิม — คอลัมน์ใหม่ครอบคลุมอยู่แล้ว
alter table branch
  add column if not exists geo_lat      double precision,
  add column if not exists geo_lng      double precision,
  add column if not exists geo_radius_m int;

alter table attendance
  add column if not exists check_in_lat        double precision,
  add column if not exists check_in_lng        double precision,
  add column if not exists check_in_distance_m int;
