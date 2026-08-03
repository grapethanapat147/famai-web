-- ส่วนที่ 3: ศูนย์บริการ อะไหล่ ค่าใช้จ่าย ไฟล์แนบ พนักงาน

create table service_job (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references branch(id),
  job_no        text not null,
  customer_id   uuid references customer(id),
  unit_id       uuid references motorcycle_unit(id),  -- ถ้าเป็นรถที่ขายจากร้าน
  engine_no     text,                                 -- ถ้าเป็นรถนอก
  frame_no      text,
  customer_kind text,                                 -- ลูกค้าเก่า | ลูกค้าใหม่
  odometer_km   int,
  service_type  text,                                 -- เช็กระยะ | ซ่อม | เคลม | อื่นๆ
  symptom       text,
  checked_in_at timestamptz not null default now(),
  started_at    timestamptz, finished_at timestamptz,
  status        text not null default 'รับเข้า',
       -- รับเข้า → กำลังซ่อม → รออะไหล่ → เสร็จ → ส่งมอบแล้ว
  labor_cost    numeric(12,2) not null default 0,
  parts_cost    numeric(12,2) not null default 0,
  total         numeric(12,2) not null default 0,
  technician_id uuid references app_user(id)
);

create table service_reminder (              -- 500 / 1,000 / 4,000 / 8,000 กม.
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customer(id),
  unit_id     uuid references motorcycle_unit(id),
  target_km   int not null,
  due_date    date,
  status      text not null default 'รอถึงกำหนด',
  notified_at timestamptz
);

create table part (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branch(id),
  code text not null, name text not null,
  cost numeric(12,2) not null, price numeric(12,2) not null,
  qty_on_hand int not null default 0, min_qty int not null default 0,
  unique (branch_id, code)
);

-- service_job_line ต้องมาหลัง part (เอกสารเรียงสลับกัน จึงรันไม่ผ่าน)
create table service_job_line (
  id bigserial primary key,
  job_id uuid not null references service_job(id),
  kind text not null,                        -- labor | part
  part_id uuid references part(id),
  description text,
  qty numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0
);

create table part_movement (
  id bigserial primary key,
  part_id uuid not null references part(id),
  branch_id uuid not null references branch(id),
  kind text not null,                        -- receive | sale | job | adjust | transfer
  qty int not null,                          -- + เข้า / − ออก
  job_id uuid references service_job(id),
  sale_id uuid references sale(id),
  unit_price numeric(12,2), at timestamptz not null default now(),
  by_user uuid references app_user(id), note text
);

create table expense_category (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table expense (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branch(id),
  category_id uuid not null references expense_category(id),
  spent_at date not null, amount numeric(12,2) not null,
  vendor text, tax_invoice_no text,
  has_receipt boolean not null default false,   -- ธง "ใบเสร็จหาย"
  note text, created_by uuid references app_user(id)
);

create table attachment (
  id uuid primary key default gen_random_uuid(),
  owner_table text not null,                    -- 'expense' | 'motorcycle_unit' | 'registration' | …
  owner_id    uuid not null,
  file_path   text not null,                    -- path ใน Supabase Storage
  file_name   text not null, mime_type text, size_bytes bigint,
  kind        text,                             -- บิล | ใบทะเบียน | รูปรถ | ใบเสร็จ
  uploaded_by uuid references app_user(id),
  uploaded_at timestamptz not null default now()
);

create table employee (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references app_user(id),
  branch_id uuid not null references branch(id),
  emp_code text unique, position text,
  hired_at date, resigned_at date,
  base_salary numeric(12,2),
  ssn_no text,                               -- เลขประกันสังคม (ข้อมูลอ่อนไหว)
  bank_code text, bank_account text
);

create table attendance (
  id bigserial primary key,
  employee_id uuid not null references employee(id),
  work_date date not null,
  check_in timestamptz, check_out timestamptz,
  status text,                                          -- ปกติ | สาย | ลา | ขาด
  late_minutes int,     -- คำนวณตอนบันทึก — generated column อ้าง app_setting ไม่ได้
  work_minutes int, ot_minutes int not null default 0,
  unique (employee_id, work_date)
);

create table leave_request (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employee(id),
  leave_type text not null,                  -- ลาป่วย | ลากิจ | ลาพักร้อน
  date_from date not null, date_to date not null,
  status text not null default 'รออนุมัติ',
  approved_by uuid references app_user(id), approved_at timestamptz, reason text
);

create table payroll_period (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branch(id),
  period_start date not null, period_end date not null,
  status text not null default 'ร่าง',       -- ร่าง | ปิดงวดแล้ว | จ่ายแล้ว
  unique (branch_id, period_start, period_end)
);;
