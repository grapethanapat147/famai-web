# Kanban Ticket Flow (Famai)

งาน dev ทุกชิ้นต้องมี ticket ก่อน implement — Epic (งานใหญ่) + Task (งานเล็ก)

## Source of truth
- ดูตาราง docs ใน `CLAUDE.md` — `docs/01-08`, `.codex/specs/revision-1-client-feedback.md` (สเปกต้นฉบับไม่อยู่ในรีโป — ดูหมายเหตุใน CLAUDE.md)
- ถ้า ticket ขัดกับ docs/handoff ให้เพิ่ม `### Open Questions` แล้วถามผู้ใช้ ห้ามเดา

## Board files (index เท่านั้น เก็บเฉพาะ link)
- Backlog `backlog.md` · Todo `todo.md` · Plan `plan.md` · In Progress `in-progress.md` · Review `review.md` · Done `done.md` · Closed `closed.md`
- Ticket อยู่ที่ `.codex/tasks/tickets/FAM-XXXX.md` (task) / `FAM-E0X.md` (epic)

## Entry format
```md
- [FAM-XXXX: Title](tickets/FAM-XXXX.md)
```

## Ticket format
```md
## FAM-XXXX: Title

Status: Backlog
Priority: High
Epic: FAM-E0X
Refs: docs/03-data-model.md · index.html:<line>

### Summary
### Acceptance Criteria
### Validation
```
กติกา: 1 ticket/1 ไฟล์ · ชื่อไฟล์ = id · `Status:` ตรงกับ board ที่ลิงก์ · ห้าม duplicate link · ย้ายสถานะ = ย้าย link + แก้ `Status:` (ห้าม rename ไฟล์)

## Numbering
- Epics `FAM-E01`…  · Tasks `FAM-1001`…

## Flow (ย่อ)
1. **Create** — เขียน ticket (`Backlog`) + AC + validation → เพิ่ม link ใน `backlog.md`
2. **Plan** (งานเสี่ยง/หลาย layer/security/RPC/migration) — เพิ่ม `### Implementation Plan`, ย้าย `plan.md`, `Status: Plan`
3. **Start** — ย้าย `in-progress.md`, `Status: In Progress`, implement ตาม AC. ห้ามเลื่อนไป Review เอง
4. **Review** (เมื่อสั่ง) — `### Review Notes`, ย้าย `review.md`, `Status: Review`
5. **Review Gate** — AC + test/build/lint + **security review** (auth/RLS/money/doc-no/audit เสมอ). Verdict PASS/NEEDS FIX/BLOCKED
6. **Done** — `### Done Notes`, ย้าย `done.md`, `Status: done`
7. **Close** — เฉพาะยกเลิก ย้าย `closed.md` + เหตุผล

## Gates เฉพาะโปรเจกต์
- **Security gate** — ticket ที่แตะ auth/RLS/permission/money/doc-numbering/audit ต้องมี test ยืนยัน "ค่าที่ไม่มีสิทธิ์ไม่หลุด" + ยิง endpoint จริงด้วย role จริง (handoff §9j) ก่อน Done
- **Settings gate** — ห้าม hardcode เกณฑ์ อ่านจาก `app_setting`
- **UI gate** — ticket ที่มี visible UI ต้องมี `### Design Reference` (ชี้ `index.html` จอที่เกี่ยว + §04 tokens) ก่อน implement
- **QA gate** — งานที่กระทบพฤติกรรมเดิม ไม่ทำ `node tools/qa/run.js` พังโดยไม่ตั้งใจ
- **Test gate** — ทุก code change มี test ที่เกี่ยวข้อง รันผ่านก่อนปิด
