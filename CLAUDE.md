# Famai — Next.js App (Claude Code Instructions)

เป้าหมายสาย work นี้: **สร้าง Next.js + Supabase + Vercel AI SDK app** โดยพอร์ตดีไซน์/พฤติกรรม
จากต้นแบบ `index.html` (v1.15, 24 จอ) และ **ใช้ schema/RLS ที่มีอยู่แล้ว** ไม่รื้อฐานข้อมูล

## Source of truth (อ่านก่อนทำงานที่เกี่ยวข้อง — ห้ามเดา/ทำซ้ำ)

| ต้องการรู้ | อ่านที่ |
|---|---|
| ขาดอะไร/ทำอะไรก่อน | `docs/01-gap-analysis.md` |
| สถานะจริง + กับดัก + งานค้าง | `docs/08-state-and-handoff.md` |
| สถาปัตยกรรม/ค่าใช้จ่าย/cron/LINE/e-Tax | `docs/02-architecture.md` |
| แผน Phase 0–4 | `docs/05-roadmap.md` |
| ตาราง/ERD (48 ตาราง) | `docs/03-data-model.md` |
| design tokens + กฎ UI (§9 rules) | `docs/04-design-system.md` |
| ต่อ Supabase จริง | `docs/06-supabase-setup.md` |
| public catalog/status API | `docs/07-public-api.md` |
| ดีไซน์ต้นแบบ (อ้างอิงเท่านั้น — แอปจริงคือโค้ดในรีโปนี้) | `index.html` (v1.15) + `prototype/` |
| ข้อมูลตัวอย่างทุกหน้า | `supabase/seed/demo.sql` (+ `demo-cleanup.sql` ลบก่อนเปิดจริง) |
| requirements ระดับลูกค้า | `.codex/specs/revision-1-client-feedback.md` (บรีฟแก้ไขครั้งที่ 1 — ฉบับล่าสุดที่อยู่ในรีโป) |
| แผนงานตามหัวข้อ | `.codex/specs/` (theme engine, E12 AI plan ฯลฯ) |

> **หมายเหตุ:** สเปกต้นฉบับ `Famai_System_Build_Spec.md` **ไม่ได้อยู่ในรีโป** (อยู่ฝั่งเจ้าของงาน)
> ถ้าต้องอ้างอิง ขอไฟล์จากเจ้าของแล้ววางที่ `.codex/specs/` — อย่าอ้างถึงเหมือนมีอยู่แล้ว (FAM-1125 · fixlist ข้อ 27)

## Stack

Next.js (App Router) + TypeScript · Supabase (Postgres + RLS + Auth + Storage) · Tailwind + design tokens (§04) · Vercel AI SDK (ติดตั้งไว้ ยังไม่เปิดใช้ — FAM-E12) · Deploy Vercel + Supabase Cloud

## Ticket-First (บังคับ)

งาน dev ทุกชิ้นต้องมี ticket ก่อน implement — Epic (`FAM-E0X`) + Task (`FAM-XXXX`)
ดู `.codex/context/kanban-flow.md` · board อยู่ที่ `.codex/tasks/`

## Non-negotiable (จาก handoff §6 + design-system §9 + architecture §5)

1. **ด่านอยู่ในฟังก์ชันที่เขียนข้อมูล ไม่ใช่ที่ปุ่ม** — ซ่อนปุ่ม/CSS ไม่นับว่ากัน (§9b)
2. **money-fields ซ่อนฝั่งเซิร์ฟเวอร์** — ไม่ส่งต้นทุน/กำไร/มูลค่าสต๊อก/ยอดจัด ออก API ถ้าไม่มีสิทธิ์ `money`; customer mode = ซ่อนเหมือนกัน
3. **branch isolation = RLS** ที่ DB (มี `my_branches()`/`is_all_branch()` แล้ว) ไม่ใช่ filter ในแอป
4. **money/atomic ops ผ่าน RPC** — `next_doc_no()`, sell (ตัดสต๊อก+กันขายซ้ำ), `punch_clock()` (เวลาจากเซิร์ฟเวอร์)
5. **ไม่ hardcode เกณฑ์** — อ่านจาก `app_setting` (ค่าเป็น `jsonb` → ใช้ `to_jsonb()`)
6. **เลขเอกสารกันซ้ำด้วย `next_doc_no()`** แยกสาขา/ประเภท/ปี — ยกเลิกต้องเก็บเหตุผล ไม่ลบ
7. **service_role key ฝั่ง server เท่านั้น** — client ใช้ publishable key + RLS
8. **apply migration ผ่าน ≠ ใช้ได้** — ยิงจริงทุก endpoint ด้วยสิทธิ์ role ที่จะใช้จริง (§9j)
9. **PDPA** — เก็บเท่าที่จำเป็น, เลขบัตร ปชช. จำกัดสิทธิ์เห็น, มี consent/สิทธิ์ลบ-แก้ + log การเปิดดูข้อมูลลูกค้า

## Conventions

- เช็ค `components/` + `docs/04-design-system.md` ก่อนสร้างของใหม่ (มี component ให้ใช้ซ้ำแล้วเกือบทุกแบบ) ยึด design token §04 · Node parse ISO เป็น UTC ส่วนแอปใช้ Asia/Bangkok — คำนวณเวลาฝั่งที่ถูก timezone
- ทุก code change มี test; security-critical (RLS/money/double-sell/doc-no) ต้องมี test ก่อน Done
- ก่อน push ต้องผ่านครบ: `npm run test` (vitest ทั้งชุด ไม่ใช่แค่ไฟล์ที่แตะ) · `typecheck` · `lint` · `build` — เท่ากับที่ CI รัน · `tools/qa/` เป็นด่านตรวจของต้นแบบเดิม ไม่เกี่ยวกับแอปนี้
- ตอบสั้น กระชับ · ห้ามสร้างไฟล์ docs ใหม่นอกจากผู้ใช้ขอ
- git: origin = `grapethanapat147/famai-web` (ของเจ้าของ) · งานทุกชิ้นอยู่บนสาขา `feature/FAM-XXXX` แล้ว push + ให้ลิงก์ compare — เจ้าของ merge เองในเบราว์เซอร์ (เครื่องนี้ไม่มี `gh`)
- migration: เขียนไฟล์ใน `supabase/migrations/` แล้ว **วางเนื้อ SQL ทั้งก้อนในแชต** ให้เจ้าของรันใน Supabase SQL Editor เอง (ห้ามส่งแค่ path) · เขียน `database.types.ts` ด้วยมือให้ตรงกับคอลัมน์ที่ใช้ (ตารางที่ไม่ประกาศจะ resolve เป็น `never`)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
