"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type ComboOption = { value: string; label: string; sub?: string; keywords?: string };

/** กรองตัวเลือกด้วยคำค้น (label + sub + keywords, ไม่สนตัวพิมพ์) — ว่าง = คืนทุกตัว */
export function filterComboOptions(options: readonly ComboOption[], query: string): ComboOption[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...options];
  }
  return options.filter((o) => `${o.label} ${o.sub ?? ""} ${o.keywords ?? ""}`.toLowerCase().includes(q));
}

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink";

/**
 * ช่องเลือกแบบพิมพ์ค้นได้ (searchable select) — พิมพ์เพื่อกรอง · ลูกศร/Enter เลือก · Esc/คลิกนอกปิด
 * โฟกัสแล้วเคลียร์ให้พิมพ์ค้นใหม่ได้ทันที · ไม่พิมพ์ = โชว์ทุกตัวเลือก
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "พิมพ์เพื่อค้นหา…",
  ariaLabel,
  emptyText = "ไม่พบรายการ",
}: {
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => filterComboOptions(options, query), [options, query]);

  // คลิกนอกกล่อง → ปิด + เลิกแก้ไข (โชว์ค่าที่เลือกกลับมา)
  useEffect(() => {
    if (!open) {
      return;
    }
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  function choose(v: string) {
    onChange(v);
    setOpen(false);
    setEditing(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[active];
      if (o) {
        choose(o.value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setEditing(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        value={editing ? query : selected?.label ?? ""}
        placeholder={placeholder}
        onFocus={() => {
          setEditing(true);
          setQuery("");
          setActive(0);
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={inputCls}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-[10px] border border-hairline bg-card py-1 shadow-[var(--sh-md)]">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">{emptyText}</li>
          ) : (
            filtered.map((o, i) => (
              <li key={o.value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o.value)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left ${
                    i === active ? "bg-paper-2" : ""
                  } ${o.value === value ? "text-accent" : "text-ink"}`}
                >
                  <span className="text-sm">{o.label}</span>
                  {o.sub && <span className="text-xs text-muted">{o.sub}</span>}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
