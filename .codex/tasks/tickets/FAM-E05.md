## FAM-E05: Stock (receive / stock / models / import)

Status: Backlog
Priority: High
Type: Epic
Phase: 1
Refs: Spec §9.2-9.5, §9.15 · docs/00-yamaha-export-analysis.md · docs/03-data-model.md

### Summary
วงจร "สร้างข้อมูล" ของรถ: รับรถเข้าสต๊อก (dup engine/frame, แนบไฟล์, preview), หน้าสต๊อก (แกลเลอรี default + ตาราง + ตัวกรอง + ค้นเลขเครื่องบางส่วน + drawer รายคัน), จัดการรุ่น + price_history, และนำเข้าไฟล์ยามาฮ่า `.xls` (cp874/serial date/leading zero/กันซ้ำ + import_log)

### Child tickets
FAM-1007 (recv) · FAM-1008 (stock) · FAM-1009 (models) · FAM-1010 (.xls import)

### Done when
รับรถ→เห็นในสต๊อกทันที, กรอง/ค้นครบ, นำเข้าไฟล์จริง 50 คันถูกต้อง, money-guard ตามสิทธิ์
