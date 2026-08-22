# Backlog

> sync แล้ว FAM-1070 (2026-08-22) — สถานะจริงหลัง build ครบทุก epic

## Epics — build ครบทั้งหมด ✅ (E01–E12)
- [FAM-E01: App Foundation & DevOps](tickets/FAM-E01.md) — done
- [FAM-E02: Design System → Components](tickets/FAM-E02.md) — done
- [FAM-E03: Auth, RBAC & Menu](tickets/FAM-E03.md) — done
- [FAM-E04: Data Layer & Security Wiring](tickets/FAM-E04.md) — done
- [FAM-E05: Stock (receive/stock/models/import)](tickets/FAM-E05.md) — done
- [FAM-E06: Sell, Profit & Documents](tickets/FAM-E06.md) — done
- [FAM-E07: Dashboards, Reports & Settings](tickets/FAM-E07.md) — done
- [FAM-E08: Customer & Deal (Phase 2)](tickets/FAM-E08.md) — done
- [FAM-E09: Parts, Service, HR & Payroll (Phase 2/3)](tickets/FAM-E09.md) — done
- [FAM-E10: Automation — Cron & LINE (Phase 3)](tickets/FAM-E10.md) — done
- [FAM-E11: Public Catalog & Status (pub schema)](tickets/FAM-E11.md) — done (noindex ตั้งใจ pre-launch)
- [FAM-E12: AI SDK Integration](tickets/FAM-E12.md) — build ครบ แต่ **ถอดออกจาก UI แล้ว (FAM-1069, นอก TOR)** · โค้ด dormant (gate ด้วย `AI_ENABLED=false`) เปิดกลับได้ถ้า TOR เพิ่ม

## เหลือทำจริง (actionable)
- [FAM-1022: Company entity + branch hierarchy (R1 structural)](tickets/FAM-1022.md)
  🔴 **BLOCKED — รอลูกค้าตอบ** ก่อนเริ่ม (กระทบ schema/RLS/เลขเอกสาร): กี่บริษัท? · `FMG01`/`FMM01`/`FCG01` = คนละบริษัท หรือบริษัทเดียว 3 สาขา? · แต่ละบริษัทมีสาขาย่อยอะไร? — รายละเอียดใน [UNBLOCK.md](../UNBLOCK.md) §3

## Pre-launch (ก่อน go-live)
- ✅ QA sweep (FAM-1070): 22 `/dev` routes ตอบ 200, server log สะอาด, mobile 375px ไม่มี h-scroll (ตรวจ stock/report/payroll/models/parts/settings), console มีแค่ HMR-noise ของ dev — **ผ่าน**
- ⏳ ตั้งรหัสผ่าน user ทดสอบ + ทดสอบ login/flow จริง (RLS + money-strip) — [UNBLOCK.md](../UNBLOCK.md) §2
- ⏳ เอา `noindex` ออกตอนพร้อมเปิดจริง (E11)
- ⏳ ไฟล์จากลูกค้า (R1): PDF เอกสาร + รูปตัวอย่าง 3 จุด — [UNBLOCK.md](../UNBLOCK.md) §4
