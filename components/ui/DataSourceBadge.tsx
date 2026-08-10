/** ป้ายที่มาข้อมูล — 'ข้อมูลจริง' / 'ข้อมูลสมมุติ' (docs/04 §11.3, spec §16) */
export function DataSourceBadge({ source }: { source: "real" | "mock" }) {
  const real = source === "real";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-[11px] text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${real ? "bg-pos" : "bg-attn"}`} aria-hidden />
      {real ? "ข้อมูลจริง" : "ข้อมูลสมมุติ"}
    </span>
  );
}
