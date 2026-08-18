# FAM-1037 Theme Foundation + Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** วางรากฐาน theme engine — dark mode + ความหนาแน่น (per-user, localStorage) + ท่อฉีดสีเน้น global จาก `app_setting` (SSR, กันจอกระพริบ) โดย **ค่า default ไม่เปลี่ยนหน้าตาเดิมเลย** และยังไม่มีหน้าตั้งค่า

**Architecture:** 2 เลเยอร์ — (1) GLOBAL สีเน้น: server component `ThemeStyle` อ่าน `app_setting.theme_accent` → derive เฉด → ฉีด `<style html:root{…}>` ตอน SSR; (2) PER-USER: inline no-flash script + client `ThemeControls` เขียน `localStorage` + ตั้ง `data-theme`/`data-density` บน `<html>` → CSS ใน globals.css สลับโทน. ไฟล์ pure (`deriveAccent`, `parseThemeConfig`) แยกทดสอบได้

**Tech Stack:** Next.js 16 App Router (RSC), React 19, Tailwind v4 (`@theme inline`), Supabase (app_setting), Vitest

**Spec:** `.codex/specs/2026-08-17-theme-engine-design.md` (ticket 1 of 3)

---

## File Structure

| ไฟล์ | หน้าที่ | สร้าง/แก้ |
|---|---|---|
| `lib/theme/derive.ts` | สี pure — hex↔hsl, `deriveAccent(hex,mode)`, `isValidHex` | สร้าง |
| `lib/theme/settings.ts` | `parseThemeConfig(rows)` pure + `getThemeConfig()` server reader | สร้าง |
| `tests/theme-derive.test.ts` | tests ของ derive.ts | สร้าง |
| `tests/theme-settings.test.ts` | tests ของ parseThemeConfig | สร้าง |
| `app/globals.css` | เพิ่มบล็อก `[data-theme=dark]` + `[data-density=compact]` | แก้ |
| `components/theme/ThemeStyle.tsx` | server component ฉีด `<style>` สีเน้น (light/dark) | สร้าง |
| `components/theme/theme-init.ts` | ค่าคงที่ no-flash script string | สร้าง |
| `components/theme/ThemeControls.tsx` | client — ปุ่มสลับ dark/density | สร้าง |
| `app/layout.tsx` | เสียบ ThemeStyle + no-flash script | แก้ |
| `components/shell/TopBar.tsx` | เสียบ `<ThemeControls/>` | แก้ |

---

## Task 1: Color derive (pure)

**Files:**
- Create: `lib/theme/derive.ts`
- Test: `tests/theme-derive.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/theme-derive.test.ts
import { describe, it, expect } from "vitest";
import { isValidHex, deriveAccent } from "@/lib/theme/derive";

describe("isValidHex", () => {
  it("accepts #RRGGBB, rejects junk", () => {
    expect(isValidHex("#E60012")).toBe(true);
    expect(isValidHex("#e60012")).toBe(true);
    expect(isValidHex("E60012")).toBe(false);
    expect(isValidHex("#FFF")).toBe(false);
    expect(isValidHex("red")).toBe(false);
    expect(isValidHex("#E60012; }")).toBe(false);
  });
});

describe("deriveAccent (light)", () => {
  const d = deriveAccent("#E60012", "light");
  it("keeps the base accent unchanged", () => {
    expect(d.accent.toLowerCase()).toBe("#e60012");
  });
  it("hover is lighter, deep is darker (than base L)", () => {
    // #E60012 ~ L 45% · hover ควรสว่างขึ้น, deep ควรเข้มลง
    expect(d.hover.toLowerCase()).not.toBe("#e60012");
    expect(d.deep.toLowerCase()).not.toBe("#e60012");
  });
  it("wash is an hsla with low alpha", () => {
    expect(d.wash).toMatch(/^hsla\(/);
    expect(d.wash).toContain("0.06");
  });
});

describe("deriveAccent (dark) + fallback", () => {
  it("dark accent is brighter than light accent", () => {
    const light = deriveAccent("#8B0000", "light"); // dark red
    const dark = deriveAccent("#8B0000", "dark");
    const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    expect(lum(dark.accent)).toBeGreaterThan(lum(light.accent));
  });
  it("invalid hex falls back to Yamaha red", () => {
    expect(deriveAccent("nope", "light").accent.toLowerCase()).toBe("#e60012");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme-derive.test.ts`
