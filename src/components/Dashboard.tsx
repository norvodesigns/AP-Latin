'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  useStore,
  daysUntilExam,
  currentStreak,
  longestStreak,
  dueVocab,
  scansionStatsByLine,
  EXAM_DATE,
} from '@/store/useStore';
import { requiredPassages } from '@/data/passages';
import { coreVocabulary } from '@/data/vocabulary';
import { CalledOut, CedLink, Roman, SkillMeter, SourceNote, toRoman } from '@/components/ui';
import { useRevealChildren } from '@/hooks/useRevealChildren';
import { loadIndex } from '@/data/scansionCorpus';
import { sectionLabel } from '@/lib/nav';
import {
  recentActivity,
  sessionsRemaining,
  studyCalendar,
  vocabForecast,
  weakSpots,
  type CalendarDay,
  type WeakSpot,
} from '@/lib/progress';
import { formatDuration } from '@/lib/format';
import type { SkillCategory } from '@/data/types';
import type { UpcomingAssignment } from '@/lib/supabase/dashboard';

const SKILL_LABELS: Record<SkillCategory, string> = {
  '1': 'Read & comprehend',
  '2': 'Style & context',
  '3': 'Analyze',
};

/** CED exam weighting by skill category (pp. 227–228). */
const SKILL_WEIGHT: Record<SkillCategory, number> = { '1': 70, '2': 11, '3': 19 };

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Dashboard({
  assignments,
}: {
  /** Classroom assignments not yet met, from a server-side fetch — see the
   *  comment on getUpcomingAssignments for why this comes in as a prop
   *  rather than being fetched here (this component is client-rendered,
   *  reading everything else from localStorage). Undefined in solo mode,
   *  signed out, or when there is nothing due. */
  assignments?: UpcomingAssignment[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The scansion pool is the whole Aeneid, fetched as an index rather than
  // bundled — the ledger needs its size, not its contents.
  const [scansionTotal, setScansionTotal] = useState(0);
  useEffect(() => {
    loadIndex()
      .then((i) => setScansionTotal(i.total))
      .catch(() => {});
  }, []);

  const passages = useStore((s) => s.passages);
  const vocab = useStore((s) => s.vocab);
  const quizAttempts = useStore((s) => s.quizAttempts);
  const translationAttempts = useStore((s) => s.translationAttempts);
  const frqResponses = useStore((s) => s.frqResponses);
  const examResults = useStore((s) => s.examResults);
  const studyDays = useStore((s) => s.studyDays);
  const reviewQueue = useStore((s) => s.reviewQueue);
  const scansionAttempts = useStore((s) => s.scansionAttempts);
  const studyPlan = useStore((s) => s.studyPlan);
  const studySecondsToday = useStore((s) => s.studySecondsToday);
  const studyGoalDate = useStore((s) => s.studyGoalDate);

  const days = daysUntilExam();
  const streak = mounted ? currentStreak(studyDays) : 0;
  const best = mounted ? longestStreak(studyDays) : 0;
  const due = useMemo(() => (mounted ? dueVocab(vocab) : []), [vocab, mounted]);

  const read = useMemo(
    () => requiredPassages.filter((p) => passages[p.id]?.lastOpened).length,
    [passages],
  );

  const linesScanned = useMemo(() => {
    if (!mounted) return 0;
    let n = 0;
    for (const s of scansionStatsByLine(scansionAttempts).values()) if (s.mastered) n += 1;
    return n;
  }, [scansionAttempts, mounted]);

  /* Today's goal. `studySecondsToday` is only meaningful for the day it was
     last written on — the store rolls it over lazily, on the next tick of
     study time, so a dashboard opened first thing would otherwise show
     yesterday's total as today's progress. */
  const todaySeconds =
    mounted && studyGoalDate === new Date().toISOString().slice(0, 10) ? studySecondsToday : 0;
  const goalSeconds = studyPlan.minutesPerDay * 60;
  const goalPct = goalSeconds > 0 ? Math.min(100, Math.round((todaySeconds / goalSeconds) * 100)) : 0;

  const calendar = useMemo(
    () =>
      mounted
        ? studyCalendar(studyDays, [
            ...quizAttempts,
            ...translationAttempts,
            ...scansionAttempts,
            ...examResults,
            ...frqResponses,
          ])
        : [],
    [mounted, studyDays, quizAttempts, translationAttempts, scansionAttempts, examResults, frqResponses],
  );

  const weak = useMemo(
    () =>
      mounted ? weakSpots({ quizAttempts, translationAttempts, scansionAttempts, vocab }) : [],
    [mounted, quizAttempts, translationAttempts, scansionAttempts, vocab],
  );

  const forecast = useMemo(() => vocabForecast(mounted ? vocab : {}), [vocab, mounted]);

  const activity = useMemo(
    () =>
      mounted
        ? recentActivity({
            quizAttempts,
            translationAttempts,
            examResults,
            scansionAttempts,
            frqResponses,
          })
        : [],
    [mounted, quizAttempts, translationAttempts, examResults, scansionAttempts, frqResponses],
  );

  const sessions = mounted ? sessionsRemaining(studyPlan.activeDays, EXAM_DATE) : 0;

  const bySkill = useMemo(() => {
    const acc: Record<SkillCategory, { correct: number; total: number }> = {
      '1': { correct: 0, total: 0 },
      '2': { correct: 0, total: 0 },
      '3': { correct: 0, total: 0 },
    };
    for (const a of quizAttempts) {
      const s = acc[a.skillCategory];
      if (!s) continue;
      s.total += 1;
      if (a.correct) s.correct += 1;
    }
    return acc;
  }, [quizAttempts]);

  /* The weakest skill drives both the red meter and the study-next prompt. */
  const weakestSkill = useMemo(() => {
    const scored = (['1', '2', '3'] as SkillCategory[])
      .map((c) => ({
        c,
        pct: bySkill[c].total > 0 ? Math.round((bySkill[c].correct / bySkill[c].total) * 100) : 0,
        total: bySkill[c].total,
      }))
      .filter((s) => s.total > 0);
    if (scored.length === 0) return null;
    return scored.reduce((lo, s) => (s.pct < lo.pct ? s : lo));
  }, [bySkill]);

  const next = nextAction({
    mounted,
    read,
    dueCount: due.length,
    reviewQueue: reviewQueue.length,
    quizCount: quizAttempts.length,
    translationCount: translationAttempts.length,
    examCount: examResults.length,
    days,
    weakest: weakestSkill,
    goalMet: goalSeconds > 0 && todaySeconds >= goalSeconds,
    topWeakness: weak[0] ?? null,
  });

  const exam = new Date(EXAM_DATE + 'T00:00:00');
  const examDateLabel = exam.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const leftColumn = useRevealChildren<HTMLDivElement>();
  const rightRail = useRevealChildren<HTMLDivElement>();

  return (
    <div className="mx-auto w-full max-w-[1160px] px-5 sm:px-10">
      {/* The 1px middle column is the ruling itself — a real divider that runs
          the full height of the page rather than a border on either panel. */}
      <div className="grid lg:grid-cols-[1fr_1px_minmax(360px,430px)]">
        {/* ────────── Left ────────── */}
        {/* The dashboard lays out its own columns rather than using `Page`, so
            the entrance and scroll-reveal behaviour is attached per column —
            revealing the columns themselves would animate the layout instead
            of its contents. */}
        <div ref={leftColumn} className="flex min-w-0 flex-col gap-11 py-10 lg:py-12 lg:pr-12">
          {/* Countdown */}
          <section className="marginal">
            <div className="slab mb-4">Diēs ad exāmen · Days to the exam</div>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <div
                className="numeral"
                style={{ fontSize: 'clamp(4.5rem, 3rem + 7vw, 6.75rem)' }}
              >
                {mounted ? days : '—'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.375rem',
                  lineHeight: 1.35,
                  color: 'var(--fg-muted)',
                }}
              >
                {examDateLabel}
                <br />
                <span style={{ fontSize: '1rem', letterSpacing: '0.06em' }}>
                  Section I 8:00 · Section II 9:00
                </span>
              </div>
            </div>
            {/* The bare day count flatters. At three days a week, 120 days is
                fifty-one sessions — which is the number that should govern
                how a student paces themselves. */}
            {mounted && sessions > 0 && (
              <p
                className="measure"
                style={{
                  margin: '1.25rem 0 0',
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  lineHeight: 1.5,
                  color: 'var(--ink2)',
                }}
              >
                That is{' '}
                <strong style={{ fontWeight: 400, color: 'var(--fg)' }}>
                  {sessions} study session{sessions === 1 ? '' : 's'}
                </strong>{' '}
                at the {studyPlan.activeDays.length} day
                {studyPlan.activeDays.length === 1 ? '' : 's'} a week you have planned —{' '}
                <Link href="/plan" className="link-rule" style={{ color: 'var(--accent)' }}>
                  change that
                </Link>{' '}
                if it is not true any more.
              </p>
            )}
          </section>

          {/* Consistency. Studying at all, on most days, matters more to a
              language than any single session does — so it gets its own
              block rather than a line in the rail. */}
          <section>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <span className="rubric">Cōnstantia · the last fourteen weeks</span>
              <span
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.0625rem',
                  color: 'var(--fg-muted)',
                }}
              >
                {mounted && streak > 0 ? (
                  <>
                    {streak} day{streak === 1 ? '' : 's'} unbroken · <Roman value={streak} />
                  </>
                ) : (
                  'no streak running'
                )}
              </span>
            </div>
            <StudyGrid weeks={calendar} mounted={mounted} />
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
              <span style={{ fontSize: '0.875rem', color: 'var(--fg-faint)' }}>
                {mounted
                  ? `${studyDays.length} day${studyDays.length === 1 ? '' : 's'} studied in all · longest run ${best}`
                  : ' '}
              </span>
              <span className="flex items-center gap-2" style={{ fontSize: '0.875rem', color: 'var(--fg-faint)' }}>
                quieter
                {[0, 1, 2, 3, 4].map((l) => (
                  <span key={l} className="cal-day" data-level={l} aria-hidden="true" />
                ))}
                busier
              </span>
            </div>
          </section>

          {/* Weak spots. The meters below say how it is going; this says what
              to do about it, which is the question that changes what a
              student opens next. */}
          {mounted && weak.length > 0 && (
            <section className="border-t pt-9" style={{ borderColor: 'var(--rule)' }}>
              <div className="mb-5 flex items-baseline justify-between gap-4">
                <span className="rubric">Work on these</span>
                <span
                  className="hidden sm:inline"
                  style={{
                    fontFamily: 'var(--font-latin)',
                    fontSize: '0.9375rem',
                    color: 'var(--fg-muted)',
                  }}
                >
                  from everything you have been graded on
                </span>
              </div>
              <div className="flex flex-col">
                {weak.map((w, i) => (
                  <WeakRow key={w.id} spot={w} first={i === 0} />
                ))}
              </div>
            </section>
          )}

          {/* Mastery */}
          <section className="border-t pt-9" style={{ borderColor: 'var(--rule)' }}>
            <div className="rubric mb-6">Mastery by skill</div>
            <div className="flex flex-col gap-5">
              {(['1', '2', '3'] as SkillCategory[]).map((c) => {
                const s = bySkill[c];
                const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <SkillMeter
                    key={c}
                    label={SKILL_LABELS[c]}
                    pct={mounted ? pct : 0}
                    weak={mounted && weakestSkill?.c === c}
                  />
                );
              })}
            </div>
            <p
              className="measure mt-5"
              style={{
                margin: '1.25rem 0 0',
                fontFamily: 'var(--font-latin)',
                fontSize: '1.0625rem',
                lineHeight: 1.5,
                color: 'var(--fg-muted)',
              }}
            >
              {mounted && quizAttempts.length > 0 ? (
                <>
                  Your accuracy on {quizAttempts.length} graded question
                  {quizAttempts.length === 1 ? '' : 's'}. The exam weights these{' '}
                  {SKILL_WEIGHT['1']}% / {SKILL_WEIGHT['2']}% / {SKILL_WEIGHT['3']}% in the same
                  order, so a thin bar on the left costs the most.
                </>
              ) : (
                <>
                  Nothing graded yet. These fill in as you work the Quiz Engine — the exam weights
                  the three {SKILL_WEIGHT['1']}% / {SKILL_WEIGHT['2']}% / {SKILL_WEIGHT['3']}% in
                  the order shown.
                </>
              )}{' '}
              <CedLink to="skills" />
            </p>
          </section>

          {/* Progress ledger */}
          <section className="border-t pt-9" style={{ borderColor: 'var(--rule)' }}>
            <div className="mb-6 flex items-baseline justify-between gap-4">
              <span className="rubric">Ratiō · the ledger</span>
              <span
                className="hidden sm:inline"
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '0.9375rem',
                  color: 'var(--fg-muted)',
                }}
              >
                everything counted so far
              </span>
            </div>
            <Ledger
              rows={[
                {
                  label: 'Syllabus passages read',
                  value: mounted ? read : 0,
                  max: requiredPassages.length,
                  href: '/read',
                },
                {
                  label: 'Vocabulary in rotation',
                  value: mounted ? Object.keys(vocab).length : 0,
                  max: coreVocabulary.length,
                  href: '/vocab',
                },
                {
                  label: 'Lines scanned',
                  value: linesScanned,
                  max: scansionTotal,
                  href: '/scansion',
                },
                {
                  label: 'Translations graded',
                  value: mounted ? translationAttempts.length : 0,
                  max: Math.max(20, mounted ? translationAttempts.length : 0),
                  href: '/translate',
                },
                {
                  label: 'Free responses written',
                  value: mounted ? frqResponses.filter((f) => f.submitted).length : 0,
                  max: Math.max(
                    10,
                    mounted ? frqResponses.filter((f) => f.submitted).length : 0,
                  ),
                  href: '/frq',
                },
                {
                  label: 'Practice exams sat',
                  value: mounted ? examResults.length : 0,
                  max: 6,
                  href: '/exam',
                },
              ]}
            />
          </section>

          <SourceNote to="skills">
            Every weighting, skill category and reading on this dashboard comes from the College
            Board&rsquo;s Course and Exam Description for AP Latin, effective Fall 2025. Where this
            app and the CED disagree, the CED is right.
          </SourceNote>
        </div>

        {/* The ruling */}
        <div className="hidden lg:block" style={{ background: 'var(--rule)' }} />

        {/* ────────── Right ────────── */}
        <div ref={rightRail} className="flex min-w-0 flex-col gap-8 border-t py-10 lg:border-t-0 lg:py-12 lg:pl-10" style={{ borderColor: 'var(--rule)' }}>
          {/* Today's goal. This was only ever visible as a toast at the moment
              it was met, which meant the one number a student can still do
              something about today was the one number the dashboard never
              showed. */}
          <div className="border-b pb-7" style={{ borderColor: 'var(--rule)' }}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span className="slab">Today</span>
              <span
                className="tabular-nums"
                style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem' }}
              >
                {mounted ? formatDuration(todaySeconds) : '—'}
                <span style={{ color: 'var(--fg-faint)' }}>
                  {' '}
                  / {studyPlan.minutesPerDay}m
                </span>
              </span>
            </div>
            <div className="meter">
              <span style={{ width: `${mounted ? goalPct : 0}%` }} />
            </div>
            <div className="mt-3 flex items-baseline gap-4">
              <div className="numeral" style={{ fontSize: '2.25rem', lineHeight: 0.9 }}>
                {mounted ? streak : '—'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.3,
                  color: 'var(--fg-muted)',
                }}
              >
                <div>day{streak === 1 ? '' : 's'} unbroken</div>
                <div>longest {mounted && best > 0 ? <Roman value={best} /> : '—'}</div>
              </div>
            </div>
          </div>

          {/* Study next */}
          <CalledOut rubric="Study next">
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.5rem',
                lineHeight: 1.35,
                color: 'var(--fg)',
                marginBottom: '0.75rem',
              }}
            >
              {next.title}
            </div>
            <p
              style={{
                margin: '0 0 1.25rem',
                fontFamily: 'var(--font-latin)',
                fontSize: '1.125rem',
                lineHeight: 1.55,
                color: 'var(--ink2)',
              }}
            >
              {next.body}
            </p>
            <Link href={next.href} className="btn">
              {next.cta}
            </Link>
          </CalledOut>

          {/* The queue: what is due now, and what is about to be. A count of
              cards due today says nothing about whether tomorrow is five
              minutes or a fifty-card wall. */}
          <div>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <span className="slab">The queue</span>
              {mounted && forecast.total > 0 && (
                <span style={{ fontSize: '0.875rem', color: 'var(--fg-faint)' }}>
                  {forecast.mature} of {forecast.total} words settled
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              <TodayRow label="Cards due now" value={mounted ? due.length : 0} href="/vocab" />
              <div className="hair" />
              <TodayRow
                label="Review queue"
                value={mounted ? reviewQueue.length : 0}
                href="/quiz?mode=review"
              />
            </div>
            {mounted && forecast.total > 0 && (
              <div className="mt-5">
                <div className="slab-sm mb-2.5">Next seven days</div>
                <Forecast week={forecast.week} />
              </div>
            )}
          </div>

          {/* Classroom assignments due. Server-rendered via a prop rather than
              read from the store, so — unlike the rest of this page — this
              is correct on first paint and does not need the `mounted`
              guard the localStorage-backed sections use to avoid a
              hydration mismatch. */}
          {assignments && assignments.length > 0 && (
            <div className="border-t pt-7" style={{ borderColor: 'var(--rule)' }}>
              <div className="slab mb-4">Assigned</div>
              <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
                {assignments.map((a, i) => {
                  const overdue = Boolean(a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10));
                  const pct = Math.min(
                    100,
                    Math.round((a.seconds / Math.max(1, a.targetMinutes * 60)) * 100),
                  );
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/classroom/${a.classroomId}`}
                        className="squish row-hover -mx-3 block px-3 py-3"
                        style={{ borderTop: i === 0 ? undefined : '1px solid var(--hair)' }}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span
                            style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--fg)' }}
                          >
                            {sectionLabel(a.section)}
                          </span>
                          {a.dueDate && (
                            <span
                              className="tabular-nums"
                              style={{
                                fontSize: '0.875rem',
                                color: overdue ? 'var(--accent)' : 'var(--fg-faint)',
                              }}
                            >
                              {overdue ? 'overdue' : 'due'}{' '}
                              {new Date(a.dueDate + 'T00:00:00').toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                        {/* How far along it is, not just that it exists —
                            the student's own copy of the meter their teacher
                            is watching. */}
                        <div className={`meter meter-thin mt-2 ${overdue ? 'meter-red' : ''}`}>
                          <span style={{ width: `${pct}%` }} />
                        </div>
                        <div
                          className="mt-1.5 flex items-baseline justify-between gap-3"
                          style={{ color: 'var(--fg-faint)', fontSize: '0.8125rem' }}
                        >
                          <span>{a.classroomName}</span>
                          <span className="tabular-nums">
                            {Math.round(a.seconds / 60)} / {a.targetMinutes}m
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Recent work */}
          {mounted && activity.length > 0 && (
            <div className="border-t pt-7" style={{ borderColor: 'var(--rule)' }}>
              <div className="slab mb-4">Recently</div>
              <ul className="flex flex-col pl-0" style={{ listStyle: 'none' }}>
                {activity.map((a, i) => (
                  <li key={a.id}>
                    <Link
                      href={a.href}
                      className="squish row-hover -mx-3 block px-3 py-2.5"
                      style={{ borderTop: i === 0 ? undefined : '1px solid var(--hair)' }}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          style={{
                            fontFamily: 'var(--font-latin)',
                            fontSize: '1.0625rem',
                            color: 'var(--fg)',
                          }}
                        >
                          {a.label}
                        </span>
                        <span
                          className="shrink-0 tabular-nums"
                          style={{ fontSize: '0.8125rem', color: 'var(--fg-faint)' }}
                        >
                          {relativeDay(a.at)}
                        </span>
                      </div>
                      <div style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>
                        {a.detail}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

/**
 * Fourteen weeks of squares. Rendered empty until mounted, so the server's
 * markup and the client's first render agree — every square's shading comes
 * out of localStorage, which the server cannot see.
 */
function StudyGrid({ weeks, mounted }: { weeks: CalendarDay[][]; mounted: boolean }) {
  const today = new Date().toISOString().slice(0, 10);

  if (!mounted || weeks.length === 0) {
    // A grid of the right shape, so nothing jumps when the real one arrives.
    return (
      <div className="flex items-start gap-2">
        <WeekdayGutter />
        <div className="cal" aria-hidden="true">
          {Array.from({ length: 14 * 7 }, (_, i) => (
            <span key={i} className="cal-day" data-level={0} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <WeekdayGutter />
      <div className="cal" role="img" aria-label="Study activity over the last fourteen weeks">
        {weeks.flat().map((d) => (
          <span
            key={d.date}
            className="cal-day"
            data-level={d.level}
            data-future={d.future || undefined}
            data-today={d.date === today || undefined}
            title={
              d.future
                ? ''
                : `${new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })} — ${
                    d.count > 0
                      ? `${d.count} piece${d.count === 1 ? '' : 's'} of graded work`
                      : d.studied
                        ? 'studied'
                        : 'nothing'
                  }`
            }
          />
        ))}
      </div>
    </div>
  );
}

/** Mon/Wed/Fri only — labelling all seven turns the gutter into noise. */
function WeekdayGutter() {
  return (
    <div
      className="grid shrink-0"
      style={{ gridTemplateRows: 'repeat(7, 1fr)', gap: '3px' }}
      aria-hidden="true"
    >
      {WEEKDAY_LABELS.map((d, i) => (
        <span
          key={i}
          style={{
            height: '11px',
            lineHeight: '11px',
            fontSize: '0.5625rem',
            color: 'var(--fg-faint)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {i % 2 === 1 ? d : ''}
        </span>
      ))}
    </div>
  );
}

function WeakRow({ spot, first }: { spot: WeakSpot; first: boolean }) {
  return (
    <Link
      href={spot.href}
      className="squish row-hover -mx-3 block px-3 py-4"
      style={{ borderTop: first ? undefined : '1px solid var(--hair)' }}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span
          style={{
            fontFamily: 'var(--font-latin)',
            fontSize: '1.25rem',
            color: 'var(--fg)',
          }}
        >
          {spot.label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-latin)',
            fontSize: '1.25rem',
            color: 'var(--accent)',
            whiteSpace: 'nowrap',
          }}
        >
          {spot.pct === null ? spot.cta : `${spot.pct}%`}
        </span>
      </div>
      {spot.pct !== null && (
        <div className="meter meter-thin meter-red mb-2">
          <span style={{ width: `${spot.pct}%` }} />
        </div>
      )}
      <div style={{ color: 'var(--fg-muted)', fontSize: '0.875rem' }}>{spot.detail}</div>
    </Link>
  );
}

/** Height of the plot the bars grow inside, in px. */
const FORECAST_PLOT = 30;

/**
 * Seven bars, today first, scaled to the busiest day in the window.
 *
 * The bars grow upward inside a fixed-height plot rather than the row being
 * given a height and its contents bottom-aligned. The latter is what I wrote
 * first, and any column taller than that height — a big count above a tall
 * bar above a label — simply overflowed upward, straight over the heading.
 */
function Forecast({ week }: { week: number[] }) {
  const peak = Math.max(1, ...week);
  const labels = ['today', ...Array.from({ length: 6 }, (_, i) => dayInitial(i + 1))];
  return (
    <div className="flex items-end gap-1.5">
      {week.map((n, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span
            className="tabular-nums"
            style={{
              fontSize: '0.6875rem',
              lineHeight: 1.2,
              color: n > 0 ? 'var(--fg-muted)' : 'var(--fg-faint)',
            }}
          >
            {n > 0 ? n : '·'}
          </span>
          <span
            className="flex w-full items-end"
            style={{ height: `${FORECAST_PLOT}px` }}
            title={`${n} card${n === 1 ? '' : 's'} ${i === 0 ? 'due now' : `due ${labels[i]}`}`}
          >
            <span
              style={{
                width: '100%',
                // A day with cards always shows at least a sliver, so "a few"
                // never rounds to the same nothing as "none".
                height: `${n === 0 ? 2 : Math.max(4, Math.round((n / peak) * FORECAST_PLOT))}px`,
                borderRadius: '2px',
                background: n === 0 ? 'var(--track)' : i === 0 ? 'var(--accent)' : 'var(--gilt)',
              }}
            />
          </span>
          <span style={{ fontSize: '0.5625rem', lineHeight: 1.2, color: 'var(--fg-faint)' }}>
            {i === 0 ? 'now' : labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The single-letter weekday `n` days from today. */
function dayInitial(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return WEEKDAY_LABELS[d.getDay()];
}

/** "today" / "yesterday" / "3d ago" / "14 Mar". */
function relativeDay(at: string): string {
  const then = new Date(at);
  const a = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * The ledger rows: label, Roman-numbered count, and a hairline meter. Roman
 * numerals are decorative here — `Roman` keeps the Arabic value for readers.
 */
function Ledger({
  rows,
}: {
  rows: Array<{ label: string; value: number; max: number; href: string }>;
}) {
  return (
    <div className="flex flex-col">
      {rows.map((r, i) => {
        const pct = r.max > 0 ? Math.min(100, Math.round((r.value / r.max) * 100)) : 0;
        return (
          <Link
            key={r.label}
            href={r.href}
            className="squish row-hover -mx-3 block px-3 py-4"
            style={{ borderTop: i === 0 ? undefined : '1px solid var(--hair)' }}
          >
            <div className="mb-2.5 flex items-baseline justify-between gap-4">
              <span
                style={{ fontFamily: 'var(--font-latin)', fontSize: '1.25rem', color: 'var(--fg)' }}
              >
                {r.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-latin)',
                  fontSize: '1.25rem',
                  color: 'var(--fg)',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.value} / {r.max}
                {r.value > 0 && (
                  <span style={{ color: 'var(--fg-faint)' }}> · {toRoman(r.value)}</span>
                )}
              </span>
            </div>
            <div className="meter meter-thin">
              <span style={{ width: `${pct}%` }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function TodayRow({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="squish row-hover -mx-2 flex items-baseline justify-between gap-3 px-2 py-1"
    >
      <span
        style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', color: 'var(--ink2)' }}
      >
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', color: 'var(--fg)' }}>
        {value}
      </span>
    </Link>
  );
}

/** Picks the single most useful next action from current state. */
function nextAction(s: {
  mounted: boolean;
  read: number;
  dueCount: number;
  reviewQueue: number;
  quizCount: number;
  translationCount: number;
  examCount: number;
  days: number;
  weakest: { c: SkillCategory; pct: number; total: number } | null;
  goalMet: boolean;
  topWeakness: WeakSpot | null;
}): { title: string; body: string; cta: string; href: string } {
  if (!s.mounted) {
    return {
      title: 'Loading your progress…',
      body: 'One moment.',
      cta: 'Reading Room',
      href: '/read',
    };
  }
  if (s.read === 0) {
    return {
      title: 'Begin with the proem',
      body: 'Start where the exam starts. Aeneid 1.1–33 is the proem, and it is the passage every other question assumes you know cold.',
      cta: 'Open the proem',
      href: '/read/aen-1-1-33',
    };
  }
  if (s.dueCount > 0) {
    return {
      title: `${s.dueCount} card${s.dueCount === 1 ? '' : 's'} due`,
      body: 'Clearing the queue before anything else keeps the spacing intervals honest — a card reviewed late teaches the algorithm the wrong thing.',
      cta: 'Review vocabulary',
      href: '/vocab',
    };
  }
  if (s.reviewQueue > 0) {
    return {
      title: 'Work the review queue',
      body: `${s.reviewQueue} question${s.reviewQueue === 1 ? '' : 's'} you missed are waiting. These are worth more than fresh ones.`,
      cta: 'Open the queue',
      href: '/quiz?mode=review',
    };
  }
  /* The specific weakness beats the broad category: "form identification, 52%"
     is something a student can act on, where "read & comprehend is your
     thinnest ground" is a diagnosis without a prescription. */
  if (s.topWeakness && s.topWeakness.pct !== null && s.topWeakness.pct < 70) {
    return {
      title: `${s.topWeakness.label} is your thinnest ground`,
      body: `${s.topWeakness.detail}. Half an hour on exactly this is worth more than an hour of mixed practice.`,
      cta: s.topWeakness.cta,
      href: s.topWeakness.href,
    };
  }
  if (s.weakest && s.weakest.pct < 60 && s.weakest.total >= 5) {
    return {
      title: `${SKILL_LABELS[s.weakest.c]} is your thinnest ground`,
      body: `You are at ${s.weakest.pct}% across ${s.weakest.total} graded questions there, against an exam weighting of ${SKILL_WEIGHT[s.weakest.c]}%.`,
      cta: 'Drill that skill',
      href: `/quiz?skill=${s.weakest.c}`,
    };
  }
  if (s.translationCount === 0) {
    return {
      title: 'Try a literal translation',
      body: 'It is 10% of the exam on its own, and the segment breakdown shows exactly where the points go.',
      cta: 'Open Translate',
      href: '/translate',
    };
  }
  if (s.read < 5) {
    return {
      title: 'Keep working the required reading',
      body: 'Everything else on the exam is built on knowing these passages well enough to construe them at speed.',
      cta: 'Reading Room',
      href: '/read',
    };
  }
  if (s.quizCount < 20) {
    return {
      title: 'Build a practice set',
      body: 'Filter the Quiz Engine to the passages you have already read, so the questions test recall rather than surprise.',
      cta: 'Build a set',
      href: '/quiz',
    };
  }
  if (s.examCount === 0 && s.days < 400) {
    return {
      title: 'Sit a full practice exam',
      body: 'You have enough groundwork. Do one early so the timing holds no surprises later.',
      cta: 'Start a practice exam',
      href: '/exam',
    };
  }
  if (!s.goalMet) {
    return {
      title: 'Nothing overdue',
      body: 'The queue is clear and nothing is waiting. Read something new, or put the rest of today’s time into the weakest thing on the left.',
      cta: 'Reading Room',
      href: '/read',
    };
  }
  return {
    title: 'Today is done',
    body: 'You have hit your daily target and the queue is clear. Anything more today is a bonus.',
    cta: 'Reading Room',
    href: '/read',
  };
}
