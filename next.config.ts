import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ปักรากของ Turbopack ไว้ที่โปรเจกต์นี้ (กันไม่ให้ไต่ขึ้นไปเจอ lockfile นอก repo)
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    // รูปรถ/รูปรุ่น เก็บบน Supabase Storage — โปรเจกต์จริงของเกรพ (famai-motor)
    // เดิมชี้ hpsmjavfvrdctclmlmhp (โปรเจกต์เก่าที่เลิกใช้) — วันนี้ยังไม่พังเพราะทุก <Image> ใช้ unoptimized
    remotePatterns: [{ protocol: "https", hostname: "xpbdvhfvmpokdnfhoujx.supabase.co" }],
  },
};

export default nextConfig;
