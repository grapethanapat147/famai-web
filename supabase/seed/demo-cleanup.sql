-- ============================================================================
-- ลบชุดข้อมูลตัวอย่าง (DEMO) ทั้งหมด — ก่อนเปิดใช้จริง หรือก่อนรัน demo.sql ซ้ำ
-- ============================================================================
-- ลบเฉพาะแถวที่ demo.sql สร้าง (id ขึ้นต้น 0000000d-e000-4000-8000- · รถเลขเครื่อง DEMO-)
-- ข้อมูลจริง (รถ 50 คัน / บริษัท / รุ่นรถ / ค่าตั้งค่า) ไม่ถูกแตะ
-- เรียงตามลำดับ FK: ลูกก่อนแม่ · รันทั้งก้อนในทรานแซกชันเดียว ล้มตรงไหนย้อนกลับทั้งหมด
-- ============================================================================
begin;

-- เอกสาร / การรับเงิน / เงินค้างรับ
delete from document where id::text like '0000000d-e000-4000-8000-%';
delete from receipt_payment where receivable_id::text like '0000000d-e000-4000-8000-%';
delete from receivable where id::text like '0000000d-e000-4000-8000-%';

-- ขายส่ง
delete from wholesale_order_line where order_id::text like '0000000d-e000-4000-8000-%';
delete from wholesale_order where id::text like '0000000d-e000-4000-8000-%';
delete from wholesale_company where id::text like '0000000d-e000-4000-8000-%';

-- ศูนย์ซ่อม + อะไหล่ (การเคลื่อนไหวของอะไหล่ตัวอย่างทั้งหมด)
delete from part_movement where part_id::text like '0000000d-e000-4000-8000-%';
delete from service_job_line where job_id::text like '0000000d-e000-4000-8000-%';
delete from service_job where id::text like '0000000d-e000-4000-8000-%';
delete from service_reminder where id::text like '0000000d-e000-4000-8000-%';
delete from part where id::text like '0000000d-e000-4000-8000-%';
delete from sale_freebie where sale_id::text like '0000000d-e000-4000-8000-%';
delete from freebie where id::text like '0000000d-e000-4000-8000-%';

-- การขาย + งานที่ต่อจากการขาย
delete from follow_up_task where customer_id::text like '0000000d-e000-4000-8000-%';
delete from registration_step where registration_id::text like '0000000d-e000-4000-8000-%';
delete from registration_event where registration_id::text like '0000000d-e000-4000-8000-%';
delete from registration where id::text like '0000000d-e000-4000-8000-%';
delete from finance_case_event where case_id::text like '0000000d-e000-4000-8000-%';
delete from finance_case where id::text like '0000000d-e000-4000-8000-%';
delete from sale where id::text like '0000000d-e000-4000-8000-%';

-- ใบเสนอราคา / ปฏิทิน / โปรโมชัน / โอนย้าย / รถตัวอย่าง
delete from quotation_option where quotation_id::text like '0000000d-e000-4000-8000-%';
delete from quotation where id::text like '0000000d-e000-4000-8000-%';
delete from company_event where id::text like '0000000d-e000-4000-8000-%';
delete from promotion where id::text like '0000000d-e000-4000-8000-%';
delete from unit_transfer where id::text like '0000000d-e000-4000-8000-%';
delete from motorcycle_unit where engine_no like 'DEMO-%';

-- ลูกค้า
delete from lead_stage_history where customer_id::text like '0000000d-e000-4000-8000-%';
delete from customer where id::text like '0000000d-e000-4000-8000-%';

-- พนักงาน: ลงเวลา / ลา / สลิป / งวด
delete from attendance where employee_id::text like '0000000d-e000-4000-8000-%';
delete from leave_request where id::text like '0000000d-e000-4000-8000-%';
delete from payslip where period_id::text like '0000000d-e000-4000-8000-%';
delete from payroll_period where id::text like '0000000d-e000-4000-8000-%';
delete from employee where id::text like '0000000d-e000-4000-8000-%';

