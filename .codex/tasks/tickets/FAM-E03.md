## FAM-E03: Auth, RBAC & Menu

Status: Backlog
Priority: High
Type: Epic
Phase: 1
Refs: docs/02-architecture.md §5 · Spec §8 · .codex/context/security-checklist.md

### Summary
Supabase Auth (bcrypt, ห้ามเขียนเอง), session + JWT claims (branch/role/perms), เมนูกรองตามสิทธิ์, ซ่อน money-fields ฝั่งเซิร์ฟเวอร์, customer mode, unknown role → fail closed

### Child tickets
FAM-1005 (login/session) · FAM-1006 (menu-by-permission + money-strip + customer mode)

### Done when
ผ่าน security test: money ไม่หลุด, เมนูตามสิทธิ์, customer mode ซ่อนทุกหน้า, ไม่มีบัญชีใช้ร่วม