Expected: FAIL — cannot find module `@/lib/theme/derive`

- [ ] **Step 3: Write the implementation**

```ts
// lib/theme/derive.ts
/** สีเน้น pure — แปลง hex↔hsl แล้ว derive เฉด (กัน UI เละเมื่อผู้ใช้เลือกสีเอง) */

export type AccentSet = { accent: string; hover: string; deep: string; wash: string };

const DEFAULT_ACCENT = "#E60012";

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sN = clamp(s, 0, 100) / 100;
  const lN = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sN * Math.min(lN, 1 - lN);
  const f = (n: number) => lN - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** สีเน้น 1 สี → ชุดเฉด (light หรือ dark) · hsla wash ให้ alpha ต่ำ */
export function deriveAccent(hex: string, mode: "light" | "dark"): AccentSet {
  const safe = isValidHex(hex) ? hex : DEFAULT_ACCENT;
  const [h, s, l] = hexToHsl(safe);
  const hr = Math.round(h);
  const sr = Math.round(s);
  if (mode === "dark") {
    const base = clamp(l + 8, 0, 92);
    return {
      accent: hslToHex(h, s, base),
      hover: hslToHex(h, s, clamp(base + 8, 0, 96)),
      deep: hslToHex(h, s, clamp(base - 10, 0, 100)),
      wash: `hsla(${hr}, ${sr}%, ${Math.round(base)}%, 0.16)`,
    };
  }
  return {
    accent: safe,
    hover: hslToHex(h, s, clamp(l + 9, 0, 96)),
    deep: hslToHex(h, s, clamp(l - 10, 0, 100)),
    wash: `hsla(${hr}, ${sr}%, ${Math.round(l)}%, 0.06)`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme-derive.test.ts`
Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add lib/theme/derive.ts tests/theme-derive.test.ts
git commit -m "feat(FAM-1037): accent-derive (hex→hsl shades, pure) + tests"
```

---

## Task 2: Theme config reader

**Files:**
- Create: `lib/theme/settings.ts`
- Test: `tests/theme-settings.test.ts`

Theme config เก็บใน `app_setting` แยกจาก AppSettings ปกติ (คนละระบบกับหน้าตั้งค่าทั่วไป — กัน settings-fields coverage test พัง). อ่านเฉพาะคีย์ `theme_accent`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/theme-settings.test.ts
import { describe, it, expect } from "vitest";
import { parseThemeConfig } from "@/lib/theme/settings";

describe("parseThemeConfig", () => {
  it("reads theme_accent when a valid hex", () => {
    expect(parseThemeConfig([{ key: "theme_accent", value: "#1B49D6" }])).toEqual({ accent: "#1B49D6" });
  });
  it("falls back to Yamaha red when missing", () => {
    expect(parseThemeConfig([])).toEqual({ accent: "#E60012" });
  });
  it("ignores an invalid accent value", () => {
    expect(parseThemeConfig([{ key: "theme_accent", value: "red; }" }])).toEqual({ accent: "#E60012" });
    expect(parseThemeConfig([{ key: "theme_accent", value: 123 }])).toEqual({ accent: "#E60012" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme-settings.test.ts`
Expected: FAIL — cannot find module `@/lib/theme/settings`

- [ ] **Step 3: Write the implementation**

```ts
// lib/theme/settings.ts
import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { isValidHex } from "@/lib/theme/derive";

export type ThemeConfig = { accent: string };

const DEFAULT_THEME: ThemeConfig = { accent: "#E60012" };

/** ตรรกะล้วน — คัดค่า theme จากแถว app_setting (ค่าเสีย/ไม่มี → default) */
export function parseThemeConfig(rows: ReadonlyArray<{ key: string; value: unknown }>): ThemeConfig {
  const accentRow = rows.find((r) => r.key === "theme_accent");
  const accent = typeof accentRow?.value === "string" && isValidHex(accentRow.value) ? accentRow.value : DEFAULT_THEME.accent;
  return { accent };
}

/** อ่าน theme global จาก DB — resilient (พลาด → default โทนเดิม ไม่พังทั้งแอป) */
export async function getThemeConfig(): Promise<ThemeConfig> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.from("app_setting").select("key, value").eq("key", "theme_accent");
    if (error || !data) {
      return DEFAULT_THEME;
    }
    return parseThemeConfig(data);
  } catch {
    return DEFAULT_THEME;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme-settings.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/theme/settings.ts tests/theme-settings.test.ts
git commit -m "feat(FAM-1037): theme config reader (parseThemeConfig pure + getThemeConfig)"
```

