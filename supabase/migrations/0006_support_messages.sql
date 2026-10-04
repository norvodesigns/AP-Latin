-- =====================================================================
-- Lectio — support messages
--
-- The support page's contact form (src/app/support) and the app's
-- "Report this name" on a classroom leaderboard both land here. App Review
-- asks for an easy way to reach the developer, and for apps where people
-- can see each other's names, a way to report one; this is both, without
-- putting anybody's email address on a public page.
--
-- Write-only from outside: anyone may add a message (signed in or not),
-- nobody can read, change or delete one through the API. The owner reads
-- them in the Supabase dashboard (Table Editor › support_messages), which
-- uses the service role and so is not bound by these policies.
--
-- A message is not tied to an account: `reply_to` is whatever address the
-- sender chose to give, and nothing else identifies them. Delete a row once
-- it's dealt with.
-- =====================================================================

create table if not exists public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic      text not null check (topic in ('question', 'mistake', 'bug', 'account', 'report', 'other')),
  message    text not null check (length(trim(message)) between 1 and 4000),
  reply_to   text check (reply_to is null or length(reply_to) <= 200),
  context    text check (context is null or length(context) <= 500),
  platform   text check (platform is null or platform in ('web', 'ios'))
);

alter table public.support_messages enable row level security;

create policy "support: anyone may write"
  on public.support_messages for insert
  to anon, authenticated
  with check (true);
