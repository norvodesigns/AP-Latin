-- =====================================================================
-- Lectio — atomic sync RPCs for time tracking and graded-work stats
--
-- study_sessions and activity_stats are both "one row per bucket, summed
-- over the day" tables. A client flushing periodically needs to add to
-- that day's total, not overwrite it — and two tabs open at once must not
-- lose one tab's update to the other's. A read-then-write from the client
-- races; these functions increment atomically inside a single statement
-- instead.
--
-- Neither needs SECURITY DEFINER: the existing RLS policies on both tables
-- already grant a student full access to their own rows ("for all using
-- (student_id = auth.uid())"), so running as the caller (the default) is
-- sufficient and keeps the security boundary in one place.
-- =====================================================================

create or replace function public.bump_study_seconds(p_section text, p_day date, p_delta int)
returns void
language plpgsql
volatile
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  if p_delta <= 0 then
    return;
  end if;

  insert into public.study_sessions (student_id, section, day, seconds)
  values (auth.uid(), p_section, p_day, least(p_delta, 86400))
  on conflict (student_id, section, day)
  do update set
    seconds = least(public.study_sessions.seconds + excluded.seconds, 86400),
    updated_at = now();
end;
$$;

create or replace function public.bump_activity_stats(p_day date, p_source text, p_correct numeric, p_total numeric)
returns void
language plpgsql
volatile
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  if p_source not in ('auto', 'self') then
    raise exception 'Invalid grading source.' using errcode = '22023';
  end if;
  if p_total <= 0 then
    return;
  end if;

  insert into public.activity_stats (student_id, day, source, correct, total)
  values (auth.uid(), p_day, p_source, greatest(p_correct, 0), p_total)
  on conflict (student_id, day, source)
  do update set
    correct    = public.activity_stats.correct + excluded.correct,
    total      = public.activity_stats.total + excluded.total,
    updated_at = now();
end;
$$;
