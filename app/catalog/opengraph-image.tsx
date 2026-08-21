import { ImageResponse } from "next/og";

export const alt = "แคตตาล็อกรถ Yamaha — Famai Motor Group";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsansthai/IBMPlexSansThai-SemiBold.ttf";

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(FONT_URL);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const fontData = await loadFont();
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
          <div style={{ display: "flex", fontSize: 96, color: "#16181d", lineHeight: 1.05 }}>แคตตาล็อกรถ</div>
          <div style={{ display: "flex", fontSize: 96, color: "#E60012", lineHeight: 1.05 }}>Yamaha</div>
          <div style={{ display: "flex", fontSize: 36, color: "#8b8f98", marginTop: 20 }}>
            ดูรุ่น · ราคา · สี · รุ่นที่มีจำหน่าย
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#8b8f98" }}>ตัวแทนจำหน่าย Yamaha · สอบถาม/จองได้ที่ร้าน</div>
      </div>
    ),
    { ...size, fonts: fontData ? [{ name: "Plex", data: fontData, style: "normal", weight: 600 }] : [] },
  );
}
