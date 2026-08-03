-- ส่วนที่ 4: เงินเดือน งานติดตาม โปรโมชัน audit เอกสาร + index

create table payroll_line (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references payroll_period(id),
  employee_id uuid not null references employee(id),
  base_salary numeric(12,2) not null default 0,
  ot_amount   numeric(12,2) not null default 0,
  commission  numeric(12,2) not null default 0,
  allowance   numeric(12,2) not null default 0,
  deduct_late numeric(12,2) not null default 0,
  deduct_ssn  numeric(12,2) not null default 0,   -- ประกันสังคม (ลูกจ้าง)
  employer_ssn numeric(12,2) not null default 0,  -- ส่วนนายจ้าง (สำหรับรายงาน)
  deduct_tax  numeric(12,2) not null default 0,
  net_pay     numeric(12,2) not null default 0,
  unique (period_id, employee_id)
);

create table commission_rule (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branch(id),
  applies_to text not null,                  -- motorcycle | part | service
  basis text not null,                       -- per_unit | pct_of_gp | pct_of_revenue
  value numeric(12,4) not null,
  effective_from date not null
);

create table follow_up_task (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branch(id),
  customer_id uuid not null references customer(id),
  sale_id uuid references sale(id),
  kind text not null,                        -- 7d | 30d | 90d | 1y | 3y | ทะเบียน | เช็กระยะ
  due_at date not null,
  done_at timestamptz, done_by uuid references app_user(id),
  assigned_to uuid references app_user(id), note text
);

create table promotion (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branch(id),      -- null = ทุกสาขา
  variant_id uuid references model_variant(id),
  title text not null,
  discount_amount numeric(12,2),
  starts_on date not null, ends_on date not null,
  is_active boolean not null default true
);

create table import_log (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branch(id),
  file_name text not null, file_hash text,
  rows_total int, rows_inserted int, rows_duplicate int, rows_invalid int,
  warnings jsonb,
  imported_by uuid references app_user(id),
  imported_at timestamptz not null default now()
);

create table audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor uuid references app_user(id),
  table_name text not null, row_id text not null,
  action text not null,                      -- INSERT | UPDATE | DELETE | VIEW_PII
  before jsonb, after jsonb
);

create table app_setting (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);

-- document ต้องมาหลัง service_job (เอกสารเรียงสลับกัน จึงรันไม่ผ่าน)
create table document (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branch(id),
  doc_type    text not null,
  doc_no      text not null,                -- 'FMG-TAXINV-2569-00042'
  doc_date    date not null,
  sale_id     uuid references sale(id),
  service_job_id uuid references service_job(id),
  customer_id uuid references customer(id),
  amount_base numeric(12,2), amount_vat numeric(12,2), amount_total numeric(12,2),
  -- snapshot ข้อมูลผู้ขาย/ผู้ซื้อ ณ วันออก (เอกสารต้องไม่เปลี่ยนตามข้อมูลปัจจุบัน)
  seller_snapshot jsonb not null,
  buyer_snapshot  jsonb not null,
  printed_count int not null default 0,
  voided_at   timestamptz, voided_reason text,
  unique (branch_id, doc_type, doc_no)
);

-- indexes (ตั้งชื่อชัดเจน + if not exists เพื่อให้รันซ้ำได้)
create index if not exists idx_unit_branch_status on motorcycle_unit (branch_id, status);
create index if not exists idx_unit_received      on motorcycle_unit (received_at);
create index if not exists idx_svc_engine         on service_job (engine_no);
create index if not exists idx_svc_frame          on service_job (frame_no);
create index if not exists idx_attach_owner       on attachment (owner_table, owner_id);
create index if not exists idx_task_due           on follow_up_task (branch_id, due_at) where done_at is null;;
