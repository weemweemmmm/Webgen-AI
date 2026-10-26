import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// เสิร์ฟเว็บที่เผยแพร่แล้ว พร้อม CSP แบบ sandbox:
// - sandbox (ไม่มี allow-same-origin) => เนื้อหาทำงานใน origin ว่าง อ่านคุกกี้/localStorage ของแอปหลักไม่ได้
// - connect-src/form-action 'none' => ส่งข้อมูลออกนอกหน้าไม่ได้
const CSP = [
  "sandbox allow-scripts",
  "default-src 'none'",
  "style-src 'unsafe-inline'",
  "script-src 'unsafe-inline'",
  "img-src data:",
  "font-src data:",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "base-uri 'none'"
].join("; ");

function page(status: number, body: string, headers: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": CSP, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", ...headers }
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{4,60}$/.test(slug)) return page(404, "<h1>ไม่พบหน้านี้</h1>");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return page(503, "<h1>ยังไม่ได้ตั้งค่าเซิร์ฟเวอร์</h1>");
  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.from("projects").select("html").eq("slug", slug).eq("published", true).maybeSingle();
  if (error) return page(503, "<!doctype html><meta charset=utf-8><title>บริการขัดข้อง</title><h1>ไม่สามารถเปิดเว็บไซต์ได้ชั่วคราว</h1>");
  if (!data) return page(404, "<!doctype html><meta charset=utf-8><title>ไม่พบหน้านี้</title><h1>ไม่พบหน้านี้ หรือเจ้าของยกเลิกการเผยแพร่แล้ว</h1>");
  return page(200, data.html, { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" });
}
