export type Project = {
  id: string;
  title: string;
  prompt: string;
  html: string;
  published?: boolean;
  slug?: string | null;
  updated_at?: string;
};

export type Version = { id: string; label: string; html: string; created_at: string };

export const SITE_TYPES = [
  { id: "shop", icon: "🛍️", name: "ร้านค้าออนไลน์", hint: "หน้าแรก สินค้า เกี่ยวกับร้าน ติดต่อ" },
  { id: "portfolio", icon: "👤", name: "Portfolio", hint: "ผลงาน ทักษะ ประวัติ ติดต่อ" },
  { id: "business", icon: "🏢", name: "ธุรกิจ / บริษัท", hint: "บริการ ทีมงาน ลูกค้า ติดต่อ" },
  { id: "landing", icon: "🚀", name: "Landing page", hint: "จุดเด่น รีวิว ราคา คำถามที่พบบ่อย" },
  { id: "restaurant", icon: "🍜", name: "ร้านอาหาร/คาเฟ่", hint: "เมนู แกลเลอรี แผนที่ เวลาเปิด" }
] as const;

export const THEMES = [
  { id: "dark", icon: "🌑", name: "ดำหรูหรา", hint: "dark luxury, black and gold accents" },
  { id: "light", icon: "☀️", name: "ขาวมินิมอล", hint: "clean minimal, white with generous whitespace" },
  { id: "purple", icon: "💜", name: "ม่วงไล่สี", hint: "vibrant purple gradients" },
  { id: "green", icon: "🌿", name: "เขียวธรรมชาติ", hint: "natural green, earthy and calm" },
  { id: "warm", icon: "🧡", name: "ส้มอบอุ่น", hint: "warm orange and cream, friendly" }
] as const;

export const MAX_HTML = 150_000;
