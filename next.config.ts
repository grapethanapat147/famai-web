import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ปักรากของ Turbopack ไว้ที่โปรเจกต์นี้ (กันไม่ให้ไต่ขึ้นไปเจอ lockfile นอก repo)
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // รูปรถ/รูปรุ่น เก็บบน Supabase Storage
    remotePatterns: [{ protocol: "https", hostname: "hpsmjavfvrdctclmlmhp.supabase.co" }],
  },
};

export default nextConfig;
