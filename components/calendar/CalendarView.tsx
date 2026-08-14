"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import { buildMonthGrid, monthLabel, shiftMonth } from "@/lib/calendar/grid";
import {
  EVENT_META,
  EVENT_ORDER,
  countsByType,
  eventsByDay,
  filterByType,
  type CalEvent,
  type CalEventType,
} from "@/lib/calendar/events";

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

export function CalendarView({
  events,
  month,
  today,
}: {
  events: CalEvent[];
  month: string;
  today: string;
}) {
  const router = useRouter();
  const [type, setType] = useState<CalEventType | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);

  const [year, mon] = month.split("-").map(Number);
  const weeks = buildMonthGrid(year, (mon || 1) - 1);
  const counts = countsByType(events);
  const filtered = filterByType(events, type);
  const byDay = eventsByDay(filtered);

  const go = (m: string) => router.push(`?month=${m}`);
  const selectedEvents = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <NavBtn label="‹" onClick={() => go(shiftMonth(month, -1))} />
          <h2 className="min-w-[9rem] text-center font-display text-lg font-semibold text-ink">{monthLabel(month)}</h2>
          <NavBtn label="›" onClick={() => go(shiftMonth(month, 1))} />
        </div>
        <button
          type="button"
          onClick={() => go(today.slice(0, 7))}
          className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft"
        >
          เดือนนี้
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip active={type === "all"} onClick={() => setType("all")} dot="bg-muted" label={`ทั้งหมด (${events.length})`} />
        {EVENT_ORDER.map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(type === t ? "all" : t)} dot={EVENT_META[t].dot} label={`${EVENT_META[t].label} (${counts[t]})`} />
        ))}
      </div>

      <div className="overflow-hidden rounded-[12px] bg-card shadow-[var(--sh-sm)]">
        <div className="grid grid-cols-7 border-b border-hairline text-center text-xs text-muted">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-2">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((cell) => {
            const dayEvents = byDay.get(cell.date) ?? [];
            const isToday = cell.date === today;
            const isSel = cell.date === selected;
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelected(cell.date)}
                className={`flex min-h-[64px] flex-col items-center gap-1 border-b border-r border-hairline-2 p-1.5 text-left last:border-r-0 ${
                  cell.inMonth ? "bg-card" : "bg-paper/60"
                } ${isSel ? "ring-2 ring-inset ring-ink" : ""}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs tabular ${
                    isToday ? "bg-accent font-semibold text-card" : cell.inMonth ? "text-ink" : "text-muted"
                  }`}
                >
                  {Number(cell.date.slice(8, 10))}
                </span>
                <span className="flex flex-wrap justify-center gap-0.5">
                  {dayEvents.slice(0, 4).map((e, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${EVENT_META[e.type].dot}`} aria-hidden />
                  ))}
                  {dayEvents.length > 4 && <span className="text-[9px] leading-none text-muted">+{dayEvents.length - 4}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="mt-4 rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
          <h3 className="mb-3 font-display font-semibold text-ink">{formatThaiDate(selected)}</h3>
          {selectedEvents.length === 0 ? (
            <p className="text-muted">ไม่มีกิจกรรมในวันนี้</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selectedEvents.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 border-b border-hairline-2 pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-ink">{e.title}</p>
                    {e.subtitle && <p className="truncate text-xs text-muted">{e.subtitle}</p>}
                  </div>
                  <StatusBadge variant={EVENT_META[e.type].variant}>{EVENT_META[e.type].label}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NavBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-lg text-ink-soft hover:text-ink">
      {label}
    </button>
  );
}

function Chip({ active, onClick, dot, label }: { active: boolean; onClick: () => void; dot: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${active ? "bg-ink text-card" : "border border-hairline bg-card text-ink-soft"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </button>
  );
}
