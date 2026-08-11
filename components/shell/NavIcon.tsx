import type { ReactNode } from "react";

/**
 * ไอคอนเส้น 1.5px 20×20 currentColor — ไม่มีอิโมจิ (docs/04 §5)
 * ชุดแรกสำหรับ shell; ปรับ/เพิ่มความละเอียดใน FAM-1003 (Core UI components)
 */
const icons: Record<string, ReactNode> = {
  chart: (
    <>
      <path d="M3 16.5h14" />
      <path d="M5.5 16.5V10" />
      <path d="M10 16.5V4.5" />
      <path d="M14.5 16.5v-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
      <path d="M3.5 8h13" />
      <path d="M7 3v3M13 3v3" />
    </>
  ),
  files: (
    <>
      <rect x="4.5" y="3.5" width="9" height="13" rx="1.5" />
      <path d="M7 7h4M7 9.5h4M7 12h2.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 11.5 5.8 5h8.4L16 11.5" />
      <path d="M4 11.5V15a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15v-3.5" />
      <path d="M4 11.5h3.2l1 1.8h3.6l1-1.8H16" />
    </>
  ),
  bike: (
    <>
      <circle cx="5.5" cy="13" r="2.75" />
      <circle cx="14.5" cy="13" r="2.75" />
      <path d="M5.5 13 9 6.5h3l2 4.5" />
      <path d="M9 6.5H6.8" />
    </>
  ),
  tag: (
    <>
      <path d="M10.6 3.5H16a.5.5 0 0 1 .5.5v5.4L9.2 16.7a1 1 0 0 1-1.4 0L3.3 12.2a1 1 0 0 1 0-1.4z" />
      <circle cx="13" cy="7" r="1" />
    </>
  ),
  repeat: (
    <>
      <path d="M4 8a4 4 0 0 1 4-4h6" />
      <path d="M12 2l2.5 2L12 6" />
      <path d="M16 12a4 4 0 0 1-4 4H6" />
      <path d="M8 18l-2.5-2L8 14" />
    </>
  ),
  file: (
    <>
      <path d="M6 3.5h5L14.5 7v9a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z" />
      <path d="M11 3.5V7h3.5" />
    </>
  ),
  users: (
    <>
      <circle cx="8" cy="7" r="2.5" />
      <path d="M3.5 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" />
      <circle cx="14" cy="7.5" r="2" />
      <path d="M13 12.2c2 .3 3.5 1.6 3.5 3.8" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6" width="14" height="8" rx="1.5" />
      <circle cx="10" cy="10" r="2" />
      <path d="M6 8.5v3M14 8.5v3" />
    </>
  ),
  wrench: (
    <>
      <path d="M13.8 3.6a3.2 3.2 0 0 0-4 4l-5.4 5.4a1.4 1.4 0 0 0 2 2l5.4-5.4a3.2 3.2 0 0 0 4-4l-2 2-1.6-.4-.4-1.6z" />
    </>
  ),
  cog: (
    <>
      <circle cx="10" cy="10" r="2.8" />
      <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.1 5.1 6.5 6.5M13.5 13.5l1.4 1.4M14.9 5.1 13.5 6.5M6.5 13.5 5.1 14.9" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.5V10l2.5 1.5" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="14" height="9" rx="1.5" />
      <path d="M3 8.5h14" />
      <path d="M6 12h3" />
    </>
  ),
  key: (
    <>
      <circle cx="7" cy="10" r="3" />
      <path d="M9.7 9.4H16.5" />
      <path d="M14.5 9.4v2.2M16.5 9.4v1.8" />
    </>
  ),
  folder: (
    <>
      <path d="M3.5 6A1.5 1.5 0 0 1 5 4.5h3l1.5 2h5.5A1.5 1.5 0 0 1 16.5 8v6A1.5 1.5 0 0 1 15 15.5H5A1.5 1.5 0 0 1 3.5 14z" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h7M15 6h1.5M4 10h1.5M9.5 10h7M4 14h9M16 14h.5" />
      <circle cx="13" cy="6" r="1.6" />
      <circle cx="7.5" cy="10" r="1.6" />
      <circle cx="14.5" cy="14" r="1.6" />
    </>
  ),
  route: (
    <>
      <circle cx="5" cy="6" r="2" />
      <circle cx="15" cy="14" r="2" />
      <path d="M5 8v3.5A1.5 1.5 0 0 0 6.5 13H13" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="10" r="1.2" />
      <circle cx="10" cy="10" r="1.2" />
      <circle cx="15" cy="10" r="1.2" />
    </>
  ),
  __fallback: <rect x="5" y="5" width="10" height="10" rx="2.5" />,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {icons[name] ?? icons.__fallback}
    </svg>
  );
}
