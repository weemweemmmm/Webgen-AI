-- WebGen AI v0.3 — รันใน Supabase Dashboard > SQL Editor (รันซ้ำได้ ปลอดภัย)

-- ───────── projects ─────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'เว็บไซต์ไม่มีชื่อ',
  prompt text not null,
  html text not null,
  published boolean not null default false,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- สำหรับผู้ที่ใช้ schema v0.2 อยู่แล้ว
alter table public.projects add column if not exists published boolean not null default false;
alter table public.projects add column if not exists slug text unique;

create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Users can read their own projects" on public.projects;
create policy "Users can read their own projects" on public.projects for select
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read published projects" on public.projects;
create policy "Anyone can read published projects" on public.projects for select
  using (published = true);

drop policy if exists "Users can insert their own projects" on public.projects;
create policy "Users can insert their own projects" on public.projects for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects" on public.projects for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects" on public.projects for delete
  using (auth.uid() = user_id);

-- ───────── project_versions (ประวัติเวอร์ชัน) ─────────
create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default '',
  html text not null,
  created_at timestamptz not null default now()
);
create index if not exists project_versions_project_idx on public.project_versions (project_id, created_at desc);

alter table public.project_versions enable row level security;

drop policy if exists "Users read own versions" on public.project_versions;
create policy "Users read own versions" on public.project_versions for select using (auth.uid() = user_id);
drop policy if exists "Users insert own versions" on public.project_versions;
create policy "Users insert own versions" on public.project_versions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );
drop policy if exists "Users delete own versions" on public.project_versions;
create policy "Users delete own versions" on public.project_versions for delete using (auth.uid() = user_id);

-- ───────── generation_log (โควตาการสร้างต่อวัน) ─────────
create table if not exists public.generation_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'create',
  created_at timestamptz not null default now()
);
create index if not exists generation_log_user_time_idx on public.generation_log (user_id, created_at desc);

alter table public.generation_log enable row level security;

drop policy if exists "Users read own log" on public.generation_log;
create policy "Users read own log" on public.generation_log for select using (auth.uid() = user_id);
drop policy if exists "Users insert own log" on public.generation_log;
create policy "Users insert own log" on public.generation_log for insert with check (auth.uid() = user_id);
-- ไม่มี update/delete policy: ผู้ใช้แก้ไขหรือลบ log เพื่อเลี่ยงโควตาไม่ได้

-- หมายเหตุ: ห้ามใช้ service_role key ในโค้ดฝั่ง browser
-- หมายเหตุ: log ถูก insert ด้วย token ของผู้ใช้เอง ผู้ใช้ที่เขียนสคริปต์เองอาจ insert เพิ่มได้ แต่ไม่ได้ช่วยเลี่ยงโควตา
--          (การนับมาจากแถวที่มี ไม่ใช่ตัวเลขที่ผู้ใช้ส่งมา)
