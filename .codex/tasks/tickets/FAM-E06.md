## FAM-E06: Sell, Profit & Documents

Status: Backlog
Priority: High
Type: Epic
Phase: 1
Refs: Spec §6.2-6.4, §9.4, §10 · docs/02-architecture.md §4.1, §9

### Summary
ขายรถ: เลือกคันจากสต๊อกจริง, ราคา/ส่วนลด/ของแถม, กำไรสด, กันขายซ้ำ (RPC transaction), เตือนรถค้าง, ขายต่ำกว่าทุนต้องยืนยันซ้ำ · ยืนยันรับเงิน (บัญชี) · เอกสาร: ใบเสร็จ/ใบกำกับภาษี §86/4, เลขที่ผ่าน `next_doc_no` แยกสาขา, พิมพ์ซ้ำมีป้าย, ยกเลิกเก็บเหตุผล (e-Tax = ออกใบลดหนี้)

### Child tickets
FAM-1011 (sell + profit + double-sell) · FAM-1012 (documents + numbering) · FAM-1013 (payment confirm)

### Done when
ปิดการขาย <10 นาที, ขายซ้ำไม่ได้แม้เปิดพร้อมกัน, เซลล์ไม่เห็นกำไร, ใบกำกับภาษีครบ §86/4 เลขไม่ซ้ำ
