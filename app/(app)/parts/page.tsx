import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { stripMoneyFields } from "@/lib/auth/strip-money";
import { allowedPartsTabs, needsParts, needsFreebies } from "@/lib/parts/tabs";
import { canManageParts, type FreebieRow, type PartRow } from "@/lib/parts/stock";
import { PartsView } from "@/components/parts/PartsView";
import { addPart, issuePart, receivePart, updateFreebie, updatePart } from "./actions";

export const metadata = { title: "อะไหล่และของแถม — Famai Motor Group" };

export default async function PartsPage() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser();
  const roleCodes = user?.roleCodes ?? [];
  const tabs = allowedPartsTabs(roleCodes);

  if (tabs.length === 0) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        คุณไม่มีสิทธิ์เข้าหน้าอะไหล่และของแถม
      </p>
    );
  }

  const [partsRes, freebiesRes] = await Promise.all([
    needsParts(tabs)
      ? supabase.from("part").select("id, code, name, qty_on_hand, min_qty, cost, price").order("name")
      : Promise.resolve({ data: [] }),
    needsFreebies(tabs)
      ? supabase.from("freebie").select("id, name, cost, qty_on_hand, min_qty").order("name")
      : Promise.resolve({ data: [] }),
  ]);

  const see = await canSeeMoney();

  const rawParts: PartRow[] = (partsRes.data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    qtyOnHand: p.qty_on_hand,
    minQty: p.min_qty,
    price: p.price,
    cost: p.cost,
  }));
  const rawFreebies: FreebieRow[] = (freebiesRes.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    qtyOnHand: f.qty_on_hand,
    minQty: f.min_qty,
    cost: f.cost,
  }));

  // ตัดต้นทุนออกฝั่งเซิร์ฟเวอร์ถ้าไม่มีสิทธิ์ — ไม่ส่ง cost ไป client เลย
  const parts = stripMoneyFields(rawParts, see, ["cost"]) as PartRow[];
  const freebies = stripMoneyFields(rawFreebies, see, ["cost"]) as FreebieRow[];

  return (
    <PartsView
      allowedTabs={tabs}
      parts={parts}
      freebies={freebies}
      canSeeMoney={see}
      canManageParts={canManageParts(roleCodes)}
      issuePartAction={issuePart}
      updateFreebieAction={updateFreebie}
      addPartAction={addPart}
      updatePartAction={updatePart}
      receivePartAction={receivePart}
    />
  );
}
