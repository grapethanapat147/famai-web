"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
type Density = "comfortable" | "compact";

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === "fm-theme" || e.key === "fm-density") {
      const el = document.documentElement;
      if (localStorage.getItem("fm-theme") === "dark") el.setAttribute("data-theme", "dark");
      else el.removeAttribute("data-theme");
      if (localStorage.getItem("fm-density") === "compact") el.setAttribute("data-density", "compact");
      else el.removeAttribute("data-density");
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}
function getTheme(): Theme {
  return typeof window !== "undefined" && localStorage.getItem("fm-theme") === "dark" ? "dark" : "light";
}
function getDensity(): Density {
  return typeof window !== "undefined" && localStorage.getItem("fm-density") === "compact" ? "compact" : "comfortable";
}
function setThemePref(next: Theme) {
  localStorage.setItem("fm-theme", next);
  const el = document.documentElement;
  if (next === "dark") el.setAttribute("data-theme", "dark");
  else el.removeAttribute("data-theme");
  notify();
}
function setDensityPref(next: Density) {
  localStorage.setItem("fm-density", next);
  const el = document.documentElement;
  if (next === "compact") el.setAttribute("data-density", "compact");
  else el.removeAttribute("data-density");
  notify();
}

export function ThemeControls() {
  const theme = useSyncExternalStore<Theme>(subscribe, getTheme, () => "light");
  const density = useSyncExternalStore<Density>(subscribe, getDensity, () => "comfortable");
  const toggleTheme = () => setThemePref(theme === "dark" ? "light" : "dark");
  const toggleDensity = () => setDensityPref(density === "compact" ? "comfortable" : "compact");

  const btn = "grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-card hover:text-ink";

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={toggleTheme} className={btn} aria-label={theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"} title={theme === "dark" ? "โหมดสว่าง" : "โหมดมืด"} aria-pressed={theme === "dark"}>
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
