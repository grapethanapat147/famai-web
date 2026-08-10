## FAM-E01: App Foundation & DevOps

Status: Backlog
Priority: High
Type: Epic
Phase: 1
Refs: docs/02-architecture.md · docs/06-supabase-setup.md · docs/05-roadmap.md

### Summary
โครง Next.js (App Router, TS) ต่อ Supabase จริง, แยก env (demo Free / prod Pro), CI, deploy Vercel, และงาน ops ที่บังคับ "ตั้งแต่วันแรก": backup + tested restore + staging test-data banner + spending cap

### Child tickets
FAM-1001 (scaffold) · FAM-1017 (backups + restore + banner) · FAM-1018 (pilot hardening + QA)

### Done when
app รันบน Vercel ต่อ Supabase, secrets แยก server, `node tools/qa/run.js` ผ่าน, backup+restore ทดสอบสำเร็จ
