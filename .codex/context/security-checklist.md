# Security Checklist — Famai (เน้นเป็นพิเศษ)

อ้างอิง `docs/02-architecture.md` §5, `docs/08-state-and-handoff.md` §6-7, design-system §9
อ่านก่อนแตะ auth / permission / data read-write / เอกสาร / storage

## Threats ที่ต้องกันจริง (พร้อมวิธี)

| ภัย | การป้องกัน (มีของอยู่แล้วใน 39 migrations) |
|---|---|
| เซลล์เห็นต้นทุน/กำไร | ชั้นแอป: ไม่ select/return money-fields ถ้าไม่มีสิทธิ์ `money` (`stripMoneyFields` + `canSeeMoney`) · **ยังไม่ปิดที่ DB** สำหรับ `motorcycle_unit` / `sale` / `receivable` / `part` → ดู FAM-1141 |
| เงินเดือน/ปกส./บัญชีธนาคารรั่ว | **ปิดที่ DB แล้ว** — `payslip` RLS ต้องมี `has_money()` (FAM-1144) · 4 คอลัมน์อ่อนไหวใน `employee` ถูก `revoke select` อ่านได้ทางเดียวผ่าน `employee_pay_info()` (FAM-1145) |
| ข้ามสาขา | RLS `my_branches()`/`is_all_branch()` ที่ DB — ไม่ใช่ filter ในแอป |
| ขายรถซ้ำ | ตัดสต๊อก+บันทึกขายใน RPC/transaction เดียว + unique guard |
| แก้ย้อนหลังโดยไม่ควร | permission `editBack` + audit_log |
| เลขเอกสารซ้ำ/ข้าม | `next_doc_no(branch,type,year)` — ล็อกแถว doc_counter |
| ยกเลิกเอกสารแล้วลบหลักฐาน | void = เก็บเหตุผล/timestamp ไม่ลบ (e-Tax ต้องออกใบลดหนี้) |
| secret หลุด | `SUPABASE_SERVICE_ROLE_KEY` server เท่านั้น; client ใช้ publishable + RLS |
| public API รั่ว | `pub` schema + view column list เป็นเส้นแบ่ง; ถอน `anon` ใน `public`; rate-limit ใน SQL |

## กฎเหล็ก (handoff §6)
- **ด่านอยู่ในฟังก์ชันเขียนข้อมูล ไม่ใช่ที่ปุ่ม** (§9b) — รวมหน้าที่สิทธิ์ต่างกัน แท็บต้องเป็นด่านจริง (§9h)
- **เวลามาจากเซิร์ฟเวอร์** ไม่ใช่นาฬิกา client; พิกัดเป็นหลักฐานไม่ใช่ตัวตัดสิน (§9i)
- **apply migration ผ่าน ≠ ใช้ได้** — ยิงจริงทุก endpoint ด้วยสิทธิ์ role จริง (§9j)
- view รันด้วยสิทธิ์เจ้าของ (security_invoker ปิด) → **รายชื่อคอลัมน์ของ view = เส้นแบ่งความปลอดภัยทั้งหมด**
  แต่ **ห้ามใช้ view ปิดคอลัมน์ในสคีมา `public`** — `security_invoker` เปิด = ติดสิทธิ์คอลัมน์ของผู้เรียกเหมือนเดิม
  ส่วนปิด = ข้าม RLS ของตารางแม่ (การแยกตามบริษัทพัง) · ใช้ฟังก์ชัน security definer ที่เขียนเงื่อนไขเองแทน (FAM-1145)
- **RLS กันได้แค่ระดับแถว ไม่ใช่ระดับคอลัมน์** และผู้ใช้ที่ล็อกอินทุกคนเป็น Postgres role เดียวกัน (`authenticated`)
  → `revoke select (คอลัมน์)` ตัดสิทธิ์ของ**ทุกบทบาทพร้อมกัน** ต้องเปิดทางกลับผ่านฟังก์ชันที่ตรวจสิทธิ์เอง
- `app_setting.value` เป็น `jsonb` → `to_jsonb('watch'::text)`; ฟังก์ชันที่ insert ต้อง `volatile`
- `pgcrypto` อยู่ schema `extensions` → `extensions.gen_random_bytes`

## PDPA (architecture §5)
เก็บเท่าที่จำเป็น · เลขบัตร ปชช. เฉพาะที่จำเป็นต่อใบกำกับภาษี + จำกัดสิทธิ์เห็น · consent + สิทธิ์ดู/แก้/ลบ · log การเปิดดูข้อมูลลูกค้า · กำหนดอายุการเก็บ