---

## Task 3: Dark + density CSS tokens

**Files:**
- Modify: `app/globals.css` (เพิ่มก่อนบล็อก `@media (prefers-reduced-motion)`)

Dark = สลับ neutral (สีเน้นถูกฉีดทีหลังโดย ThemeStyle). Density = ปรับ root font-size (Tailwind spacing เป็น rem → หด/ขยายทั้งแอป · ไม่ต้องแก้ทีละ component).

- [ ] **Step 1: เพิ่มบล็อก dark + density**

เพิ่มต่อท้าย (ก่อน `@media (prefers-reduced-motion: reduce)`):

```css
/* ── โหมดมืด (per-user · ตั้งโดย data-theme=dark บน <html>) ────────────────
   สลับ neutral ล้วน · สีเน้นถูก override ทีหลังโดย ThemeStyle (derive โหมด dark) */
:root[data-theme="dark"] {
  --paper: #0e0f12;
  --paper-2: #15171b;
  --card: #191b20;
  --dark: #000000;
  --ink: #edeef1;
  --ink-soft: #b7bbc2;
  --muted: #8a8f98;
  --hairline: rgba(255, 255, 255, 0.1);
  --hairline-2: rgba(255, 255, 255, 0.05);
  --pos: #4cc38a;
  --attn: #d9a441;
  --sh-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --sh-md: 0 8px 24px rgba(0, 0, 0, 0.5);
  --sh-lg: 0 20px 50px rgba(0, 0, 0, 0.6);
}

/* ── ความหนาแน่น (per-user · data-density=compact) — หด rem ทั้งแอป ─────── */
:root[data-density="compact"] {
  font-size: 15px; /* ปกติ 16px → กระชับ ~94% (spacing/ตัวอักษรของ Tailwind เป็น rem) */
}
```

- [ ] **Step 2: ตรวจว่า build ไม่พัง**

Run: `npm run build 2>&1 | tail -3`
Expected: build สำเร็จ (ไม่มี CSS error)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(FAM-1037): dark palette + compact density CSS tokens"
```

---

## Task 4: ThemeStyle — SSR inject accent

**Files:**
- Create: `components/theme/ThemeStyle.tsx`

ใช้ selector `html:root` (specificity 0,0,2) เพื่อทับ `:root` ใน globals.css เสมอ ไม่ขึ้นกับลำดับ. **default (#E60012) → ไม่ฉีด light** (ปล่อยค่าเดิม hand-tuned) → หน้าตาเดิมเป๊ะ · dark accent ฉีดเสมอ (ของใหม่).

- [ ] **Step 1: เขียน component**

```tsx
// components/theme/ThemeStyle.tsx
import { deriveAccent } from "@/lib/theme/derive";
import { getThemeConfig } from "@/lib/theme/settings";

const DEFAULT_ACCENT = "#E60012";

/** ฉีดสีเน้น global ตอน SSR — light เฉพาะเมื่อไม่ใช่ค่า default (กันหน้าตาเดิมเปลี่ยน) · dark เสมอ */
export async function ThemeStyle() {
  const { accent } = await getThemeConfig();
  const isDefault = accent.toLowerCase() === DEFAULT_ACCENT.toLowerCase();
  const light = deriveAccent(accent, "light");
  const dark = deriveAccent(accent, "dark");
  const lightRule = isDefault
    ? ""
    : `html:root{--accent:${light.accent};--accent-hover:${light.hover};--accent-deep:${light.deep};--accent-wash:${light.wash};}`;
  const darkRule = `html:root[data-theme="dark"]{--accent:${dark.accent};--accent-hover:${dark.hover};--accent-deep:${dark.deep};--accent-wash:${dark.wash};}`;
  return <style id="fm-theme" dangerouslySetInnerHTML={{ __html: lightRule + darkRule }} />;
}
```

- [ ] **Step 2: ตรวจ tsc**

Run: `npx tsc --noEmit 2>&1 | head`
Expected: ไม่มี error

- [ ] **Step 3: Commit**

```bash
git add components/theme/ThemeStyle.tsx
git commit -m "feat(FAM-1037): ThemeStyle — SSR inject accent (light non-default + dark)"
```

---

## Task 5: No-flash script + ThemeControls

**Files:**
- Create: `components/theme/theme-init.ts`
- Create: `components/theme/ThemeControls.tsx`

- [ ] **Step 1: no-flash script string**

```ts
// components/theme/theme-init.ts
/** รันก่อน paint (blocking) — อ่าน localStorage แล้วตั้ง data-theme/data-density กันจอกระพริบ */
export const THEME_INIT_SCRIPT =
  "(function(){try{var e=document.documentElement;" +
  "if(localStorage.getItem('fm-theme')==='dark')e.setAttribute('data-theme','dark');" +
  "if(localStorage.getItem('fm-density')==='compact')e.setAttribute('data-density','compact');" +
  "}catch(_){}})();";
