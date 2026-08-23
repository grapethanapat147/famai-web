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
  const [variantsRes, colorsRes, pricesRes, photosRes, unitsRes] = await Promise.all([
    supabase.from("model_variant").select("id, code, model_name, model_th, category, cc, model_year"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    supabase.from("price_history").select("variant_id, effective_from, cost, retail"),
    supabase.from("model_photo").select("variant_id, path_card, sort"),
    supabase.from("motorcycle_unit").select("variant_id").eq("status", "available"),
  ]);

  const see = await canSeeMoney();
  const user = await getCurrentUser();

  const counts = new Map<string, number>();
  for (const u of unitsRes.data ?? []) {
    counts.set(u.variant_id, (counts.get(u.variant_id) ?? 0) + 1);
  }

  // ตัดต้นทุนออกก่อนประกอบแถว ถ้าไม่มีสิทธิ์ — ไม่ส่ง cost ไป client เลย
  const prices = stripMoneyFields(pricesRes.data ?? [], see, ["cost"]) as Array<{
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
