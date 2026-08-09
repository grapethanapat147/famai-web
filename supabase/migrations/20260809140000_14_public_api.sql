-- 14: ข้อมูลสาธารณะสำหรับเว็บขายรถ
--
-- โครงสร้าง: สคีมา pub = สาธารณะทั้งหมด · สคีมา public = ห้าม anon แตะเด็ดขาด
-- กฎเดียวที่ต้องจำคือ "อะไรอยู่ใน pub คือสาธารณะ อะไรอยู่ใน public คือห้ามแตะ"
-- แบบนี้เป็นไปไม่ได้เชิงโครงสร้างที่ anon จะเอื้อมถึงตารางจริง ไม่ใช่แค่ "เราจำได้ว่าอย่าเปิด"
--
-- วิวใน pub ทำงานด้วยสิทธิ์ของเจ้าของ (security_invoker ปิดเป็นค่าเริ่มต้น)
-- จึงข้ามผ่าน RLS ของตารางแม่ได้ตามที่ตั้งใจ
-- *** แปลว่ารายชื่อคอลัมน์กับเงื่อนไข where ของวิวคือเส้นแบ่งความปลอดภัยทั้งหมด ***
-- ต้องเขียนคอลัมน์ทีละชื่อเสมอ ห้าม select *
--
-- รูปร่างข้อมูลต้องตรงกับ pubModel()/pubOrder() ใน index.html เป๊ะ ๆ
-- ฝั่งนั้นมีชุดทดสอบ publicshape-r14.js คุมอยู่ ที่นี่จึงตามให้ตรงเท่านั้น
--
-- ขั้นตอนที่ไม่ใช่ SQL และต้องทำด้วยมือหลังรัน migration นี้:
--   1) Settings → API → Exposed schemas เพิ่ม "pub"
--   2) รัน advisor แล้วยืนยันว่าไม่มีคำเตือนใหม่นอกจาก security_definer_view ที่ตั้งใจไว้

create schema if not exists pub;

-- ── 1) ปิดประตูหลังก่อน ────────────────────────────────────────────────
-- Supabase ให้ anon มีสิทธิ์บนตารางใน public โดยปริยาย
-- สิ่งที่กันอยู่ตอนนี้คือ RLS ไม่ใช่ grant — เผลอเพิ่ม policy หลวมข้อเดียวก็รั่วทันที
revoke all on all tables    in schema public from anon;
revoke all on all routines  in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on routines  from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ── 2) รหัสติดตามของลูกค้า ─────────────────────────────────────────────
-- Crockford base32 12 ตัว = 60 บิต · ตัด I L O U เพราะลูกค้าต้องอ่านทางโทรศัพท์ได้
-- get_byte % 32 ไม่มี modulo bias เพราะ 256 หารด้วย 32 ลงตัว
create or replace function pub.gen_token() returns text
language plpgsql volatile
set search_path = public
as $$
declare
  a text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b bytea := extensions.gen_random_bytes(12);   -- pgcrypto อยู่ในสคีมา extensions บน Supabase
  o text := ''; i int;
begin
  for i in 0..11 loop o := o || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
  return substr(o,1,4) || '-' || substr(o,5,4) || '-' || substr(o,9,4);
end $$;
revoke all on function pub.gen_token() from anon, public;

alter table sale
  add column if not exists public_token      text,
  add column if not exists public_token_at   timestamptz default now(),
  add column if not exists public_expires_at timestamptz;

update sale set public_token = pub.gen_token() where public_token is null;   -- เติมย้อนหลังให้ของเก่า
alter table sale alter column public_token set default pub.gen_token();
alter table sale alter column public_token set not null;
create unique index if not exists sale_public_token_key on sale (public_token);

comment on column sale.public_token is
  'รหัสติดตามที่พิมพ์ให้ลูกค้าบนใบเสร็จ — เป็นกุญแจถือครอง ใครมีรหัสก็ดูได้ จึงต้องสุ่มและเพิกถอนได้';
comment on column sale.public_expires_at is
  'หมดอายุ 90 วันหลังส่งมอบ (ค่าว่าง = ยังไม่กำหนด) · ออกรหัสใหม่ได้จากหน้าดีลถ้าลูกค้าส่งต่อผิดคน';

-- ── 3) บันทึกการเรียก (PDPA: เก็บแฮชของไอพี ไม่เก็บไอพี) ────────────────
create table if not exists public.public_lookup_log (
  id      bigserial primary key,
  ip_hash text not null,
  at      timestamptz not null default now(),
  hit     boolean not null default false
);
create index if not exists public_lookup_log_idx on public.public_lookup_log (ip_hash, at desc);
alter table public.public_lookup_log enable row level security;   -- ไม่มี policy = ไม่มีใครอ่านผ่าน API ได้

comment on table public.public_lookup_log is
  'นับการเรียกหน้าติดตามเพื่อจำกัดอัตราและให้เห็นการใช้ผิดปกติ · เก็บแฮชของไอพีเท่านั้น ไม่เก็บไอพีจริง';

