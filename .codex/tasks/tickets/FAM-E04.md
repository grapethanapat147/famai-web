## FAM-E04: Data Layer & Security Wiring

Status: Backlog
Priority: High
Type: Epic
Phase: 1
Refs: docs/03-data-model.md · docs/08-state-and-handoff.md · supabase/migrations/

### Summary
ชั้นเข้าถึงข้อมูล type-safe บน schema ที่มีอยู่ (48 ตาราง): browser client (publishable+RLS) / server client (service_role), helper เคารพ RLS, wrapper สำหรับ RPC ที่มีแล้ว (`next_doc_no`, sell, `punch_clock`, `is_all_branch`/`my_branches`), และ `app_setting` loader (jsonb, ไม่ hardcode เกณฑ์)

### Child tickets
FAM-1004 (data layer + RPC wrappers + settings loader) — และเป็นฐานให้ทุก screen ticket

### Done when
query ทั้งหมดผ่าน RLS, service_role ไม่หลุด client, settings อ่านจาก DB, RPC เรียกได้ครบ
