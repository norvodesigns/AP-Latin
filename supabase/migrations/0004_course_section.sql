-- Lets teachers assign time in the course (/learn), the leveled lessons from
-- the first day of Latin to AP. Study time there is already recorded (the
-- study_sessions.section column has no check); only assignments list their
-- sections. After applying this, add 'learn' to ASSIGNABLE_SECTIONS in
-- src/lib/supabase/types.ts.

alter table public.assignments drop constraint if exists assignments_section_check;
alter table public.assignments add constraint assignments_section_check check (section in (
  'read', 'translate', 'sight', 'quiz', 'vocab', 'grammar',
  'scansion', 'devices', 'context', 'frq', 'exam', 'plan', 'learn'
));