-- ── 4) แคตตาล็อกรุ่น — เส้นแบ่งความปลอดภัย ─────────────────────────────
create or replace view pub.model
with (security_barrier = true) as
select
  v.code,
  v.model_name                        as model,
  coalesce(v.model_th,'')             as model_th,
  coalesce(v.category,'')             as cat,
  v.cc,
  v.model_year                        as year,
  ph.retail,
  v.photo_url                         as photo,
  (select jsonb_agg(jsonb_build_object('code', c.color_code, 'name', c.color_name)
            order by c.color_code)
     from public.model_color c where c.variant_id = v.id)                    as colors,
  (select jsonb_agg(jsonb_build_object('card', mp.path_card, 'full', mp.path_full)
            order by mp.sort)
     from public.model_photo mp where mp.variant_id = v.id)                  as photos,
  -- จำนวนคันไม่เคยออกจากเซิร์ฟเวอร์ ยุบเป็นถังตั้งแต่ในวิว
  case when av.n = 0 then 'order'
       when av.n <= ls.low then 'low'
       else 'ready' end                                                      as availability
from public.model_variant v
cross join lateral (select coalesce((select value::int from public.app_setting
                                      where key = 'low_stock'), 2) as low) ls
left join lateral (select p.retail from public.price_history p
                    where p.variant_id = v.id and p.effective_from <= current_date
                    order by p.effective_from desc limit 1) ph on true
left join lateral (select count(*) as n from public.motorcycle_unit u
                    where u.variant_id = v.id and u.status = 'available') av on true;

comment on view pub.model is
  'สาธารณะ — วิวนี้คือเส้นแบ่งความปลอดภัย ห้ามเติมคอลัมน์ต้นทุน กำไร ส่วนลด เลขเครื่อง '
  'เลขตัวถัง เอกสารซื้อ และห้ามคืนจำนวนคันเป็นตัวเลขหรือแยกสาขา '
  '(คู่แข่งดึงทุกวันแล้วรู้ยอดขายรายรุ่นได้) ให้คืนเป็น ready/low/order เท่านั้น';

-- ── 5) สถานะการซื้อของลูกค้า — เป็น RPC ไม่ใช่วิว เพราะต้องจำกัดอัตราและบันทึกการเรียก ──
-- กฎที่สำคัญที่สุดของฟังก์ชันนี้เป็นกฎเรื่องศักดิ์ศรี ไม่ใช่กฎเรื่องข้อมูล:
-- เคสไฟแนนซ์ที่ไม่ผ่านคืนแค่ 'กรุณาติดต่อร้าน' ห้ามบอกเหตุผล ห้ามบอกชื่อเจ้าไฟแนนซ์
-- ลูกค้าอาจเปิดลิงก์นี้ต่อหน้าครอบครัว
create or replace function pub.order_status(p_token text)
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare r record; v_ip text; v_h text; v_n int; v_status text;
begin
  v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for',''), ',', 1);
  v_h  := encode(extensions.digest(coalesce(nullif(v_ip,''),'-'), 'sha256'), 'hex');

  select count(*) into v_n from public.public_lookup_log
   where ip_hash = v_h and at > now() - interval '1 hour';
  if v_n > 20 then raise exception 'ขอข้อมูลถี่เกินไป กรุณารอสักครู่'; end if;
  insert into public.public_lookup_log(ip_hash) values (v_h);

  select s.id, s.pay_method, g.stage, g.due_at, g.plate_no, g.delivered_at,
         c.full_name, c.phone, b.name as shop, b.phone as shop_phone,
         mv.model_name, mv.model_th, mc.color_name, f.status as fin_status
    into r
    from public.sale s
    join public.customer c        on c.id = s.customer_id
    join public.branch b          on b.id = s.branch_id
    join public.motorcycle_unit u on u.id = s.unit_id
    join public.model_variant mv  on mv.id = u.variant_id
    left join public.model_color mc on mc.variant_id = u.variant_id and mc.color_code = u.color_code
    left join public.registration g on g.sale_id = s.id
    left join public.finance_case f on f.sale_id = s.id
   where s.public_token = upper(trim(p_token))
     and s.voided_at is null
     and (s.public_expires_at is null or s.public_expires_at > now());

  if not found then return jsonb_build_object('found', false); end if;

  update public.public_lookup_log set hit = true
   where id = (select max(id) from public.public_lookup_log where ip_hash = v_h);

  v_status := case
    when r.delivered_at is not null then 'ส่งมอบรถแล้ว'
    when r.fin_status = 'ปฏิเสธ'    then 'กรุณาติดต่อร้าน'
    when r.fin_status is not null and r.fin_status <> 'อนุมัติแล้ว'
                                    then 'กำลังดำเนินการเรื่องสินเชื่อ'
    else 'กำลังดำเนินการเรื่องทะเบียน' end;

  return jsonb_build_object(
    'found',    true,
    'status',   v_status,
    'model',    r.model_name,
    'model_th', coalesce(r.model_th,''),
    'color',    coalesce(r.color_name,''),
    'plate',    r.plate_no,
    'due_at',   r.due_at,
    'delivered_at', r.delivered_at,
    'customer', jsonb_build_object(
        'name',  split_part(r.full_name, ' ', 1),
        'phone', 'xxx-xxx-' || right(regexp_replace(coalesce(r.phone,''), '\D', '', 'g'), 4)),
    'shop',     jsonb_build_object('name', r.shop, 'phone', r.shop_phone));
end $$;

-- ── 6) เปิดเฉพาะสคีมา pub ให้ anon ─────────────────────────────────────
grant usage  on schema pub to anon, authenticated;
grant select on pub.model  to anon, authenticated;
revoke all    on function pub.order_status(text) from public;
grant execute on function pub.order_status(text) to anon, authenticated;
