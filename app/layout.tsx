import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebGen AI — สร้างเว็บไซต์ด้วย AI",
  description: "สร้างเว็บไซต์หลายหน้าจากคำสั่งภาษาไทย แก้ไขด้วย AI และเผยแพร่เป็นลิงก์"
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
