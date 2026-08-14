"use client";

import { useState } from "react";
import Link from "next/link";
import { menuItem } from "@/lib/nav/menu";
import {
  FLOWS,
  ROLE_LABEL,
  flowInvolvesRole,
  roleLabel,
  stepInvolvesRole,
  type Flow,
  type FlowStep,
  type RoleCode,
} from "@/lib/flow/flows";

const ROLE_ORDER: RoleCode[] = ["manager", "sales", "stock", "acct", "hr", "tech"];

export function FlowView({ roleCodes }: { roleCodes: string[] }) {
  const [onlyMine, setOnlyMine] = useState(false);
  const hasRoles = roleCodes.length > 0;

  const flows = onlyMine ? FLOWS.filter((f) => flowInvolvesRole(f, roleCodes)) : FLOWS;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">กระบวนการทำงานหลัก — ใครทำอะไรตอนไหน</p>
        {hasRoles && (
          <button
            type="button"
            aria-pressed={onlyMine}
            onClick={() => setOnlyMine((v) => !v)}
            className={`rounded-full px-4 py-2 text-sm ${onlyMine ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft"}`}
          >
            เฉพาะงานของฉัน
          </button>
        )}
      </div>

      {/* legend บทบาท */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {ROLE_ORDER.map((r) => (
          <span
            key={r}
            className={`rounded-full px-2.5 py-1 text-xs ${roleCodes.includes(r) || roleCodes.includes("admin") ? "bg-accent/10 text-accent" : "border border-hairline text-muted"}`}
          >
            {ROLE_LABEL[r]}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {flows.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
            ไม่มีกระบวนการที่เกี่ยวกับบทบาทของคุณ
          </p>
        ) : (
          flows.map((flow) => <FlowCard key={flow.key} flow={flow} roleCodes={roleCodes} />)
        )}
      </div>
    </div>
  );
}

function FlowCard({ flow, roleCodes }: { flow: Flow; roleCodes: string[] }) {
  return (
    <section className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
      <h2 className="font-display font-semibold text-ink">{flow.title}</h2>
      <p className="mb-4 text-sm text-muted">{flow.description}</p>

      <ol className="flex flex-col">
        {flow.steps.map((step, i) => (
          <StepRow key={i} step={step} index={i} last={i === flow.steps.length - 1} roleCodes={roleCodes} />
        ))}
      </ol>
    </section>
  );
}

function StepRow({ step, index, last, roleCodes }: { step: FlowStep; index: number; last: boolean; roleCodes: string[] }) {
  const mine = stepInvolvesRole(step, roleCodes);
  const item = step.screen ? menuItem(step.screen) : undefined;

  return (
    <li className="flex gap-3">
      {/* เลขขั้น + เส้นเชื่อม */}
      <div className="flex flex-col items-center">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular ${
            mine ? "border-accent bg-accent text-card" : "border-hairline bg-card text-muted"
          }`}
        >
          {index + 1}
        </span>
        {!last && <span className="w-0.5 flex-1 bg-hairline-2" />}
      </div>

      {/* เนื้อหาขั้น */}
      <div className={`min-w-0 flex-1 pb-5 ${last ? "pb-0" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink">{step.title}</span>
          {mine && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">งานของคุณ</span>}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {step.roles.map((r) => (
            <span
              key={r}
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                roleCodes.includes(r) || roleCodes.includes("admin") ? "bg-accent/10 text-accent" : "border border-hairline text-muted"
              }`}
            >
              {roleLabel(r)}
            </span>
          ))}
        </div>

        {step.note && <p className="mt-1 text-xs text-muted">{step.note}</p>}

        {item && (
          <Link href={`/${step.screen}`} className="mt-1 inline-block text-xs text-ink-soft underline-offset-2 hover:text-ink hover:underline">
            ไปที่ {item.title} →
          </Link>
        )}
      </div>
    </li>
  );
}
