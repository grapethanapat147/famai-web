import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMoney } from "@/lib/auth/money";
import { stripMoneyFields } from "@/lib/auth/strip-money";
import { buildModelRows, type ModelRow } from "@/lib/models/rows";
import { canUploadModelPhoto } from "@/lib/models/image";
import { ModelsView } from "@/components/models/ModelsView";
import { addModel, editModel, saveModelPhoto } from "./actions";

export const metadata = { title: "รุ่นรถและสี — Famai Motor Group" };

const PHOTO_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/model-photo/`;

export default async function ModelsPage() {
  const supabase = await createServerSupabase();

  // ตารางอ้างอิง (variant/color/price/photo) อ่านได้ทุกคนที่ล็อกอิน — จำนวนคันถูกกรองด้วย RLS บริษัท
  const [variantsRes, colorsRes, pricesRes, costRes, photosRes, unitsRes] = await Promise.all([
    supabase.from("model_variant").select("id, code, model_name, model_th, category, cc, model_year"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    supabase.from("price_history").select("variant_id, effective_from, retail"),
    // ราคาทุนถูกถอนสิทธิ์อ่านตรงจากตารางแล้ว (FAM-1147) — ต้องผ่านฟังก์ชันที่ตรวจสิทธิ์เอง
    // ไม่มีสิทธิ์ = ได้ลิสต์ว่าง คอลัมน์ทุนจึงหายไปเองโดยไม่ต้องดักเพิ่ม
    supabase.rpc("price_history_cost"),
    supabase.from("model_photo").select("variant_id, path_card, sort"),
    supabase.from("motorcycle_unit").select("variant_id").eq("status", "available"),
  ]);

  const see = await canSeeMoney();
  const user = await getCurrentUser();

  const counts = new Map<string, number>();
  for (const u of unitsRes.data ?? []) {
    counts.set(u.variant_id, (counts.get(u.variant_id) ?? 0) + 1);
  }

  // ฐานข้อมูลรู้แค่สิทธิ์ตามบทบาท ไม่รู้จัก "โหมดลูกค้า" (เป็น cookie ฝั่งแอป)
  // จึงยังต้อง strip ซ้ำอีกชั้น — สองชั้นนี้ทำคนละหน้าที่
  const costByKey = new Map(
    (costRes.data ?? []).map((c) => [`${c.variant_id}|${c.effective_from}`, c.cost]),
  );
  const pricesWithCost = (pricesRes.data ?? []).map((p) => ({
    ...p,
    cost: costByKey.get(`${p.variant_id}|${p.effective_from}`) ?? null,
  }));
  const prices = stripMoneyFields(pricesWithCost, see, ["cost"]) as Array<{
    variant_id: string;
    effective_from: string;
    cost?: number | null;
    retail: number | null;
  }>;

  const rows: ModelRow[] = buildModelRows(
    variantsRes.data ?? [],
    colorsRes.data ?? [],
    prices,
    photosRes.data ?? [],
    counts,
  );

  return (
    <ModelsView
      rows={rows}
      canSeeMoney={see}
      canAdd={Boolean(user?.perms.admin)}
      photoBaseUrl={PHOTO_BASE}
      action={addModel}
      editAction={editModel}
      canManagePhoto={canUploadModelPhoto(user?.roleCodes ?? [])}
      savePhotoAction={saveModelPhoto}
    />
  );
}
