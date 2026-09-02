-- =====================================================================
-- Lectio — RPCs for joining classrooms and reading leaderboards
--
-- These are SECURITY DEFINER on purpose. Two cases need to see past RLS:
--
--   1. A student joining by code cannot SELECT the classroom yet — they
--      are not a member, so RLS correctly hides it. join_classroom()
--      resolves the code on their behalf and inserts the membership.
--
--   2. A leaderboard needs one row per classmate. Granting students
--      SELECT on each other's study_sessions would expose every raw row.
--      Instead these functions return aggregates plus a display name, and
--      only after confirming the caller belongs to the classroom.
--
-- Every function re-checks the caller's membership itself. Do not remove
-- those guards: without them SECURITY DEFINER would expose all data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- join_classroom: a student redeems a join code
-- ---------------------------------------------------------------------
create or replace function public.join_classroom(code text)
returns table (classroom_id uuid, classroom_name text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target public.classrooms%rowtype;
  caller_role text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a classroom.'
      using errcode = '28000';
  end if;

  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is distinct from 'student' then
    raise exception 'Only student accounts can join a classroom.'
      using errcode = '42501';
  end if;

  select * into target
  from public.classrooms c
  where c.join_code = upper(trim(code)) and c.archived = false;

  if not found then
    raise exception 'That join code does not match an active classroom.'
      using errcode = 'P0002';
  end if;

  insert into public.classroom_members (classroom_id, student_id)
  values (target.id, auth.uid())
  on conflict do nothing;

  return query select target.id, target.name;
end;
$$;

-- ---------------------------------------------------------------------
-- classroom_leaderboard
--
-- One row per student in the classroom. `since` narrows the window
-- (pass null for all time). Accuracy counts auto-graded and self-graded
-- work together, but the components are returned separately so the UI can
-- always show what a score is made of.
-- ---------------------------------------------------------------------
create or replace function public.classroom_leaderboard(cid uuid, since date default null)
returns table (
  student_id     uuid,
  display_name   text,
  total_seconds  bigint,
  auto_correct   numeric,
  auto_total     numeric,
  self_correct   numeric,
  self_total     numeric,
  overall_correct numeric,
  overall_total   numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_classroom_member(cid) or public.is_classroom_teacher(cid)) then
    raise exception 'You do not have access to that classroom.'
      using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.display_name,
    coalesce(t.total_seconds, 0)::bigint,
    coalesce(a.auto_correct, 0)::numeric,
    coalesce(a.auto_total, 0)::numeric,
    coalesce(a.self_correct, 0)::numeric,
    coalesce(a.self_total, 0)::numeric,
    (coalesce(a.auto_correct, 0) + coalesce(a.self_correct, 0))::numeric,
    (coalesce(a.auto_total, 0) + coalesce(a.self_total, 0))::numeric
  from public.classroom_members m
  join public.profiles p on p.id = m.student_id
  left join lateral (
    select sum(s.seconds) as total_seconds
    from public.study_sessions s
    where s.student_id = m.student_id
      and (since is null or s.day >= since)
  ) t on true
  left join lateral (
    select
      sum(case when st.source = 'auto' then st.correct else 0 end) as auto_correct,
      sum(case when st.source = 'auto' then st.total   else 0 end) as auto_total,
      sum(case when st.source = 'self' then st.correct else 0 end) as self_correct,
      sum(case when st.source = 'self' then st.total   else 0 end) as self_total
    from public.activity_stats st
    where st.student_id = m.student_id
      and (since is null or st.day >= since)
  ) a on true
  where m.classroom_id = cid;
end;
$$;

-- ---------------------------------------------------------------------
-- classroom_section_time
--
-- Per-student, per-section totals. Powers the teacher's view of progress
-- against assignments (which are expressed in minutes per section).
-- ---------------------------------------------------------------------
create or replace function public.classroom_section_time(cid uuid, since date default null)
returns table (
  student_id uuid,
  section    text,
  seconds    bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_classroom_member(cid) or public.is_classroom_teacher(cid)) then
    raise exception 'You do not have access to that classroom.'
      using errcode = '42501';
  end if;

  return query
  select s.student_id, s.section, sum(s.seconds)::bigint
  from public.study_sessions s
  join public.classroom_members m
    on m.student_id = s.student_id and m.classroom_id = cid
  where (since is null or s.day >= since)
  group by s.student_id, s.section;
end;
$$;

-- ---------------------------------------------------------------------
-- create_classroom: a teacher creates a classroom with a generated code
-- ---------------------------------------------------------------------
create or replace function public.create_classroom(name text, exam_date date default null)
returns public.classrooms
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller_role text;
  created public.classrooms%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is distinct from 'teacher' then
    raise exception 'Only teacher accounts can create a classroom.'
      using errcode = '42501';
  end if;

  insert into public.classrooms (teacher_id, name, join_code, exam_date)
  values (auth.uid(), trim(name), public.generate_join_code(), exam_date)
  returning * into created;

  return created;
end;
$$;
