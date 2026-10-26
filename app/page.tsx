"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { Project, Version, SITE_TYPES, THEMES, MAX_HTML } from "@/lib/types";

const starter = `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:#f8f6f2;color:#191919}.nav{display:flex;justify-content:space-between;padding:22px 7%;font-weight:800}.hero{padding:70px 8%;background:linear-gradient(135deg,#f8f6f2,#e7e0d6)}h1{font-size:clamp(38px,8vw,70px);line-height:1.05;max-width:700px;margin:0 0 20px}p{line-height:1.8;color:#5b5b5b;max-width:600px}.btn{display:inline-block;margin-top:12px;padding:13px 18px;background:#171717;color:white;text-decoration:none;border-radius:8px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;padding:28px 8%}.card{border-radius:12px;background:#e4ddd2;padding:25px;min-height:120px;font-weight:700}.foot{padding:25px 8%;color:#777}</style></head>
<body><nav class="nav"><span>YOUR BRAND</span><span>หน้าแรก　 บริการ　 ติดต่อ</span></nav><main class="hero"><h1>ไอเดียของคุณ<br>เริ่มต้นที่นี่</h1><p>นี่คือตัวอย่างเว็บไซต์ของคุณ อธิบายไอเดียทางด้านซ้ายเพื่อสร้างเว็บไซต์ใหม่ด้วย AI</p><a class="btn" href="#contact">เริ่มต้นเลย →</a></main><section class="grid"><div class="card">บริการของเรา</div><div class="card">ผลงานของเรา</div><div class="card">ติดต่อเรา</div></section><footer id="contact" class="foot">© YOUR BRAND</footer></body></html>`;

// CSP ฝังในพรีวิว: บล็อกการโหลด/ส่งข้อมูลออกนอกหน้า เหมือนที่หน้าเผยแพร่ใช้
const PREVIEW_CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'">`;
function previewDoc(html: string) {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + PREVIEW_CSP);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + PREVIEW_CSP);
  return PREVIEW_CSP + html;
}

function randomSlug() {
  const b = new Uint8Array(6); crypto.getRandomValues(b);
  return "site-" + Array.from(b, (x) => (x % 36).toString(36)).join("");
}

const DEVICES = { mobile: { label: "📱 มือถือ", w: 390 }, tablet: { label: "📟 แท็บเล็ต", w: 768 }, desktop: { label: "🖥️ เดสก์ท็อป", w: 0 } } as const;
type Device = keyof typeof DEVICES;
const MAX_VERSIONS = 20;

