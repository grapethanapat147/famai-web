"use client";

/**
 * ตัวกันข้อผิดพลาดระดับ root layout (เกิดยากมาก) — global-error แทนที่ layout ทั้งหมด
 * จึงต้อง render <html>/<body> เอง และใช้ inline style (ไม่พึ่ง CSS ของแอปที่อาจโหลดไม่ทัน)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          background: "#f4f5f7",
          color: "#16181d",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            textAlign: "center",
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 8px 24px rgba(22,24,29,0.10)",
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Famai Motor Group</p>
          <p style={{ marginTop: 16, fontSize: 20, fontWeight: 600 }}>ระบบขัดข้อง</p>
          <p style={{ marginTop: 8, fontSize: 14, color: "#5b6270" }}>
            เกิดข้อผิดพลาดร้ายแรง ลองใหม่อีกครั้ง หากยังไม่หายแจ้งผู้ดูแลระบบ
          </p>
          {error.digest && (
            <p style={{ marginTop: 4, fontSize: 11, color: "#8a90a0", fontFamily: "monospace" }}>
              รหัสอ้างอิง: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              border: 0,
              borderRadius: 24,
              background: "#16181d",
              color: "#fff",
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ลองใหม่
          </button>
        </div>
      </body>
    </html>
  );
}
