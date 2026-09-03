# Security Checklist — Famai (เน้นเป็นพิเศษ)

อ้างอิง `docs/02-architecture.md` §5, `docs/08-state-and-handoff.md` §6-7, design-system §9
อ่านก่อนแตะ auth / permission / data read-write / เอกสาร / storage

## Threats ที่ต้องกันจริง (พร้อมวิธี)

| ภัย | การป้องกัน (มีของอยู่แล้วใน 15 migrations) |
|---|---|
| เซลล์เห็นต้นทุน/กำไร | ไม่ select/return money-fields ถ้าไม่มีสิทธิ์ `money`; strip ที่ server layer + view column list |
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
- `app_setting.value` เป็น `jsonb` → `to_jsonb('watch'::text)`; ฟังก์ชันที่ insert ต้อง `volatile`
- `pgcrypto` อยู่ schema `extensions` → `extensions.gen_random_bytes`

## PDPA (architecture §5)
เก็บเท่าที่จำเป็น · เลขบัตร ปชช. เฉพาะที่จำเป็นต่อใบกำกับภาษี + จำกัดสิทธิ์เห็น · consent + สิทธิ์ดู/แก้/ลบ · log การเปิดดูข้อมูลลูกค้า · กำหนดอายุการเก็บ

## ต้องทำบน Supabase console (owner เท่านั้น — AI/นักพัฒนาทำแทนไม่ได้) — handoff §3
- [ ] รีเซ็ตรหัสผ่าน DB (รหัสเดิมหลุดผ่านแชต)
- [ ] เปิด Leaked Password Protection
- [ ] อัป Supabase Pro ก่อนออกใบกำกับภาษีใบแรก (Free ไม่มี backup) + ตั้ง spending cap
- [ ] เปิด 2FA อย่างน้อย Admin/ผู้บริหาร
- [ ] ดาวน์โหลด `pg_dump` เก็บนอกระบบเดือนละครั้ง + **ทดสอบกู้คืนจริง** ปีละครั้ง

## Security test checklist (ต้องมี test จริง ก่อน Done)
เทสกับฐานข้อมูลจริงอยู่ที่ `tests/integration/` — รันด้วย `RUN_INTEGRATION=1` (CI job `integration` รันเองเมื่อตั้ง secret) · อัปเดต 3 ก.ย. 2569 (FAM-1133)

- [x] เซลล์เรียก API → ไม่มี cost/gross_profit — ชั้นแอป: `stripMoneyFields` + `canSeeMoney` (ยูนิตเทส) · RLS ไม่ตัดคอลัมน์ จึงต้องซ่อนที่ server layer เสมอ
- [x] user สาขา A query สาขา B → 0 แถว — `auth-rls.test.ts` (allBranch=false เห็นสาขาเดียว)
- [x] ขายคันเดียวพร้อมกัน 2 req → สำเร็จ 1 / ล้มเหลว 1 — `security.test.ts` "ขายคันเดียวกันพร้อมกัน"
- [x] ช่าง (ไม่มีสิทธิ์ขาย) เรียก sell_unit → ถูกปฏิเสธ — `security.test.ts` "ช่างกดขายรถ"
- [ ] customer mode → money-fields หายทุก endpoint — ยังไม่มีโหมดนี้ในแอป Next (มีใน prototype เดิม) · เมื่อทำต้องเทส
- [ ] แก้ข้อมูลปิดแล้วโดยไม่มี editBack → ถูกปฏิเสธ — แอปใช้สิทธิ์ตาม role แทน editBack (แก้เวลาย้อนหลัง = hr/manager/admin) · ปิดงวดเงินเดือนแล้วแช่ยอด (FAM-1122)
- [x] ออกเลขเอกสารพร้อมกัน → ไม่ซ้ำ — `security.test.ts` "เลขเอกสารพร้อมกัน"
- [x] ทุกการแก้ไข → มีแถว audit_log ถูกต้อง — `security.test.ts` "audit_log" (ต้องมีบัญชี admin ใน TEST_LOGINS)
- [x] anon ยิงตาราง `public` จริง → ปฏิเสธ; `pub.*` → อ่านได้ — `auth-rls.test.ts` + `security.test.ts` "anon อ่าน pub"
