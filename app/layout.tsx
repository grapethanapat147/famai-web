import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Inter, Trirong, Anuphan } from "next/font/google";
import { ThemeStyle } from "@/components/theme/ThemeStyle";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-init";
import { siteBaseUrl } from "@/lib/site";
import "./globals.css";

// Noto Sans Thai — self-host จาก woff2 ในโปรเจกต์ (ที่มาดู app/fonts/README.md) ไม่มี request ออก Google
const notoThai = localFont({
  variable: "--f-thai",
  display: "swap",
  src: [
    { path: "./fonts/noto-thai-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-thai-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/noto-thai-700.woff2", weight: "700", style: "normal" },
  ],
});

// Inter — next/font self-host ตอน build (ไม่มี request ออก Google ตอน runtime) ให้ตัวเลข tabular กับตารางเงิน
const inter = Inter({ variable: "--f-inter", subsets: ["latin"], display: "swap" });

// คู่ฟอนต์พรีเมียม "ไตรรงค์ + อนุพันธ์" (FAM-1039) — โหลดพร้อมเสมอเพื่อสลับได้ทันที · น้ำหนักน้อยไว้ให้เบา
const trirong = Trirong({ variable: "--f-trirong", subsets: ["thai", "latin"], weight: ["500", "600"], display: "swap" });
const anuphan = Anuphan({ variable: "--f-anuphan", subsets: ["thai", "latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl()),
  title: "Famai Motor Group",
  description: "ระบบจัดการดีลเลอร์รถจักรยานยนต์ Yamaha 3 บริษัท",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning className={`${notoThai.variable} ${inter.variable} ${trirong.variable} ${anuphan.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeStyle />
        {children}
      </body>
    </html>
  );
}
