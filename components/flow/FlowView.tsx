"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { menuItem } from "@/lib/nav/menu";
import {
  FLOWS,
  ROLE_LABEL,
  flowInvolvesRole,
  roleColor,
  roleLabel,
  stepInvolvesRole,
  visibleSteps,
  type Flow,
  type FlowStep,
  type RoleCode,
} from "@/lib/flow/flows";

const ROLE_ORDER: RoleCode[] = ["manager", "sales", "stock", "acct", "hr", "tech"];

/** ชิปสีประจำตำแหน่ง — tint จาง + ตัวอักษรสีเข้ม (อ่านได้ทั้งธีมสว่าง/มืด) · ตำแหน่งของฉันเน้นด้วยเส้นขอบ */
function chipStyle(role: string, mine: boolean): CSSProperties {
  const c = roleColor(role);
  return {
    backgroundColor: `${c}1a`,
    color: c,
    ...(mine ? { boxShadow: `inset 0 0 0 1px ${c}` } : {}),
  };
}

export function FlowView({ roleCodes }: { roleCodes: string[] }) {
  const [onlyMine, setOnlyMine] = useState(false);
  const hasRoles = roleCodes.length > 0;
  const isAdmin = roleCodes.includes("admin");

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

      {onlyMine && isAdmin && (
        <p className="mb-4 rounded-[10px] bg-paper-2 px-3 py-2 text-xs text-muted">
          คุณเป็นผู้ดูแลระบบ — เห็นทุกงานในทุกกระบวนการ
        </p>
      )}

      {/* legend — สีตามตำแหน่ง (ตำแหน่งของฉันมีเส้นขอบ) */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {ROLE_ORDER.map((r) => (
          <span key={r} className="rounded-full px-2.5 py-1 text-xs font-medium" style={chipStyle(r, roleCodes.includes(r))}>
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
          flows.map((flow) => <FlowCard key={flow.key} flow={flow} roleCodes={roleCodes} onlyMine={onlyMine} />)
        )}
      </div>
    </div>
  );
}

function FlowCard({ flow, roleCodes, onlyMine }: { flow: Flow; roleCodes: string[]; onlyMine: boolean }) {
  const steps = visibleSteps(flow, roleCodes, onlyMine);
  return (
    <section className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
      <h2 className="font-display font-semibold text-ink">{flow.title}</h2>
      <p className="mb-4 text-sm text-muted">{flow.description}</p>

      <ol className="flex flex-col">
        {steps.map(({ step, index }, pos) => (
          <StepRow key={index} step={step} stepNumber={index + 1} last={pos === steps.length - 1} roleCodes={roleCodes} />
        ))}
      </ol>
    </section>
  );
}

function StepRow({ step, stepNumber, last, roleCodes }: { step: FlowStep; stepNumber: number; last: boolean; roleCodes: string[] }) {
  const mine = stepInvolvesRole(step, roleCodes);
  const item = step.screen ? menuItem(step.screen) : undefined;

  return (
    <li className="flex gap-3">
      {/* เลขขั้น (คงเลขจริงไว้แม้กรองเฉพาะงานของฉัน) + เส้นเชื่อม */}
      <div className="flex flex-col items-center">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular ${
            mine ? "border-accent bg-accent text-card" : "border-hairline bg-card text-muted"
          }`}
        >
          {stepNumber}
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
            <span key={r} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={chipStyle(r, roleCodes.includes(r))}>
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
