-- =====================================================================
-- Lectio — initial schema
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- on a fresh project, or via `supabase db push` if you use the CLI.
--
-- Design notes:
--   * Row-level security is on for every table. Access rules live in the
--     database, not in application code, so a mistake in a query cannot
--     leak another classroom's student data.
--   * Students see their own rows. Teachers see rows belonging to students
--     in classrooms they own. Nobody sees anything else.
--   * Leaderboards deliberately do NOT grant students read access to each
--     other's raw rows. They go through security-definer functions that
--     return aggregates and display names only (see 0002).
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: one row per auth user, carrying the role
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  role         text not null check (role in ('student', 'teacher')),
  display_name text not null check (length(trim(display_name)) between 1 and 60),
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: insert own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- classrooms: owned by a teacher, joined via a short code
-- ---------------------------------------------------------------------
create table if not exists public.classrooms (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 80),
  join_code  text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  exam_date  date,
  archived   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists classrooms_teacher_idx on public.classrooms(teacher_id);

alter table public.classrooms enable row level security;

-- ---------------------------------------------------------------------
-- classroom_members: which students are in which classroom
-- ---------------------------------------------------------------------
create table if not exists public.classroom_members (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (classroom_id, student_id)
);

create index if not exists classroom_members_student_idx on public.classroom_members(student_id);

alter table public.classroom_members enable row level security;

-- Helper: does the current user teach this classroom?
-- SECURITY DEFINER so the policies below can consult classrooms without
-- recursing back through classroom RLS.
create or replace function public.is_classroom_teacher(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = cid and c.teacher_id = auth.uid()
  );
$$;

-- Helper: is the current user a student in this classroom?
create or replace function public.is_classroom_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classroom_members m
    where m.classroom_id = cid and m.student_id = auth.uid()
  );
$$;

-- Classrooms: a teacher manages their own; a member can read theirs.
create policy "classrooms: teacher manages own"
  on public.classrooms for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "classrooms: member reads"
  on public.classrooms for select
  using (public.is_classroom_member(id));

-- Members: students see their own memberships and their classmates';
-- teachers see the roster of classrooms they own.
create policy "members: student reads own"
  on public.classroom_members for select
  using (student_id = auth.uid() or public.is_classroom_member(classroom_id));

create policy "members: teacher reads roster"
  on public.classroom_members for select
  using (public.is_classroom_teacher(classroom_id));

create policy "members: student joins self"
  on public.classroom_members for insert
  with check (student_id = auth.uid());

create policy "members: student leaves self"
  on public.classroom_members for delete
  using (student_id = auth.uid() or public.is_classroom_teacher(classroom_id));

-- ---------------------------------------------------------------------
-- assignments: target minutes on a section of the app
-- ---------------------------------------------------------------------
create table if not exists public.assignments (
  id             uuid primary key default gen_random_uuid(),
  classroom_id   uuid not null references public.classrooms(id) on delete cascade,
  section        text not null check (section in (
                   'read', 'translate', 'sight', 'quiz', 'vocab', 'grammar',
                   'scansion', 'devices', 'context', 'frq', 'exam', 'plan'
                 )),
  target_minutes int not null check (target_minutes between 1 and 10000),
  due_date       date,
  note           text check (note is null or length(note) <= 500),
  created_at     timestamptz not null default now()
);

create index if not exists assignments_classroom_idx on public.assignments(classroom_id);

alter table public.assignments enable row level security;

create policy "assignments: teacher manages"
  on public.assignments for all
  using (public.is_classroom_teacher(classroom_id))
  with check (public.is_classroom_teacher(classroom_id));

create policy "assignments: member reads"
  on public.assignments for select
  using (public.is_classroom_member(classroom_id));

-- ---------------------------------------------------------------------
-- study_sessions: seconds of active study, per student / section / day
-- Upserted from the client heartbeat; one row per bucket keeps it small.
-- ---------------------------------------------------------------------
create table if not exists public.study_sessions (
  student_id uuid not null references public.profiles(id) on delete cascade,
  section    text not null,
  day        date not null,
  seconds    int  not null default 0 check (seconds >= 0 and seconds <= 86400),
  updated_at timestamptz not null default now(),
  primary key (student_id, section, day)
);

create index if not exists study_sessions_day_idx on public.study_sessions(day);

alter table public.study_sessions enable row level security;

-- Helper: does the current user teach any classroom this student belongs to?
create or replace function public.teaches_student(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classroom_members m
    join public.classrooms c on c.id = m.classroom_id
    where m.student_id = sid and c.teacher_id = auth.uid()
  );
$$;

create policy "study: student manages own"
  on public.study_sessions for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "study: teacher reads students"
  on public.study_sessions for select
  using (public.teaches_student(student_id));

-- ---------------------------------------------------------------------
-- activity_stats: correct/total per student / day / grading source.
--
-- `source` keeps auto-graded and self-graded work separable. The accuracy
-- leaderboard counts both (a deliberate product choice), but the split is
-- preserved so a teacher can always see what a score is made of.
-- ---------------------------------------------------------------------
create table if not exists public.activity_stats (
  student_id uuid not null references public.profiles(id) on delete cascade,
  day        date not null,
  source     text not null check (source in ('auto', 'self')),
  correct    numeric(10,2) not null default 0 check (correct >= 0),
  total      numeric(10,2) not null default 0 check (total >= 0),
  updated_at timestamptz not null default now(),
  primary key (student_id, day, source),
  constraint activity_stats_correct_lte_total check (correct <= total)
);

create index if not exists activity_stats_day_idx on public.activity_stats(day);

alter table public.activity_stats enable row level security;

create policy "stats: student manages own"
  on public.activity_stats for all
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "stats: teacher reads students"
  on public.activity_stats for select
  using (public.teaches_student(student_id));

-- ---------------------------------------------------------------------
-- Join-code generation: 6 chars, no vowels or look-alikes (0/O, 1/I/L),
-- so a code read aloud in a classroom is unambiguous.
-- ---------------------------------------------------------------------
create or replace function public.generate_join_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '23456789BCDFGHJKMNPQRSTVWXYZ';
  candidate text;
  i int;
begin
  loop
    candidate := '';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.classrooms where join_code = candidate);
  end loop;
  return candidate;
end;
$$;
