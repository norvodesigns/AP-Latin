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
import type { SkillCategory } from '@/data/types';
import type { UpcomingAssignment } from '@/lib/supabase/dashboard';

const SKILL_LABELS: Record<SkillCategory, string> = {
  '1': 'Read & comprehend',
  '2': 'Style & context',
  '3': 'Analyze',
};

/** CED exam weighting by skill category (pp. 227–228). */
const SKILL_WEIGHT: Record<SkillCategory, number> = { '1': 70, '2': 11, '3': 19 };

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
  const examResults = useStore((s) => s.examResults);
  const studyDays = useStore((s) => s.studyDays);
  const reviewQueue = useStore((s) => s.reviewQueue);
  const scansionAttempts = useStore((s) => s.scansionAttempts);

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
        <div ref={leftColumn} className="flex flex-col gap-11 py-10 lg:py-12 lg:pr-12">
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
          </section>

          {/* Mastery */}
          <section>
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
        <div ref={rightRail} className="flex flex-col gap-8 border-t py-10 lg:border-t-0 lg:py-12 lg:pl-10" style={{ borderColor: 'var(--rule)' }}>
          {/* Streak */}
          <div
            className="flex items-baseline gap-4 border-b pb-6"
            style={{ borderColor: 'var(--rule)' }}
          >
            <div className="numeral" style={{ fontSize: '3.5rem', lineHeight: 0.9 }}>
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
              <div>
                days unbroken{mounted && streak > 0 && <> · <Roman value={streak} /></>}
              </div>
              <div>
                longest streak {mounted && best > 0 ? <Roman value={best} /> : '—'}
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

          {/* Today: only things that are actually due today, so the rail stays
              a to-do list. Cumulative totals — lines scanned included — live in
              the ledger on the left, where they have a bar to be read against. */}
          <div className="flex flex-col gap-2.5">
            <TodayRow label="Cards due today" value={mounted ? due.length : 0} href="/vocab" />
            <div className="hair" />
            <TodayRow
              label="Review queue"
              value={mounted ? reviewQueue.length : 0}
              href="/quiz?mode=review"
            />
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
                        <div style={{ color: 'var(--fg-faint)', fontSize: '0.8125rem' }}>{a.classroomName}</div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Recent exams */}
          {mounted && examResults.length > 0 && (
            <div className="border-t pt-7" style={{ borderColor: 'var(--rule)' }}>
              <div className="slab mb-4">Recent practice exams</div>
              <ul className="flex flex-col gap-3">
                {examResults
                  .slice(-4)
                  .reverse()
                  .map((r) => (
                    <li key={r.id} className="flex items-baseline justify-between gap-3">
                      <span
                        style={{
                          fontFamily: 'var(--font-latin)',
                          fontSize: '1.0625rem',
                          color: 'var(--fg-muted)',
                        }}
                      >
                        {new Date(r.at).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-latin)',
                          fontSize: '1.0625rem',
                          color: 'var(--fg)',
                        }}
                      >
                        MCQ {r.mcqCorrect}/{r.mcqTotal} · FRQ {r.frqPoints}/{r.frqMax}
                      </span>
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
            className="row-hover -mx-3 block px-3 py-4"
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
    <Link href={href} className="row-hover -mx-2 flex items-baseline justify-between gap-3 px-2 py-1">
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
  if (s.weakest && s.weakest.pct < 60 && s.weakest.total >= 5) {
    return {
      title: `${SKILL_LABELS[s.weakest.c]} is your thinnest ground`,
      body: `You are at ${s.weakest.pct}% across ${s.weakest.total} graded questions there, against an exam weighting of ${SKILL_WEIGHT[s.weakest.c]}%.`,
      cta: 'Drill that skill',
      href: '/quiz',
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
  return {
    title: 'Everything is up to date',
    body: 'Pick a weak spot from the ledger, or read something new.',
    cta: 'Reading Room',
    href: '/read',
  };
}
