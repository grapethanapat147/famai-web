import { ImageResponse } from "next/og";
import { createPublicSupabase } from "@/lib/supabase/public";
import { availabilityMeta, type CatalogModel } from "@/lib/catalog/model";

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

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createPublicSupabase();
  const { data } = await supabase.from("model").select("*").eq("code", code).maybeSingle();
  const m = data as CatalogModel | null;
  const fontData = await loadFont();

  const name = m ? m.model_th || m.model : "Yamaha";
  const meta = [m?.cat, m?.cc ? `${m.cc} ซีซี` : null, m?.year ? `ปี ${m.year}` : null].filter(Boolean).join("   ·   ");
  const price = m?.retail != null ? `฿${m.retail.toLocaleString("en-US")}` : "สอบถามราคา";
  const av = m ? availabilityMeta(m.availability) : null;
  const avColor = av?.variant === "good" ? "#1f7a4d" : av?.variant === "warn" ? "#a96410" : "#8b8f98";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#fafaf8",
          padding: 76,
          fontFamily: "Plex",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 22, height: 22, borderRadius: 999, background: "#E60012" }} />
          <div style={{ fontSize: 32, color: "#16181d" }}>Famai Motor Group</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontSize: 34, color: "#8b8f98", marginBottom: 10 }}>{meta}</div>
          <div style={{ display: "flex", fontSize: 100, color: "#16181d", lineHeight: 1.02 }}>{name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 28, marginTop: 22 }}>
            <div style={{ display: "flex", fontSize: 68, color: "#E60012" }}>{price}</div>
            {av && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 30,
                  color: avColor,
                  border: "2px solid #e1e0dc",
                  borderRadius: 999,
                  padding: "8px 22px",
                }}
              >
                <div style={{ width: 14, height: 14, borderRadius: 999, background: avColor }} />
                {av.label}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "#8b8f98" }}>ตัวแทนจำหน่าย Yamaha · แคตตาล็อกออนไลน์</div>
      </div>
    ),
    { ...size, fonts: fontData ? [{ name: "Plex", data: fontData, style: "normal", weight: 600 }] : [] },
  );
}
