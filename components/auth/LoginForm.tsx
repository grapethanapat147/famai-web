"use client";

import { useActionState, useEffect, useState } from "react";
import { login, type LoginState } from "@/lib/auth/actions";

const STORE_KEY = "famai_login";
const inputCls =
  "rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";

/** ฟอร์มเข้าสู่ระบบ — จำ/โชว์สิ่งที่พิมพ์ไว้ใช้ครั้งต่อไป · โหมดทดลองใส่อะไรก็ได้แล้วเข้าได้เลย */
export function LoginForm({ demo = false }: { demo?: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  // โหลดค่าที่จำไว้ครั้งก่อน (localStorage อ่านได้เฉพาะ client → หลัง mount)
  useEffect(() => {
    let saved: { email?: unknown; password?: unknown } = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typeof saved.email === "string") {
      setEmail(saved.email);
    }
    if (typeof saved.password === "string") {
      setPassword(saved.password);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function remember(next: { email?: string; password?: string }) {
    const e = next.email ?? email;
    const p = next.password ?? password;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ email: e, password: p }));
    } catch {
      /* ignore */
    }
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {demo && (
        <p className="rounded-[8px] bg-[var(--accent-wash)] px-3 py-2 text-sm text-accent-deep">
          โหมดทดลอง — ใส่อะไรก็ได้ (หรือปล่อยว่าง) แล้วกด “เข้าสู่ระบบ” เพื่อดูระบบจริง
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        อีเมล / ชื่อผู้ใช้
        <input
          name="email"
          type={demo ? "text" : "email"}
          autoComplete="username"
          required={!demo}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            remember({ email: e.target.value });
          }}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        รหัสผ่าน
        <span className="relative flex items-center">
          <input
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required={!demo}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              remember({ password: e.target.value });
            }}
            className={`${inputCls} w-full pr-16`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 rounded-[6px] px-2 py-1 text-xs font-medium text-muted hover:text-ink"
            aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            {show ? "ซ่อน" : "แสดง"}
          </button>
        </span>
      </label>

      {state?.error && <p className="text-sm text-accent">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-[24px] bg-ink py-2.5 text-sm font-medium text-card transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
