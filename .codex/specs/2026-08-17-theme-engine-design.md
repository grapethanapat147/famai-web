# Theme Engine — Design Spec

**วันที่:** 2026-08-17
**สถานะ:** อนุมัติดีไซน์แล้ว (brainstorm กับเกรพ) → รอเขียน implementation plan
**Track:** UI/ธีม (ก้อนแรกจาก 4: theme engine · ตามด้วย UI polish + customer-screenshot ทีหลัง)

## 1. เป้าหมาย

ให้ Famai ปรับ "รูปลักษณ์" ได้ (สี/ฟอนต์/โหมดมืด/ความหนาแน่น) โดย **ยังรักษาปรัชญา design system เดิม** (docs/04 — "ตัดตัวเลือกทิ้ง → กลมกลืน → ดูแพง") ไม่ให้ UI เละเมื่อผู้ใช้ปรับเอง

## 2. การตัดสินใจหลัก (จาก brainstorm)

| เรื่อง | เลือก | เหตุผล |
|---|---|---|
| ระดับการปรับ | **Curated + guided** | มี preset สำเร็จ + ปรับเองผ่านตัวช่วยที่คุมโทน (ไม่ปล่อยอิสระเต็มที่) |
| สี/ฟอนต์ = ของใคร | **Global** (แบรนด์ร้าน) | แอดมินตั้ง 1 ชุด ทุกคนเห็นเหมือนกัน · เก็บใน `app_setting` |
| dark mode + density | **Per-user** | ความสบายตาส่วนตัว (ตา/จอต่างกัน) · เก็บใน `localStorage` ไม่แตะ DB |

**Non-goals (เลื่อนออก):** per-branch theme, per-user สี/ฟอนต์, theming เว็บขายสาธารณะ (pub schema), preset เกินชุดที่กำหนด, ปรับ animation/มุมโค้ง

## 3. สถาปัตยกรรม — 2 เลเยอร์

### 3a. GLOBAL layer (แบรนด์: สี + ฟอนต์)
- **เก็บ:** `app_setting` (jsonb) keys ใหม่:
  - `theme_accent` — hex สีเน้น เช่น `"#E60012"`
  - `theme_font_pair` — id ของคู่ฟอนต์ curated เช่น `"noto-inter"`
  - `theme_custom_font` — path ฟอนต์ที่อัปเอง ใน Storage (nullable)
  - (ค่า default = โทนปัจจุบัน → ก่อนแอดมินแตะ ทุกอย่างเหมือนเดิมเป๊ะ)
- **apply:** root layout (`app/(app)/layout.tsx` หรือ root) เป็น server component → อ่าน settings → คำนวณเฉด (accent-derive) → ฉีด `<style id="fm-theme">:root{ --accent:…; --accent-hover:…; --accent-deep:…; --accent-wash:…; --f-display:…; --f-body:… }</style>` ตอน SSR
- **ไม่มีจอกระพริบ** เพราะฉีดมากับ HTML ตั้งแต่ server · แอดมินเปลี่ยน → revalidate → ทุกคนเห็นทันที

### 3b. PER-USER layer (สบายตา: dark + density)
- **เก็บ:** `localStorage` — `fm-theme` (`light`|`dark`), `fm-density` (`comfortable`|`compact`)
- **apply:** inline `<script>` ใน `<head>` (blocking, ก่อน paint) อ่าน localStorage → set `document.documentElement.dataset.theme` / `.dataset.density` → กันกระพริบ
- **UI สลับ:** ปุ่มบน TopBar (ทุกคนกดได้) — client component `ThemeControls` เขียน localStorage + อัปเดต `data-*` + sync ข้ามแท็บ (storage event)

## 4. Token system (globals.css)

โครงเดิมใช้ CSS variables + Tailwind v4 `@theme inline` อยู่แล้ว — ต่อยอด:
- **Accent + fonts:** override ด้วย `<style>` global (3a) — ทับ `:root` เดิม
- **Dark:** เพิ่มบล็อก `:root[data-theme="dark"] { --paper:#0E0F12; --paper-2:#15171B; --card:#191B20; --ink:#EDEEF1; --ink-soft:#B7BBC2; --muted:#8A8F98; --hairline:rgba(255,255,255,.10); --hairline-2:rgba(255,255,255,.05); --sh-*:… }` — สลับ neutral ล้วน, สีเน้นถูก "brighten" (accent-derive โหมด dark) ให้ contrast พอ · **ใช้ได้ทุก preset** (dark เป็นโหมด ไม่ผูกกับ preset)
- **Density:** เพิ่มบล็อก `:root[data-density="compact"]` ที่ลดสเกลระยะ (เช่น `--s2:12px` แทน 16, ลด padding การ์ด/แถว) — คุมผ่าน token ไม่แก้ทีละ component

## 5. Accent-derive (ฟังก์ชันบริสุทธิ์ ทดสอบได้ — หัวใจกันเละ)

`deriveAccent(hex, mode: 'light'|'dark') → { accent, hover, deep, wash }`
- แปลง hex → HSL
- **light:** hover = L +8~10% · deep = L −10% · wash = สี H/S เดิม alpha .06~.08
- **dark:** accent เอง brighten (L +6~8% / คุม min contrast บนพื้นมืด) · hover/deep/wash ปรับตาม
- **สถานะ (pos เขียว / attn เหลือง):** คงเป็นสีปลอดภัยของระบบ (มี variant light/dark) — ไม่ derive จาก accent (กันคู่สีชนกัน)
- อยู่ที่ `lib/theme/derive.ts` + unit tests (input แดง/น้ำเงิน/เขียว/มืด → เช็คช่วง L)