-- จุดลงเวลา / ค่าใช้จ่าย
delete from branch_site where id::text like '0000000d-e000-4000-8000-%';
delete from expense where id::text like '0000000d-e000-4000-8000-%';

-- ปลดการอ้างอิงจาก "ข้อมูลจริง" ที่อาจชี้มาหาบัญชีทดลอง/จุดลงเวลาตัวอย่าง
-- (ถ้าเคยล็อกอินด้วยบัญชีทดลองแล้วไปแก้ข้อมูลจริง หรือพนักงานจริงลงเวลาที่จุดตัวอย่าง
--  แถวจริงพวกนั้นจะชี้มาที่ id ตัวอย่าง → ลบผู้ใช้/จุดไม่ได้เพราะติด FK) — ตั้งเป็น null ไม่ลบข้อมูลจริง
update audit_log        set actor = null          where actor::text          like '0000000d-e000-4000-8000-%';
update attendance       set check_in_site_id = null where check_in_site_id::text like '0000000d-e000-4000-8000-%';
update customer         set owner_id = null       where owner_id::text       like '0000000d-e000-4000-8000-%';
update sale             set salesperson_id = null where salesperson_id::text like '0000000d-e000-4000-8000-%';
update service_job      set technician_id = null  where technician_id::text  like '0000000d-e000-4000-8000-%';
update motorcycle_unit  set priced_by = null      where priced_by::text      like '0000000d-e000-4000-8000-%';
update expense          set created_by = null, approved_by = null
                        where created_by::text like '0000000d-e000-4000-8000-%' or approved_by::text like '0000000d-e000-4000-8000-%';
update quotation        set created_by = null     where created_by::text     like '0000000d-e000-4000-8000-%';
update company_event    set created_by = null     where created_by::text     like '0000000d-e000-4000-8000-%';
update receipt_payment  set by_user = null        where by_user::text        like '0000000d-e000-4000-8000-%';
update part_movement    set by_user = null        where by_user::text        like '0000000d-e000-4000-8000-%';
update follow_up_task   set done_by = null, assigned_to = null
                        where done_by::text like '0000000d-e000-4000-8000-%' or assigned_to::text like '0000000d-e000-4000-8000-%';
update registration_event set by_user = null      where by_user::text        like '0000000d-e000-4000-8000-%';
update registration_step  set updated_by = null   where updated_by::text     like '0000000d-e000-4000-8000-%';
update finance_case_event set by_user = null      where by_user::text        like '0000000d-e000-4000-8000-%';
update lead_stage_history set changed_by = null   where changed_by::text     like '0000000d-e000-4000-8000-%';
update leave_request    set approved_by = null    where approved_by::text    like '0000000d-e000-4000-8000-%';
update registration     set delivered_by = null   where delivered_by::text   like '0000000d-e000-4000-8000-%';
update wholesale_order  set salesperson_id = null where salesperson_id::text like '0000000d-e000-4000-8000-%';
update branch_site      set created_by = null     where created_by::text     like '0000000d-e000-4000-8000-%';

-- บัญชีทดลอง (ผู้ใช้ + สิทธิ์ + auth)
delete from app_user_role where user_id::text like '0000000d-e000-4000-8000-%';
delete from app_user_branch where user_id::text like '0000000d-e000-4000-8000-%';
delete from app_user where id::text like '0000000d-e000-4000-8000-%';
delete from auth.identities where user_id::text like '0000000d-e000-4000-8000-%';
delete from auth.users where id::text like '0000000d-e000-4000-8000-%';

-- ประวัติการแก้ไขที่ trigger บันทึกไว้ตอน seed (แถวอ้างถึง id ตัวอย่าง)
delete from audit_log where row_id like '0000000d-e000-4000-8000-%';

-- ข้อมูลไฟแนนซ์ที่ demo เติมให้ (เรต/ที่อยู่/เลขผู้เสียภาษี) — คงไว้ เพราะเป็นข้อมูลบริษัทจริง
-- ถ้าต้องการล้างด้วย ให้รันบรรทัดนี้แยก:
-- update finance_company set flat_rate_pct = null, min_down_pct = null, commission = 0, tax_id = null, address = null, phone = null;

commit;
