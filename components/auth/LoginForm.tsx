"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        อีเมล
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        รหัสผ่าน
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink"
        />
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
