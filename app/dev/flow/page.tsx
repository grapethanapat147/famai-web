"use client";

import { useState } from "react";
import { FlowView } from "@/components/flow/FlowView";

/** พรีวิวหน้าผังกระบวนการ (flow) — เลือกบทบาทเพื่อดูการไฮไลต์ "งานของคุณ" */

const ROLES = ["sales", "stock", "acct", "hr", "tech", "manager", "admin"];

export default function DevFlowPage() {
  const [role, setRole] = useState("sales");
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ผังกระบวนการ (preview)</h1>
        <p className="mt-1 text-ink-soft">เลือกบทบาทเพื่อดูไฮไลต์งานของบทบาทนั้น</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-full px-3 py-1.5 text-sm ${role === r ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </header>
      <FlowView roleCodes={[role]} />
    </main>
  );
}