## ต้องทำบน Supabase console (owner เท่านั้น — AI/นักพัฒนาทำแทนไม่ได้) — อัปเดต 3 ก.ย. 2569
- [x] รีเซ็ตรหัสผ่าน DB (รหัสเดิมหลุดผ่านแชต) — ทำแล้ว
- [ ] เปิด 2FA อย่างน้อย Admin/ผู้บริหาร — ทำได้ทุกแพ็ก
- [ ] **`npm run backup` เดือนละครั้ง + ก๊อปออกนอกเครื่อง** + ทดสอบกู้คืนจริงปีละครั้ง
      (แพ็กฟรีไม่มี backup อัตโนมัติ · เจ้าของเลือกยังไม่อัป Pro จนกว่าจะวางบิลลูกค้า)
- [ ] อัป Supabase Pro **ก่อนออกใบกำกับภาษีใบแรก** + ตั้ง spending cap
- [ ] เปิด Leaked Password Protection — **ทำได้หลังอัป Pro เท่านั้น**
      ระหว่างนี้ใช้ `lib/auth/password.ts` (นโยบายรหัสผ่านฝั่งแอป FAM-1136) กันรหัสเดาง่ายแทน

## Security test checklist (ต้องมี test จริง ก่อน Done)
เทสกับฐานข้อมูลจริงอยู่ที่ `tests/integration/` — รันด้วย `RUN_INTEGRATION=1` (CI job `integration` รันเองเมื่อตั้ง secret) · อัปเดต 5 ก.ย. 2569 (FAM-1146)

> ⚠️ เคสในกลุ่ม `tests/integration/` **ยังไม่เคยรันจริงสักครั้ง** เพราะต้องมี secret `TEST_LOGINS`
> และ `SUPABASE_SERVICE_ROLE_KEY` ใน GitHub — ติ๊กด้านล่างหมายถึง "เขียนเทสไว้แล้ว" ไม่ใช่ "พิสูจน์กับ DB แล้ว"
> ยกเว้นข้อที่ระบุว่าเจ้าของเปิดหน้าจอยืนยันเอง

- [x] เซลล์เรียก API → ไม่มี cost/gross_profit — ชั้นแอป: `stripMoneyFields` + `canSeeMoney` (ยูนิตเทส) · RLS ไม่ตัดคอลัมน์ จึงต้องซ่อนที่ server layer เสมอ
- [x] user สาขา A query สาขา B → 0 แถว — `auth-rls.test.ts` (allBranch=false เห็นสาขาเดียว)
- [x] ขายคันเดียวพร้อมกัน 2 req → สำเร็จ 1 / ล้มเหลว 1 — `security.test.ts` "ขายคันเดียวกันพร้อมกัน"
- [x] ช่าง (ไม่มีสิทธิ์ขาย) เรียก sell_unit → ถูกปฏิเสธ — `security.test.ts` "ช่างกดขายรถ"
- [x] customer mode → money-fields หายทุก endpoint — โหมดลูกค้ามีในแอปแล้ว (`CUSTOMER_MODE_COOKIE` · สวิตช์บนแถบบน)
      `canSeeMoney()` เป็นประตูเดียวที่ 12 หน้าใน `app/(app)` ใช้ · `tests/customer-mode.test.ts` (7 เคส FAM-1146)
- [ ] แก้ข้อมูลปิดแล้วโดยไม่มี editBack → ถูกปฏิเสธ — แอปใช้สิทธิ์ตาม role แทน editBack (แก้เวลาย้อนหลัง = hr/manager/admin) · ปิดงวดเงินเดือนแล้วแช่ยอด (FAM-1122)
- [x] ออกเลขเอกสารพร้อมกัน → ไม่ซ้ำ — `security.test.ts` "เลขเอกสารพร้อมกัน"
- [x] ทุกการแก้ไข → มีแถว audit_log ถูกต้อง — `security.test.ts` "audit_log" (ต้องมีบัญชี admin ใน TEST_LOGINS)
- [x] สลิปเงินเดือน: คนไม่มีสิทธิ์ตัวเงินอ่านของคนอื่นไม่ได้ — `security.test.ts` (FAM-1144) · policy `payslip_manage` + `payslip_own`
- [x] `employee.base_salary` / `ssn_no` / `bank_*`: อ่านตรงจากตารางไม่ได้แม้เป็นแอดมิน — `security.test.ts` (FAM-1145)
      **เจ้าของเปิดหน้าพนักงานกับหน้าเงินเดือนยืนยันแล้ว 5 ก.ย. 2569 ว่าตัวเลขยังขึ้นครบ**
- [x] anon ยิงตาราง `public` จริง → ปฏิเสธ; `pub.*` → อ่านได้ — `auth-rls.test.ts` + `security.test.ts` "anon อ่าน pub"