export default function Home() {
  const [prompt, setPrompt] = useState("ร้านเสื้อผ้ามือสองสไตล์มินิมอล มีหน้าแรก หน้าสินค้า เกี่ยวกับร้าน และติดต่อ รองรับมือถือ");
  const [title, setTitle] = useState("โปรเจกต์แรกของฉัน");
  const [siteType, setSiteType] = useState<string>("auto");
  const [customSiteType, setCustomSiteType] = useState("");
  const [theme, setTheme] = useState<string>("light");
  const [customColor, setCustomColor] = useState("#7950f2");
  const [html, setHtml] = useState(starter);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [editText, setEditText] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "reset-request" | "reset-password">("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const [confirmationNeeded, setConfirmationNeeded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("พร้อมเริ่มสร้างเว็บไซต์");
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [savedHtml, setSavedHtml] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [device, setDevice] = useState<Device>("desktop");
  const [copied, setCopied] = useState(false);

  const configured = supabaseConfigured();
  const dirty = savedHtml !== null && savedHtml !== html;
  const srcDoc = useMemo(() => previewDoc(html), [html]);
  const publicUrl = slug && typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : "";

  useEffect(() => {
    if (!configured) return;
    const sb = getSupabase();
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("error_code") || params.get("error");
    if (authError) {
      if (authError === "otp_expired" || authError === "access_denied") {
        setConfirmationNeeded(true);
        setError("ลิงก์ยืนยันหมดอายุหรือถูกใช้แล้ว กดส่งอีเมลยืนยันซ้ำเพื่อรับลิงก์ใหม่");
      } else {
        setError("ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่");
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
    sb.auth.getSession().then(({ data, error }) => {
      if (error) { fail(error, "ตรวจสอบสถานะเข้าสู่ระบบไม่สำเร็จ"); return; }
      if (data.session) { setLoggedIn(true); loadProjects(); refreshQuota(); }
    }).catch((error: unknown) => fail(error, "เชื่อมต่อ Supabase ไม่สำเร็จ"));
    const { data: listener } = sb.auth.onAuthStateChange((event, session) => {
      setLoggedIn(Boolean(session));
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset-password");
        setMessage("ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ");
      }
      if (session) { loadProjects(); refreshQuota(); } else { setProjects([]); setQuota(null); }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  // เตือนก่อนปิดหน้าถ้ามีการแก้ไขที่ยังไม่บันทึก
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const fail = (e: unknown, fallback: string) => setError(e instanceof Error ? e.message : (e as { message?: string })?.message || fallback);

  async function token() {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token;
  }

  async function refreshQuota() {
    try {
      const t = await token(); if (!t) return;
      const res = await fetch("/api/generate", { headers: { Authorization: `Bearer ${t}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "โหลดโควตาไม่สำเร็จ");
      setQuota(body);
    } catch (e) { fail(e, "โหลดโควตาไม่สำเร็จ"); }
  }

  async function loadProjects() {
    try {
      const { data, error } = await getSupabase().from("projects").select("id,title,prompt,html,published,slug,updated_at").order("updated_at", { ascending: false });
      if (error?.code === "PGRST205") {
        throw new Error("ยังไม่ได้สร้างตารางใน Supabase: เปิด SQL Editor แล้วรันไฟล์ supabase/schema.sql จากโปรเจกต์");
      }
      if (error) throw error;
      setProjects((data || []) as Project[]);
    } catch (e) { fail(e, "โหลดโปรเจกต์ไม่สำเร็จ"); }
  }

  async function loadVersions(projectId: string) {
    const { data, error } = await getSupabase().from("project_versions").select("id,label,html,created_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(MAX_VERSIONS);
    if (error) {
      if (error.code === "PGRST205") {
        setError("ยังไม่ได้สร้างตารางประวัติเวอร์ชันใน Supabase: รันไฟล์ supabase/schema.sql ใน SQL Editor");
      } else {
        fail(error, "โหลดประวัติเวอร์ชันไม่สำเร็จ");
      }
      return;
    }
    setVersions((data || []) as Version[]);
  }

  async function auth(mode: "signin" | "signup") {
    const email = userEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }
    if (!password) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("รหัสผ่านสมัครบัญชีต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setAuthBusy(true);
    setError("");
    setConfirmationNeeded(false);
    setMessage(mode === "signup" ? "กำลังสมัครบัญชี..." : "กำลังเข้าสู่ระบบ...");
    try {
      const sb = getSupabase();
      const result = mode === "signup"
        ? await sb.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/` }
          })
        : await sb.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setConfirmationNeeded(true);
        setMessage("สมัครแล้ว แต่ต้องยืนยันอีเมลก่อนเข้าสู่ระบบ: เปิดลิงก์จากอีเมล Supabase (เช็กจดหมายขยะด้วย) แล้วกลับมาเข้าสู่ระบบ");
      } else {
        setLoggedIn(true);
        setMessage(mode === "signup" ? "สมัครและเข้าสู่ระบบแล้ว" : "เข้าสู่ระบบแล้ว");
        setPassword("");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      const normalized = message.toLowerCase();
      if (normalized.includes("invalid login credentials")) setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      else if (normalized.includes("email not confirmed")) {
        setConfirmationNeeded(true);
        setError("อีเมลนี้ยังไม่ได้ยืนยัน กดส่งอีเมลยืนยันซ้ำด้านล่าง แล้วเปิดลิงก์จากกล่องจดหมาย");
      }
      else if (normalized.includes("user already registered") || normalized.includes("already been registered")) setError("อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบแทน");
      else if (normalized.includes("password should be at least") || normalized.includes("password is too short")) setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      else if (normalized.includes("signup is disabled")) setError("ระบบปิดรับสมัครบัญชีใหม่อยู่");
      else if (normalized.includes("too many requests") || normalized.includes("rate limit")) setError("มีการลองหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่");
      else if (normalized.includes("failed to fetch") || normalized.includes("load failed") || normalized.includes("network")) setError("เชื่อมต่อ Supabase ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่");
      else fail(e, mode === "signup" ? "สมัครบัญชีไม่สำเร็จ" : "เข้าสู่ระบบไม่สำเร็จ");
      setMessage("");
    } finally {
      setAuthBusy(false);
    }
  }

  async function requestPasswordReset() {
    const email = userEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    setAuthBusy(true);
    setError("");
    setMessage("กำลังส่งคำขอตั้งรหัสผ่านใหม่...");
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });
      if (error) throw error;
      setMessage("หากอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ กรุณาตรวจกล่องจดหมายและจดหมายขยะ");
    } catch (e) {
      const message = e instanceof Error ? e.message.toLowerCase() : "";
      if (message.includes("rate limit") || message.includes("too many requests")) {
        setError("ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
      } else {
        fail(e, "ส่งลิงก์ตั้งรหัสผ่านไม่สำเร็จ");
      }
      setMessage("");
    } finally {
      setAuthBusy(false);
    }
  }

  async function updatePassword() {
    if (newPassword.length < 6) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setAuthBusy(true);
    setError("");
    setMessage("กำลังบันทึกรหัสผ่านใหม่...");
    try {
      const { error } = await getSupabase().auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setPassword("");
      setAuthMode("signin");
      setLoggedIn(true);
      setMessage("ตั้งรหัสผ่านใหม่แล้ว และเข้าสู่ระบบเรียบร้อย");
    } catch (e) {
      fail(e, "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
      setMessage("");
    } finally {
      setAuthBusy(false);
    }
  }

  async function resendConfirmation() {
    const email = userEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("กรุณากรอกอีเมลให้ถูกต้องก่อนส่งลิงก์ยืนยัน");
      return;
    }

    setAuthBusy(true);
    setError("");
    setMessage("กำลังส่งอีเมลยืนยันอีกครั้ง...");
    try {
      const { error } = await getSupabase().auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/` }
      });
      if (error) throw error;
      setMessage("ส่งคำขอแล้ว กรุณาตรวจกล่องจดหมายและจดหมายขยะ หากยังไม่พบ ให้ตรวจการตั้งค่า SMTP ใน Supabase");
    } catch (e) {
      const message = e instanceof Error ? e.message.toLowerCase() : "";
      if (message.includes("rate limit") || message.includes("too many requests")) {
        setError("ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
      } else {
        fail(e, "ส่งอีเมลยืนยันไม่สำเร็จ");
      }
      setMessage("");
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    try {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw error;
      newProject(); setLoggedIn(false); setProjects([]); setMessage("ออกจากระบบแล้ว");
    } catch (e) { fail(e, "ออกจากระบบไม่สำเร็จ"); }
  }

  function newProject() {
    setActiveId(null); setPublished(false); setSlug(null); setVersions([]); setSavedHtml(null); setUndoStack([]);
    setHtml(starter); setTitle("โปรเจกต์ใหม่"); setError(""); setMessage("เริ่มโปรเจกต์ใหม่");
  }

  async function callAI(payload: Record<string, unknown>) {
    const t = await token();
    if (!t) throw new Error("กรุณาเข้าสู่ระบบก่อนใช้ AI");
    const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify(payload) });
    const body = await res.json().catch(() => ({}));
    if (body.limit != null) setQuota({ used: body.used, limit: body.limit });
    if (!res.ok) throw new Error(body.error || "เรียก AI ไม่สำเร็จ");
    return body as { html: string };
  }

  async function generate() {
    if (siteType === "custom" && !customSiteType.trim()) {
      setError("กรุณาระบุประเภทเว็บไซต์ หรือเลือกประเภทให้ AI วิเคราะห์");
      return;
    }
    if (prompt.trim().length < 8) {
      setError("กรุณาอธิบายเว็บไซต์อย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (dirty && !confirm("มีการแก้ไขที่ยังไม่บันทึก การสร้างใหม่จะแทนที่เนื้อหาปัจจุบัน (ย้อนกลับได้ด้วยปุ่ม ↩︎) ดำเนินการต่อหรือไม่?")) return;
    setBusy(true); setError(""); setMessage("AI กำลังออกแบบเว็บไซต์... (ใช้เวลาประมาณ 10–40 วินาที)");
    try {
      const themeHint = theme === "custom"
        ? `Use ${customColor} as the user's chosen primary brand color, with accessible complementary colors.`
        : THEMES.find((t) => t.id === theme)?.hint;
      const typeName = SITE_TYPES.find((t) => t.id === siteType);
      const selectedType = siteType === "auto"
        ? "Analyze the user's description and choose the most suitable website type and sections."
        : siteType === "custom"
          ? customSiteType.trim()
          : typeName ? `${typeName.name} (${typeName.hint})` : "";
      const body = await callAI({ mode: "create", prompt, title, siteType: selectedType, theme: themeHint });
      setUndoStack((s) => [...s.slice(-9), html]);
      setHtml(body.html); setTab("preview");
      setMessage("สร้างเว็บสำเร็จ — ตรวจดูพรีวิว สั่งแก้เพิ่มได้ แล้วกดบันทึก");
    } catch (e) { fail(e, "เกิดข้อผิดพลาด"); setMessage("สร้างเว็บไซต์ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function editWithAI() {
    setBusy(true); setError(""); setMessage("AI กำลังแก้ไขเว็บไซต์...");
    try {
      const body = await callAI({ mode: "edit", title, currentHtml: html, instruction: editText });
      setUndoStack((s) => [...s.slice(-9), html]);
      setHtml(body.html); setEditText(""); setTab("preview");
      setMessage("แก้ไขแล้ว — ไม่พอใจกด ↩︎ ย้อนกลับได้");
    } catch (e) { fail(e, "แก้ไขไม่สำเร็จ"); setMessage("แก้ไขไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  function undo() {
    setUndoStack((s) => { if (!s.length) return s; setHtml(s[s.length - 1]); return s.slice(0, -1); });
  }

  async function saveProject(label = "บันทึก") {
    setError("");
    if (html.length > MAX_HTML) { setError("ไฟล์ใหญ่เกินไป (สูงสุด 150KB)"); return; }
    setSaving(true);
    try {
      const sb = getSupabase();
      const { data: authData, error: authError } = await sb.auth.getUser();
      if (authError) throw authError;
      if (!authData.user) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึก");
      const base = { title: title.trim() || "เว็บไซต์ไม่มีชื่อ", prompt, html, updated_at: new Date().toISOString() };
      const result = activeId
        ? await sb.from("projects").update(base).eq("id", activeId).select("id,published,slug").single()
        : await sb.from("projects").insert({ ...base, user_id: authData.user.id }).select("id,published,slug").single();
      if (result.error) throw result.error;
      const id = result.data.id as string;
      setActiveId(id); setPublished(Boolean(result.data.published)); setSlug(result.data.slug); setSavedHtml(html);
      const v = await sb.from("project_versions").insert({ project_id: id, user_id: authData.user.id, label, html });
      let historyError = v.error;
      if (!historyError) {
        const { data: all, error: listError } = await sb.from("project_versions").select("id").eq("project_id", id).order("created_at", { ascending: false });
        historyError = listError;
        if (!historyError) {
          const extra = (all || []).slice(MAX_VERSIONS).map((r) => r.id);
          if (extra.length) {
            const { error } = await sb.from("project_versions").delete().in("id", extra);
            historyError = error;
          }
        }
      }
      if (historyError) {
        setMessage("บันทึกโปรเจกต์แล้ว แต่จัดการประวัติเวอร์ชันไม่สำเร็จ");
        setError(historyError.message);
      } else {
        setMessage(result.data.published ? "บันทึกแล้ว — หน้าเว็บที่เผยแพร่อัปเดตตามด้วย" : "บันทึกโปรเจกต์แล้ว");
      }
      await Promise.all([loadProjects(), loadVersions(id)]);
    } catch (e) { fail(e, "บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  async function togglePublish() {
    if (!activeId) { setError("กรุณาบันทึกโปรเจกต์ก่อนเผยแพร่"); return; }
    if (!published && !confirm("เผยแพร่แล้วทุกคนที่มีลิงก์จะเปิดดูเว็บนี้ได้ ตรวจสอบเนื้อหา (ไม่มีข้อมูลส่วนตัว/คำกล่าวอ้างที่ไม่จริง) แล้วหรือยัง?")) return;
    setError("");
    try {
      const next = !published;
      const newSlug = slug || randomSlug();
      const { error } = await getSupabase().from("projects").update({ published: next, slug: newSlug }).eq("id", activeId);
      if (error) throw error;
      setPublished(next); setSlug(newSlug); setMessage(next ? "เผยแพร่แล้ว — คัดลอกลิงก์ไปแชร์ได้" : "ยกเลิกการเผยแพร่แล้ว");
      await loadProjects();
    } catch (e) { fail(e, "เผยแพร่ไม่สำเร็จ"); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setError("คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกลิงก์แล้วคัดลอกเอง"); }
  }

  function openProject(p: Project) {
    if (dirty && !confirm("มีการแก้ไขที่ยังไม่บันทึก เปิดโปรเจกต์อื่นและทิ้งการแก้ไขนี้หรือไม่?")) return;
    setActiveId(p.id); setTitle(p.title); setPrompt(p.prompt); setHtml(p.html); setSavedHtml(p.html);
    setPublished(Boolean(p.published)); setSlug(p.slug ?? null); setUndoStack([]);
    setMessage("เปิดโปรเจกต์: " + p.title); setError(""); loadVersions(p.id);
  }

  function restoreVersion(v: Version) {
    setUndoStack((s) => [...s.slice(-9), html]); setHtml(v.html);
    setMessage("กู้คืนเวอร์ชันเมื่อ " + new Date(v.created_at).toLocaleString("th-TH") + " แล้ว — กดบันทึกเพื่อยืนยัน");
  }

  async function deleteProject(id: string) {
    if (!confirm("ต้องการลบโปรเจกต์นี้ถาวรหรือไม่? (รวมประวัติเวอร์ชันและลิงก์ที่เผยแพร่)")) return;
    try {
      const { error } = await getSupabase().from("projects").delete().eq("id", id);
      if (error) throw error;
      if (activeId === id) newProject();
      await loadProjects(); setMessage("ลบโปรเจกต์แล้ว");
    } catch (e) { fail(e, "ลบไม่สำเร็จ"); }
  }

  function download() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `${(title || "my-website").replace(/[^a-zA-Z0-9ก-๙_-]/g, "-")}.html`; a.click(); URL.revokeObjectURL(url);
  }

  const pct = quota ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;
  const outOfQuota = quota ? quota.used >= quota.limit : false;

  return <main className="wrap">
    <header className="top"><div className="brand">✦ Web<span>Gen</span> AI</div><div className="pill">v0.3 · AI BUILDER</div></header>
    <section className="hero"><div className="eyebrow">YOUR IDEA → YOUR WEBSITE</div><h1>สร้างเว็บไซต์ด้วย<br/><span className="gradient">AI ของคุณเอง</span></h1><p>พิมพ์คำอธิบายภาษาไทย ให้ AI สร้างเว็บ สั่งแก้ต่อได้ ย้อนเวอร์ชัน และเผยแพร่เป็นลิงก์</p></section>
    <div className="layout">
      <section className="panel">
        <h2>1. บัญชีผู้ใช้</h2>
        {!configured ? <div className="error" role="alert" style={{ marginTop: 12, padding: 14, border: "1px solid #70404a", borderRadius: 12, background: "#241821", fontSize: 13 }}>
            <strong>ยังไม่ได้ตั้งค่า Supabase หรือ Gemini</strong>
            <p className="muted" style={{ margin: "8px 0" }}>กรุณาคัดลอกไฟล์ <code>.env.example</code> เป็น <code>.env.local</code> แล้วกรอกค่าต่อไปนี้ให้ครบถ้วนก่อนใช้งาน:</p>
            <ul className="muted" style={{ margin: "8px 0", paddingLeft: 22 }}>
              <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
              <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
              <li><code>GEMINI_API_KEY</code></li>
              <li><code>GEMINI_MODEL</code></li>
            </ul>
            <p className="muted" style={{ margin: "8px 0 0" }}>หากต้องการใช้งานเต็มรูปแบบ ให้เปิด Supabase Dashboard &gt; SQL Editor แล้วรันไฟล์ <code>supabase/schema.sql</code> ก่อนรีโหลดหน้าอีกครั้ง</p>
          </div>
          : loggedIn && authMode !== "reset-password" ? <div className="row"><span className="muted" style={{flex:2}}>เข้าสู่ระบบแล้ว</span><button className="btn danger" onClick={signOut}>ออกจากระบบ</button></div>
          : authMode === "reset-password" ? <>
            <label htmlFor="new-pw">รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label>
            <input id="new-pw" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password" onKeyDown={e=>{if(e.key==="Enter"&&!authBusy) updatePassword();}}/>
            <button className="btn secondary" style={{width:"100%",marginTop:10}} disabled={authBusy} onClick={updatePassword}>{authBusy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}</button>
          </>
          : <>
            <label htmlFor="em">อีเมล</label><input id="em" type="email" value={userEmail} onChange={e=>setUserEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/>
            {authMode === "signin" ? <>
              <label htmlFor="pw">รหัสผ่าน (สมัครใหม่อย่างน้อย 6 ตัว)</label><input id="pw" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="รหัสผ่าน" autoComplete="current-password" onKeyDown={e=>{ if (e.key==="Enter" && !authBusy) auth("signin"); }}/>
              <div className="row" style={{marginTop:10}}><button className="btn secondary" disabled={authBusy} onClick={()=>auth("signin")}>{authBusy ? "กำลังดำเนินการ..." : "เข้าสู่ระบบ"}</button><button className="btn secondary" disabled={authBusy} onClick={()=>auth("signup")}>สมัครบัญชี</button></div>
              <button className="btn secondary" style={{width:"100%",marginTop:8}} disabled={authBusy} onClick={()=>{setAuthMode("reset-request");setError("");setMessage("");}}>ลืมรหัสผ่าน?</button>
              {confirmationNeeded && <button className="btn secondary" style={{width:"100%",marginTop:8}} disabled={authBusy} onClick={resendConfirmation}>ส่งอีเมลยืนยันซ้ำ</button>}
            </> : <>
              <p className="muted">กรอกอีเมลเพื่อรับลิงก์ตั้งรหัสผ่านใหม่</p>
              <button className="btn secondary" style={{width:"100%",marginTop:8}} disabled={authBusy} onClick={requestPasswordReset}>{authBusy ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่าน"}</button>
              <button className="btn secondary" style={{width:"100%",marginTop:8}} disabled={authBusy} onClick={()=>{setAuthMode("signin");setError("");setMessage("");}}>กลับไปเข้าสู่ระบบ</button>
            </>}
          </>}
        <div className="status" role="status">{message}</div>
        {quota && <div className="quota">โควตา AI วันนี้ (24 ชม.): <b>{quota.used}/{quota.limit}</b><div className="bar"><i style={{width:pct+"%"}}/></div></div>}

        <label htmlFor="ti">2. ชื่อโปรเจกต์ {dirty && <span className="dirty">● ยังไม่บันทึก</span>}</label>
        <input id="ti" value={title} onChange={e=>setTitle(e.target.value)} placeholder="ชื่อเว็บไซต์" maxLength={100}/>
        <label>ประเภทเว็บไซต์</label>
        <div className="chips">
          <button className={"chip"+(siteType==="auto"?" active":"")} onClick={()=>setSiteType("auto")}>✦ ให้ AI วิเคราะห์<small>เลือกประเภทและส่วนต่างๆ จากข้อมูลที่ให้</small></button>
          {SITE_TYPES.map(t=><button key={t.id} className={"chip"+(siteType===t.id?" active":"")} onClick={()=>setSiteType(t.id)}>{t.icon} {t.name}<small>{t.hint}</small></button>)}
          <button className={"chip"+(siteType==="custom"?" active":"")} onClick={()=>setSiteType("custom")}>＋ ระบุประเภทเอง</button>
        </div>
        {siteType==="custom" && <input aria-label="ประเภทเว็บไซต์ที่ต้องการ" value={customSiteType} onChange={e=>setCustomSiteType(e.target.value)} maxLength={120} placeholder="เช่น เว็บคอร์สเรียนภาษาออนไลน์"/>}
        <label>ธีมสี</label>
        <div className="chips">
          {THEMES.map(t=><button key={t.id} className={"chip"+(theme===t.id?" active":"")} onClick={()=>setTheme(t.id)}>{t.icon} {t.name}</button>)}
          <button className={"chip"+(theme==="custom"?" active":"")} onClick={()=>setTheme("custom")}>🎨 เลือกสีเอง</button>
        </div>
        {theme==="custom" && <div className="row" style={{marginTop:8}}><label htmlFor="brand-color" style={{margin:0,alignSelf:"center"}}>สีหลักของแบรนด์</label><input id="brand-color" aria-label="เลือกสีหลักของเว็บไซต์" type="color" value={customColor} onChange={e=>setCustomColor(e.target.value)} style={{width:56,height:42,padding:4,flex:"0 0 56px"}}/><span className="muted">{customColor.toUpperCase()}</span></div>}
        <label htmlFor="pr">อธิบายเว็บไซต์ที่ต้องการ</label>
        <textarea id="pr" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={5000} placeholder="เช่น ร้านกาแฟในเชียงใหม่ มีเมนู ภาพบรรยากาศ แผนที่ และเวลาเปิด-ปิด..."/>
        <button className="btn primary" disabled={busy || !loggedIn || outOfQuota} onClick={generate}>{busy ? "กำลังทำงาน..." : !loggedIn ? "เข้าสู่ระบบเพื่อสร้างด้วย AI" : outOfQuota ? "ใช้โควตาครบแล้ว" : "✦ สร้างเว็บด้วย AI"}</button>

        <div className="box">
          <h3>✎ สั่ง AI แก้เว็บปัจจุบัน</h3>
          <textarea style={{minHeight:70}} value={editText} onChange={e=>setEditText(e.target.value)} maxLength={3000} placeholder="เช่น เปลี่ยนสีปุ่มเป็นเขียว, เพิ่มส่วนคำถามที่พบบ่อย, ทำให้ฟอนต์หัวข้อใหญ่ขึ้น"/>
          <div className="row" style={{marginTop:8}}>
            <button className="btn secondary" disabled={busy || !loggedIn || outOfQuota || editText.trim().length < 4} onClick={editWithAI}>ส่งคำสั่งแก้ไข</button>
            <button className="btn secondary" disabled={!undoStack.length} onClick={undo} title="ย้อนกลับการเปลี่ยนแปลงล่าสุด">↩︎ ย้อนกลับ ({undoStack.length})</button>
          </div>
        </div>

        <div className="row" style={{marginTop:12}}>
          <button className="btn secondary" disabled={!loggedIn || saving} onClick={()=>saveProject()}>{saving ? "กำลังบันทึก..." : "💾 บันทึก"}</button>
          <button className="btn secondary" onClick={download}>⬇ ดาวน์โหลด</button>
          <button className="btn secondary" onClick={newProject}>＋ ใหม่</button>
        </div>
        {error && <p className="error" role="alert" style={{marginTop:12}}>{error}</p>}

        {activeId && <div className="box">
          <h3><span className="dot" style={{background:published?"#6de7d1":"#5b6685"}}/>เผยแพร่เว็บไซต์</h3>
          <p className="muted" style={{margin:0}}>{published ? "เว็บนี้เปิดให้ทุกคนที่มีลิงก์เข้าชมได้" : "ตอนนี้เป็นส่วนตัว มีแค่คุณที่เห็น"}</p>
          {published && publicUrl && <div className="linkrow"><input readOnly value={publicUrl} onFocus={e=>e.currentTarget.select()} aria-label="ลิงก์เว็บไซต์"/><button className="btn secondary" onClick={copyLink}>{copied ? "คัดลอกแล้ว" : "คัดลอก"}</button><a className="btn secondary" href={publicUrl} target="_blank" rel="noreferrer" style={{textDecoration:"none"}}>เปิด</a></div>}
          <button className={"btn "+(published?"danger":"secondary")} style={{marginTop:10,width:"100%"}} onClick={togglePublish}>{published ? "ยกเลิกการเผยแพร่" : "🌐 เผยแพร่เป็นลิงก์"}</button>
        </div>}

        {activeId && <div className="box">
          <h3>🕘 ประวัติเวอร์ชัน</h3>
          {versions.length === 0 ? <p className="muted" style={{margin:0}}>ยังไม่มีเวอร์ชัน — ทุกครั้งที่กดบันทึกจะเก็บสำเนาไว้ (สูงสุด {MAX_VERSIONS})</p>
            : <div className="versions">{versions.map(v=><div className="version" key={v.id}><span>{new Date(v.created_at).toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"})} · {v.label}</span><button onClick={()=>restoreVersion(v)}>กู้คืน</button></div>)}</div>}
        </div>}
      </section>

      <section className="panel">
        <div className="tabs">
          <button className={"tab"+(tab==="preview"?" active":"")} onClick={()=>setTab("preview")}>👁 พรีวิว</button>
          <button className={"tab"+(tab==="code"?" active":"")} onClick={()=>setTab("code")}>{"</>"} โค้ด</button>
          <span className="spacer"/>
          {tab==="preview" && (Object.keys(DEVICES) as Device[]).map(d=><button key={d} className={"tab"+(device===d?" active":"")} onClick={()=>setDevice(d)}>{DEVICES[d].label}</button>)}
        </div>
        {tab==="preview"
          ? <div className="stage"><iframe className="preview" title="Website preview" sandbox="allow-forms allow-scripts" srcDoc={srcDoc} style={{width: DEVICES[device].w || "100%"}}/></div>
          : <textarea className="code" spellCheck={false} value={html} onChange={e=>setHtml(e.target.value)} aria-label="แก้ไขโค้ด HTML"/>}
        <p className="muted" style={{marginTop:8}}>พรีวิวทำงานในกรอบแยกที่บล็อกการเชื่อมต่อออกนอกหน้า · {Math.round(html.length/1024)} KB</p>

        <h2 style={{marginTop:20}}>โปรเจกต์ที่บันทึกไว้</h2>
        {!loggedIn && <p className="muted">เข้าสู่ระบบเพื่อดูรายการโปรเจกต์ของคุณ</p>}
        {loggedIn && projects.length === 0 && <p className="muted">ยังไม่มีโปรเจกต์ที่บันทึก</p>}
        <div className="projects">{projects.map(p=><div className="project" key={p.id} style={p.id===activeId?{borderColor:"#9d8cff"}:undefined}><button className="project-name" onClick={()=>openProject(p)}>{p.published && <span className="dot" title="เผยแพร่แล้ว"/>}{p.title}</button><button onClick={()=>deleteProject(p.id)}>ลบ</button></div>)}</div>
      </section>
    </div>
    <div className="footer">WebGen AI v0.3 · Next.js + Supabase + Gemini<br/>HTML ที่ AI สร้างอาจมีข้อผิดพลาด ตรวจสอบก่อนเผยแพร่เสมอ</div>
  </main>;
}
