import { ImageResponse } from "next/og";
import sharp from "sharp";
import { createPublicSupabase } from "@/lib/supabase/public";
import { availabilityMeta, galleryImages, type CatalogModel } from "@/lib/catalog/model";

export const runtime = "nodejs"; // ต้องใช้ sharp (แปลง WebP→PNG) — Edge ไม่รองรับ
export const alt = "Famai Motor Group — Yamaha";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ฟอนต์ไทยสำหรับ satori (woff2 ที่ vendored ใช้ไม่ได้) — ดึง TTF ครั้งเดียวตอน render
const FONT_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsansthai/IBMPlexSansThai-SemiBold.ttf";

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(FONT_URL);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/**
 * รูปรถจริงในการ์ด OG: รูปเก็บเป็น WebP (จากหน้าแอดมิน) แต่ satori/next-og เรนเดอร์ WebP ไม่ได้
 * → ดึงมาแล้วแปลงเป็น PNG ด้วย sharp แล้วฝังเป็น data URI (คมพอสำหรับการ์ด 470×630 @2x) · พลาด → ไม่มีรูป
 */
async function loadPhotoPng(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const input = Buffer.from(await res.arrayBuffer());
    const png = await sharp(input).resize(940, 1260, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("model").select("*").eq("code", code).maybeSingle();
  const m = data as CatalogModel | null;

  const gallery = m ? galleryImages(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", m) : [];
  const [fontData, photoData] = await Promise.all([loadFont(), gallery[0] ? loadPhotoPng(gallery[0].full) : null]);

  const name = m ? m.model_th || m.model : "Yamaha";
  const meta = [m?.cat, m?.cc ? `${m.cc} ซีซี` : null, m?.year ? `ปี ${m.year}` : null].filter(Boolean).join("   ·   ");
  const price = m?.retail != null ? `฿${m.retail.toLocaleString("en-US")}` : "สอบถามราคา";
  const av = m ? availabilityMeta(m.availability) : null;
  const avColor = av?.variant === "good" ? "#1f7a4d" : av?.variant === "warn" ? "#a96410" : "#8b8f98";

  const info = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        flex: 1,
        height: "100%",
        padding: 76,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 22, height: 22, borderRadius: 999, background: "#E60012" }} />
        <div style={{ fontSize: 32, color: "#16181d" }}>Famai Motor Group</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 32, color: "#8b8f98", marginBottom: 10 }}>{meta}</div>
        <div style={{ display: "flex", fontSize: photoData ? 80 : 100, color: "#16181d", lineHeight: 1.02 }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 22, flexWrap: "wrap" }}>
          <div style={{ display: "flex", fontSize: 64, color: "#E60012" }}>{price}</div>
          {av && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 28,
                color: avColor,
                border: "2px solid #e1e0dc",
                borderRadius: 999,
                padding: "8px 20px",
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 999, background: avColor }} />
              {av.label}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 28, color: "#8b8f98" }}>ตัวแทนจำหน่าย Yamaha · แคตตาล็อกออนไลน์</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#fafaf8", fontFamily: "Plex" }}>
        {info}
        {photoData && (
          <div style={{ display: "flex", width: 470, height: "100%" }}>
            <img src={photoData} width={470} height={630} style={{ objectFit: "cover" }} alt="" />
          </div>
        )}
      </div>
    ),
    { ...size, fonts: fontData ? [{ name: "Plex", data: fontData, style: "normal", weight: 600 }] : [] },
  );
}
