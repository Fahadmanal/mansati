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

-- ===== نظام شواهد الأداء الوظيفي للمعلم =====

-- المعايير الرسمية الـ 11 وأوزانها — بذور أولية (seed).
-- ثابتة رسمياً ومقفلة عن التعديل في الواجهة (الأوزان والعدد لا يتغيّران).
create table if not exists public.criteria (
  id smallint primary key,          -- 1..11
  sort_order smallint not null,
  title text not null,
  weight smallint not null           -- الوزن ٪
);

insert into public.criteria (id, sort_order, title, weight) values
  (1, 1, 'أداء الواجبات الوظيفية', 10),
  (2, 2, 'التفاعل مع المجتمع المهني', 10),
  (3, 3, 'التفاعل مع أولياء الأمور', 10),
  (4, 4, 'التنويع في استراتيجيات التدريس', 10),
  (5, 5, 'تحسين نتائج المتعلمين', 10),
  (6, 6, 'إعداد وتنفيذ خطة التعلم', 10),
  (7, 7, 'توظيف تقنيات ووسائل التعلم المناسبة', 10),
  (8, 8, 'تهيئة البيئة التعليمية', 5),
  (9, 9, 'الإدارة الصفية', 5),
  (10, 10, 'تحليل نتائج المتعلمين وتشخيص مستوياتهم', 10),
  (11, 11, 'تنوع أساليب التقويم', 10)
on conflict (id) do update
  set sort_order = excluded.sort_order, title = excluded.title, weight = excluded.weight;

-- قوالب/أمثلة الشواهد تحت كل معيار — قابلة للتطوير لاحقاً من لوحة المسؤول.
create table if not exists public.criterion_templates (
  id bigint generated always as identity primary key,
  criterion_id smallint not null references public.criteria(id) on delete cascade,
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.criterion_templates (criterion_id, label) values
  (1,'جدول الحصص'),(1,'تكليفات'),(1,'سجل الانضباط'),(1,'تنفيذ المناوبة'),(1,'الالتزام بالتعاميم'),
  (2,'مجتمعات تعلم مهنية'),(2,'تبادل زيارات'),(2,'ورشة داخلية'),(2,'اجتماع قسم'),(2,'مشاركة خبرة'),
  (3,'سجل تواصل'),(3,'رسائل متابعة'),(3,'اجتماع ولي أمر'),(3,'خطة متابعة طالب متعثر'),
  (4,'تعلم تعاوني'),(4,'عصف ذهني'),(4,'تعلم باللعب'),(4,'خرائط مفاهيم'),(4,'صور من الحصة'),
  (5,'قياس قبلي وبعدي'),(5,'خطة علاجية'),(5,'مقارنة نتائج'),(5,'معالجة فاقد تعليمي'),
  (6,'خطة فصلية'),(6,'تحضير درس'),(6,'توزيع منهج'),(6,'أهداف تعلم'),(6,'خطة علاجية'),
  (7,'Wordwall'),(7,'Kahoot'),(7,'Forms'),(7,'منصة مدرستي'),(7,'اختبار إلكتروني'),(7,'عرض تفاعلي'),
  (8,'تنظيم الفصل'),(8,'لوحات تعليمية'),(8,'قواعد صفية'),(8,'صور بيئة التعلم'),
  (9,'قواعد إدارة الصف'),(9,'سجل متابعة'),(9,'بطاقات تعزيز'),(9,'توزيع مجموعات'),
  (10,'تحليل اختبار'),(10,'Excel'),(10,'تصنيف مستويات الطلاب'),(10,'توصيات علاجية'),
  (11,'اختبار قصير'),(11,'شفهي'),(11,'بطاقة ملاحظة'),(11,'Rubric'),(11,'مشروع'),(11,'واجب'),(11,'تذكرة خروج')
on conflict do nothing;

-- المدارس (يرتبط بها المدير والمعلم؛ المدير يرى معلمي مدرسته فقط)
create table if not exists public.schools (
  id bigint primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- مديرو المدارس (دور جديد يراجع الشواهد ويعتمدها)
create table if not exists public.managers (
  id bigint primary key,
  name text not null,
  email text,
  username text unique,
  password text not null,
  school_id bigint references public.schools(id),
  school_name text not null default '',
  created_at timestamptz not null default now()
);

-- شواهد الأداء الوظيفي مرتبطة بأحد المعايير الـ 11
create table if not exists public.evidences (
  id bigint primary key,
  teacher_id bigint not null default 1,
  school_id bigint references public.schools(id),
  criterion_id smallint not null references public.criteria(id),
  title text not null,
  description text default '',
  evidence_date date,
  evidence_type text not null default 'file'
    check (evidence_type in ('image','pdf','link','word','excel','report','form','equiz','activity')),
  file_url text default '',                 -- رابط خارجي أو رابط عام من Supabase Storage
  storage_path text default '',             -- مسار المرفق داخل bucket (school_id/teacher_id/evidence_id/file)
  impact_note text default '',              -- أثر الشاهد على التعلم أو الأداء
  status text not null default 'draft'
    check (status in ('draft','submitted','approved','needs_edit','rejected')),
  manager_note text default '',             -- ملاحظة المدير على الشاهد
  reviewed_by bigint,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidences_teacher_idx on public.evidences (teacher_id);
create index if not exists evidences_school_idx on public.evidences (school_id);
create index if not exists evidences_criterion_idx on public.evidences (criterion_id);

alter table public.criteria enable row level security;
alter table public.criterion_templates enable row level security;
alter table public.schools enable row level security;
alter table public.managers enable row level security;
alter table public.evidences enable row level security;

drop policy if exists "public read criteria" on public.criteria;
drop policy if exists "public read templates" on public.criterion_templates;
drop policy if exists "public write templates" on public.criterion_templates;
drop policy if exists "public read schools" on public.schools;
drop policy if exists "public write schools" on public.schools;
drop policy if exists "public read managers" on public.managers;
drop policy if exists "public write managers" on public.managers;
drop policy if exists "public read evidences" on public.evidences;
drop policy if exists "public write evidences" on public.evidences;

-- المعايير للقراءة فقط (رسمية ومقفلة). القوالب قابلة للكتابة.
create policy "public read criteria" on public.criteria for select using (true);
create policy "public read templates" on public.criterion_templates for select using (true);
create policy "public write templates" on public.criterion_templates for all using (true) with check (true);
create policy "public read schools" on public.schools for select using (true);
create policy "public write schools" on public.schools for all using (true) with check (true);
create policy "public read managers" on public.managers for select using (true);
create policy "public write managers" on public.managers for all using (true) with check (true);
create policy "public read evidences" on public.evidences for select using (true);
create policy "public write evidences" on public.evidences for all using (true) with check (true);

-- ربط المعلم بمدرسته (للفلترة في لوحة المدير)
alter table public.classes add column if not exists school text default '';

-- ===== تخزين مرفقات الشواهد =====
-- Bucket عام لمرفقات الشواهد. المسار: school_id/teacher_id/evidence_id/file-name
-- الأنواع المسموحة: JPG, PNG, WEBP (صور) — PDF, DOCX, XLSX (ملفات).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence-attachments',
  'evidence-attachments',
  true,
  15728640, -- 15MB
  array[
    'image/jpeg','image/png','image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "evidence read" on storage.objects;
drop policy if exists "evidence write" on storage.objects;
create policy "evidence read" on storage.objects
  for select using (bucket_id = 'evidence-attachments');
create policy "evidence write" on storage.objects
  for all using (bucket_id = 'evidence-attachments') with check (bucket_id = 'evidence-attachments');

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