```

- [ ] **Step 2: ThemeControls client component**

```tsx
// components/theme/ThemeControls.tsx
"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
type Density = "comfortable" | "compact";

function setRoot(attr: string, on: boolean, value: string) {
  const el = document.documentElement;
  if (on) {
    el.setAttribute(attr, value);
  } else {
    el.removeAttribute(attr);
  }
}

export function ThemeControls() {
  const [theme, setTheme] = useState<Theme>("light");
  const [density, setDensity] = useState<Density>("comfortable");

  useEffect(() => {
    setTheme(localStorage.getItem("fm-theme") === "dark" ? "dark" : "light");
    setDensity(localStorage.getItem("fm-density") === "compact" ? "compact" : "comfortable");
    function onStorage(e: StorageEvent) {
      if (e.key === "fm-theme") {
        const t: Theme = e.newValue === "dark" ? "dark" : "light";
        setTheme(t);
        setRoot("data-theme", t === "dark", "dark");
      }
      if (e.key === "fm-density") {
        const d: Density = e.newValue === "compact" ? "compact" : "comfortable";
        setDensity(d);
        setRoot("data-density", d === "compact", "compact");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("fm-theme", next);
    setRoot("data-theme", next === "dark", "dark");
  }

  function toggleDensity() {
    const next: Density = density === "compact" ? "comfortable" : "compact";
    setDensity(next);
    localStorage.setItem("fm-density", next);
    setRoot("data-density", next === "compact", "compact");
  }

  const btn = "grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-card hover:text-ink";

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={toggleTheme} className={btn} aria-label={theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"} title={theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"}>
        {theme === "dark" ? (
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="10" cy="10" r="3.5" /><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M16 4l-1.4 1.4M5.4 14.6L4 16" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M16 11.5A6.5 6.5 0 1 1 8.5 4a5 5 0 0 0 7.5 7.5z" />
          </svg>
        )}
      </button>
      <button type="button" onClick={toggleDensity} className={btn} aria-label={density === "compact" ? "โหมดสบายตา" : "โหมดกระชับ"} title={density === "compact" ? "โหมดสบายตา" : "โหมดกระชับ"} aria-pressed={density === "compact"}>
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
          {density === "compact" ? <path d="M4 6h12M4 10h12M4 14h12" /> : <path d="M4 5h12M4 10h12M4 15h12" />}
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 3: ตรวจ tsc + eslint**

Run: `npx tsc --noEmit 2>&1 | head; npx eslint components/theme/ 2>&1 | head`
Expected: ไม่มี error

- [ ] **Step 4: Commit**

```bash
git add components/theme/theme-init.ts components/theme/ThemeControls.tsx
git commit -m "feat(FAM-1037): no-flash init script + ThemeControls (dark/density toggles)"
```

---

## Task 6: Wire into layout + TopBar, verify

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/shell/TopBar.tsx`

- [ ] **Step 1: แก้ `app/layout.tsx`**

เพิ่ม import + no-flash script ใน `<head>` + `<ThemeStyle/>` ต้น`<body>`:

```tsx
// app/layout.tsx — เพิ่ม imports (บนสุด กับ import อื่น)
import { ThemeStyle } from "@/components/theme/ThemeStyle";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-init";
```

แก้ `return (...)` เป็น (no-flash script + ThemeStyle เป็น 2 ลูกแรกของ `<body>`):

```tsx
  return (
    <html lang="th" className={`${notoThai.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeStyle />
        {children}
      </body>
    </html>
  );
```

> วาง `<script>` เป็นลูกตัวแรกของ `<body>` (App Router ไม่แนะนำ `<head>` เอง) — รัน synchronous ก่อน DOM ส่วนที่เหลือ paint จึงกันกระพริบได้. `<ThemeStyle/>` async server component — RSC รองรับ.

- [ ] **Step 2: เสียบ ThemeControls ใน TopBar**

`components/shell/TopBar.tsx` — เพิ่ม import + วางก่อนชิปผู้ใช้:

```tsx
// เพิ่มบนสุด
import { ThemeControls } from "@/components/theme/ThemeControls";
```

ในกลุ่มปุ่มขวา (`<div className="flex items-center gap-1.5">`) วาง `<ThemeControls />` เป็นตัวแรก (ก่อนปุ่มโหมดลูกค้า):

```tsx
      <div className="flex items-center gap-1.5">
        <ThemeControls />
        {canToggleMoney && (
          {/* ...ปุ่มโหมดลูกค้าเดิม... */}
        )}
        {/* ...ชิปผู้ใช้ + logout เดิม... */}
      </div>
```

- [ ] **Step 3: build + tsc + eslint + tests ทั้งหมด**

Run: `npx tsc --noEmit && npx eslint app/layout.tsx components/shell/TopBar.tsx components/theme/ lib/theme/ && npx vitest run && npm run build 2>&1 | tail -3`
Expected: ทุกอย่างผ่าน

- [ ] **Step 4: Browser verify (dev server :3000)**

รัน dev: `PORT=3000 npm run dev` (background) แล้วเปิด Claude Browser ที่ `http://localhost:3000/dev/quote` (หน้าไหนก็ได้ที่มี AppShell/TopBar) หรือหน้า login:
- ตรวจ **default light** เหมือนเดิมเป๊ะ (สีแดง/พื้น/หมึกไม่เปลี่ยน) — `getComputedStyle(document.documentElement).getPropertyValue('--accent')` ยัง `#E60012` (หรือค่าเดิม)
- กดปุ่ม **โหมดมืด** บน TopBar → พื้นเปลี่ยนเป็น `#0e0f12`, หมึกเป็นแสง, แดงสว่างขึ้น · `document.documentElement.getAttribute('data-theme')==='dark'`
- **reload หน้า** ขณะ dark → **ไม่กระพริบ** (ยังมืดตั้งแต่เฟรมแรก) · `localStorage.getItem('fm-theme')==='dark'`
- กดปุ่ม **กระชับ** → `data-density='compact'`, root font-size = 15px, ระยะห่างหดลงเล็กน้อย · reload ไม่กระพริบ
- mobile 375px ไม่พัง · console สะอาด

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx components/shell/TopBar.tsx
git commit -m "feat(FAM-1037): wire ThemeStyle + no-flash + ThemeControls into layout/TopBar"
```

---

## Task 7: Ticket doc + push

- [ ] **Step 1: เขียน ticket** `.codex/tasks/tickets/FAM-1037.md` (สรุปตาม spec §8 ข้อ 1 + ผลลัพธ์ verify)

- [ ] **Step 2: push branch + เปิด PR**

```bash
git push -u origin feat/theme-engine
```

จบ ticket 1 — foundation พร้อม. ต่อ FAM-1038 (หน้าตั้งค่าธีม) เป็น plan ถัดไป.

---

## Notes / gotchas

- **`html:root` specificity** — ทับ `:root` เดิมได้เสมอ. ถ้า verify แล้วสีเน้นไม่เปลี่ยนตอนตั้ง custom accent ให้เช็คว่า `<style id="fm-theme">` อยู่ใน DOM จริง
- **No-flash** — ต้องทดสอบ 2 อย่าง: reload ขณะ dark (per-user script) + custom accent (SSR). ทั้งคู่ต้องไม่กระพริบ
- **default ไม่เปลี่ยน** — ThemeStyle ข้าม light rule เมื่อ accent = #E60012 → ค่า hand-tuned เดิมใน globals.css ยืน
- **density = font-size** — เพราะ component ใช้ Tailwind utility (rem) ไม่ใช่ `--s*` tokens · ปรับ root font-size คือ lever ที่ได้ผลจริง
