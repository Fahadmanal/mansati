-- Run this in Supabase SQL Editor once.

create table if not exists public.classes (
  id bigint primary key,
  name text not null,
  subject text default '',
  code text not null unique,
  teacher_id bigint not null default 1,
  student_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tests (
  id bigint primary key,
  class_id bigint not null references public.classes(id) on delete cascade,
  title text not null,
  type text not null,
  duration integer not null default 0,
  questions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  teacher_id bigint not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id bigint generated always as identity primary key,
  class_id bigint not null references public.classes(id) on delete cascade,
  name text not null,
  added_at timestamptz not null default now(),
  unique (class_id, name)
);

create table if not exists public.results (
  id bigint generated always as identity primary key,
  student_name text not null,
  class_id bigint not null references public.classes(id) on delete cascade,
  test_id bigint not null references public.tests(id) on delete cascade,
  score integer not null default 0,
  correct integer not null default 0,
  total integer not null default 0,
  total_questions integer not null default 0,
  needs_manual_review boolean not null default false,
  type text not null,
  duration_text text not null default '—',
  date_text text not null default '',
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.classes enable row level security;
alter table public.tests enable row level security;
alter table public.students enable row level security;
alter table public.results enable row level security;

drop policy if exists "public read classes" on public.classes;
drop policy if exists "public write classes" on public.classes;
drop policy if exists "public read tests" on public.tests;
drop policy if exists "public write tests" on public.tests;
drop policy if exists "public read students" on public.students;
drop policy if exists "public write students" on public.students;
drop policy if exists "public read results" on public.results;
drop policy if exists "public write results" on public.results;

create policy "public read classes" on public.classes for select using (true);
create policy "public write classes" on public.classes for all using (true) with check (true);

create policy "public read tests" on public.tests for select using (true);
create policy "public write tests" on public.tests for all using (true) with check (true);

create policy "public read students" on public.students for select using (true);
create policy "public write students" on public.students for all using (true) with check (true);

create policy "public read results" on public.results for select using (true);
create policy "public write results" on public.results for all using (true) with check (true);