## 6. ฟอนต์

- **Curated pairs:** โหลดล่วงหน้าด้วย `next/font` (แต่ละคู่ได้ CSS var ของตัวเอง เช่น `--f-noto`, `--f-trirong`) → `theme_font_pair` เลือกว่า `--f-display`/`--f-body` ชี้ไป var ไหน
  - ชุดเริ่ม: `noto-inter` (ปัจจุบัน), + 2 คู่ เช่น `trirong-anuphan`, `ibmplex-th-sans`
- **อัปโหลดเอง:** ไฟล์ `.woff2`/`.ttf` → Storage bucket ใหม่ `brand-font` (public read, write = is_admin) → ฉีด `@font-face { font-family:'fm-custom'; src:url(<public>) }` ใน global `<style>` → ผูก `--f-display/--f-body` = `fm-custom` (ยังใช้สเกล/น้ำหนักเดิม กันเพี้ยน)
- migration ใหม่: สร้าง bucket + policies (มิเรอร์ model-photo migration 13)

## 7. UI ที่เพิ่ม

- **แท็บ "รูปลักษณ์"** ใน หน้าตั้งค่าระบบ (`/settings`, admin เท่านั้น) — 4 กลุ่ม: preset (6 ชุด) · สีเน้น (color input → พรีวิวเฉด derive) · ฟอนต์ (select + อัปโหลด) · การ์ดพรีวิวสด
  - action `updateThemeSettings` — gate `perms.admin` (ตรงกับ RLS: app_setting admin-write) + validate hex/font id → upsert app_setting
- **ปุ่ม dark/density บน TopBar** — client `ThemeControls` (ทุก role เห็น)

## 8. แบ่งเป็น 3 Ticket (PR แยก · ตามลำดับ)

> implementation plan ทำ **ทีละ ticket** เริ่มจาก #1 (foundation เป็น dependency ของ #2/#3) — แต่ละ ticket = spec-นี้เป็น source, plan+build+PR แยก

1. **FAM-1037 · Theme Foundation + Engine**
   - `lib/theme/derive.ts` (deriveAccent, pure) + tests
   - globals.css: dark palette (`[data-theme=dark]`) + density (`[data-density=compact]`) tokens
   - root layout: SSR ฉีด global `<style>` จาก app_setting (default = โทนเดิม) + inline no-flash script
   - `ThemeControls` บน TopBar (localStorage + data-attr + storage-sync)
   - **ยังไม่มีหน้าตั้งค่า** — verify: dark/density สลับได้ ทุกหน้า, ไม่กระพริบ, default ไม่เปลี่ยนหน้าตาเดิม
2. **FAM-1038 · หน้าตั้งค่าธีม (แอดมิน)**
   - lib: `THEME_PRESETS` (6) + validate (pure + tests) · `updateThemeSettings` action (admin gate)
   - แท็บ "รูปลักษณ์": preset + สีเน้น guided + พรีวิวสด → บันทึก app_setting → revalidate
   - verify: เปลี่ยน preset/สีเน้น → ทั้งแอปเปลี่ยน (จริงตอน login)
3. **FAM-1039 · ระบบฟอนต์ + อัปโหลด**
   - migration: bucket `brand-font` + policies
   - curated pairs (next/font) + สลับผ่าน theme_font_pair
   - อัปโหลดฟอนต์ (client → Storage) + @font-face injection
   - verify: สลับคู่ฟอนต์ + อัปฟอนต์เอง → เห็นผล

## 9. ความปลอดภัย

- แก้ธีม global = `perms.admin` (สอดคล้อง RLS `app_setting` admin-write อยู่แล้ว)
- อัปโหลดฟอนต์ = bucket policy `is_admin` (ธีมเป็นงานแอดมิน)
- validate hex/font id ฝั่ง server (กัน CSS injection ผ่านค่า accent — ต้อง match `^#[0-9a-fA-F]{6}$`)

## 10. การทดสอบ

- **Pure/unit:** `deriveAccent` (ช่วง L, alpha), `parse/validate theme settings` (hex/font id/preset), density/dark token presence
- **Browser (per ticket):** สลับ dark/density ทุกหน้า ไม่กระพริบ · เปลี่ยน preset/สีเน้น → ทั้งแอปเปลี่ยน · mobile ไม่พัง · console สะอาด
- เขียนจริง (บันทึก app_setting/อัปฟอนต์) verify ตอน login (เกรพ)

## 11. ความเสี่ยง / จุดระวัง

- **Flash of default theme:** แก้ด้วย SSR injection (global) + blocking inline script (per-user) — ต้องทดสอบทั้ง SSR + client
- **Custom accent อัปลี้ค่าแปลก:** validate + derive คุมช่วง L ไม่ให้ contrast ต่ำ (อาจเตือนถ้าสีอ่อนเกิน)
- **next/font หลายคู่:** เพิ่ม bundle เล็กน้อย — จำกัด curated ~3 คู่
- **Tailwind v4:** token อยู่ใน `@theme inline` แล้ว — ตรวจว่า override ผ่าน `<style>` ทับได้จริง (specificity)
