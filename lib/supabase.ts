import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let client: SupabaseClient | null = null;

export function supabaseConfigured() {
  return Boolean(url && anonKey && url.startsWith("https://") && !url.includes("YOUR_PROJECT"));
}

export function getSupabase() {
  if (!supabaseConfigured() || !url || !anonKey) {
    throw new Error("ยังไม่ได้ตั้งค่า Supabase กรุณาตั้งค่า .env.local");
  }
  if (!client) client = createClient(url, anonKey);
  return client;
}
