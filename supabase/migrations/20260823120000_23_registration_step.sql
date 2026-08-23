-- FAM-1093 P2 · สถานะย่อย + บันทึก + เวลาอัปเดต ต่อขั้นของดีล
-- กดแต่ละ step ในหน้า deal → เลือกสถานะย่อย + หมายเหตุ ต่อขั้น (เก็บ 1 แถวต่อ (ดีล, ขั้น))
create table if not exists registration_step (
  registration_id uuid not null references registration(id) on delete cascade,
  stage       text not null,               -- ขั้น (ขายแล้ว/ส่งไฟแนนซ์/…)
  sub_status  text,                         -- สถานะย่อยที่เลือก
  note        text,                         -- หมายเหตุของขั้นนั้น
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id),
  primary key (registration_id, stage)
);

alter table registration_step enable row level security;

-- เห็น/แก้ได้ตามสาขาของงานทะเบียนแม่ (แพทเทิร์นเดียวกับ service_job_line_scope)
create policy registration_step_scope on registration_step for all to authenticated
  using  (exists (select 1 from registration r where r.id = registration_id
                   and (is_all_branch() or r.branch_id in (select my_branches()))))
  with check (exists (select 1 from registration r where r.id = registration_id
                   and (is_all_branch() or r.branch_id in (select my_branches()))));

grant select, insert, update, delete on registration_step to authenticated;
