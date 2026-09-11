-- =====================================================================
-- Lectio — cloud sync for a signed-in student's local progress
--
-- Everything a student does — Reading Room highlights and notes, the
-- vocabulary SM-2 deck, quiz/translation/scansion/exam history, the study
-- plan, the streak calendar — lives in the browser's own localStorage, the
-- same way it always has in solo mode. That is fast and works offline, but
-- it is also why signing in on a second device used to show none of it:
-- the data never left the first browser.
--
-- This table is that data's cloud copy: one JSONB row per signed-in user,
-- shaped exactly like the JSON this app already produces for Settings'
-- "export a backup" feature (see `getSyncableData` in src/store/useStore.ts
-- — this is the same field list, not a second copy of it). The client
-- pulls this row on sign-in, merges it additively with whatever is already
-- on the device (see src/lib/mergeProgress.ts — annotations, vocab
-- history, quiz attempts and the rest are unioned rather than one side
-- overwriting the other), and pushes the merged result back up.
-- `updated_at` is how a session tells whether the cloud holds something it
-- has not already incorporated.
--
-- Deliberately owner-only: unlike study_sessions/activity_stats (which
-- exist specifically to feed a teacher's roster and leaderboard), this
-- table holds a student's own highlights, notes and drafts — private study
-- material a teacher has no more business reading here than in the
-- student's own browser. No teacher-read policy exists, and none should.
-- =====================================================================

create table if not exists public.user_progress (
  user_id    uuid primary key references public.profiles(id) on delete cascade default auth.uid(),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

create policy "progress: manage own"
  on public.user_progress for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Realtime lets a session already open on one device notice, within
-- seconds, that another device just pushed — see the postgres_changes
-- subscription in useCloudSync. Best-effort: a self-hosted project may not
-- run the default `supabase_realtime` publication this statement targets,
-- and losing this costs only the live-refresh nicety — the periodic and
-- focus-triggered pulls in the same hook still catch up within a couple
-- of minutes regardless.
do $$
begin
  execute 'alter publication supabase_realtime add table public.user_progress';
exception when others then
  raise notice 'Skipping supabase_realtime registration for user_progress: %', sqlerrm;
end $$;
