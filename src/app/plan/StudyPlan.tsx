'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useStore, daysUntilExam, dueVocab, EXAM_DATE } from '@/store/useStore';
import { requiredPassages } from '@/data/passages';
import { coreVocabulary } from '@/data/vocabulary';
import { translationDrills } from '@/data/translation';
import { Page, PageHeader, Section, Panel, CalledOut, Meter, SourceNote } from '@/components/ui';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Phase {
  id: string;
  name: string;
  from: number;  // days before the exam, inclusive
  to: number;
  focus: string;
  targets: string[];
}

/**
 * A phase plan measured backwards from exam day. The proportions follow the
 * CED's own weightings: reading and comprehension is 70% of the exam, so the
 * bulk of the time goes on reading the syllabus rather than on drills.
 */
function buildPhases(days: number): Phase[] {
  return [
    {
      id: 'foundation',
      name: 'Foundation',
      from: days,
      to: Math.max(1, Math.round(days * 0.55)),
      focus: 'Read the syllabus and build the vocabulary base.',
      targets: [
        'Work through the required passages in Reading Room, one or two a week.',
        'Keep the vocabulary queue clear — the 990-word core list is the floor everything else stands on.',
        'Start Grammar & Syntax on the constructions you keep stumbling over.',
      ],
    },
    {
      id: 'consolidation',
      name: 'Consolidation',
      from: Math.max(1, Math.round(days * 0.55)),
      to: Math.max(1, Math.round(days * 0.22)),
      focus: 'Translate accurately and start writing to the rubric.',
      targets: [
        'A literal translation drill twice a week; log the segments you miss.',
        'Scansion until the fifth-foot dactyl is automatic.',
        'One FRQ 3 short essay a week, self-scored against the official rows.',
        'Sight reading once a week, timed.',
      ],
    },
    {
      id: 'exam-shape',
      name: 'Exam shape',
      from: Math.max(1, Math.round(days * 0.22)),
      to: Math.max(1, Math.round(days * 0.06)),
      focus: 'Practise under the real timing.',
      targets: [
        'A full practice exam every two or three weeks.',
        'Course project passages: drill summary and interpretation-with-evidence.',
        'Rework the questions in your review queue until it empties.',
        'Target the weakest skill category on the dashboard, not the most comfortable.',
      ],
    },
    {
      id: 'taper',
      name: 'Taper',
      from: Math.max(1, Math.round(days * 0.06)),
      to: 0,
      focus: 'Keep it warm; do not learn anything new.',
      targets: [
        'Re-read the syllabus passages you know least well.',
        'Vocabulary review only — no new cards.',
        'One timed section, not a whole exam.',
        'Sleep.',
      ],
    },
  ];
}

/** A bulleted target line, ruled rather than boxed. */
function Target({ children }: { children: React.ReactNode }) {
  return (
    <li
      className="flex gap-2.5"
      style={{
        fontFamily: 'var(--font-latin)',
        fontSize: '1rem',
        lineHeight: 1.6,
        color: 'var(--ink2)',
      }}
    >
      <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
        ·
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function StudyPlan() {
  const plan = useStore((s) => s.studyPlan);
  const setStudyPlan = useStore((s) => s.setStudyPlan);
  const passages = useStore((s) => s.passages);
  const vocab = useStore((s) => s.vocab);
  const quizAttempts = useStore((s) => s.quizAttempts);
  const translationAttempts = useStore((s) => s.translationAttempts);
  const studyDays = useStore((s) => s.studyDays);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const days = daysUntilExam();
  const phases = useMemo(() => buildPhases(days), [days]);
  const currentPhase = phases.find((p) => days <= p.from && days > p.to) ?? phases[phases.length - 1];

  const read = requiredPassages.filter((p) => passages[p.id]?.lastOpened).length;
  const inRotation = Object.keys(vocab).length;
  const due = mounted ? dueVocab(vocab).length : 0;

  /* Weekly load implied by what is left and how long there is. */
  const activeDaysPerWeek = plan.activeDays.length || 7;
  const weeksLeft = Math.max(1, days / 7);
  const passagesPerWeek = (requiredPassages.length - read) / weeksLeft;
  const wordsPerWeek = (coreVocabulary.length - inRotation) / weeksLeft;

  const examDateLabel = new Date(EXAM_DATE + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const todayIsActive = mounted && plan.activeDays.includes(new Date().getDay());
  const studiedToday = mounted && studyDays.includes(new Date().toISOString().slice(0, 10));

  return (
    <Page wide>
      <PageHeader
        eyebrow={`${mounted ? days.toLocaleString() : '—'} days · ${examDateLabel}`}
        title="Study Plan"
        lede="Built backwards from exam day and from what you have actually covered. Adjust the settings and everything below recalculates."
      />

      <CalledOut
        rubric={`Today${mounted && !todayIsActive ? ' · a rest day in your schedule' : ''}`}
        className="mb-12"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h2 style={{ fontSize: '1.375rem', lineHeight: 1.25 }}>
              {!mounted
                ? '…'
                : studiedToday
                  ? 'Done for today'
                  : todayIsActive
                    ? `${plan.minutesPerDay} minutes`
                    : 'Rest day'}
            </h2>
            {mounted && todayIsActive && !studiedToday && (
              <ul className="mt-4 flex flex-col gap-1.5 pl-0" style={{ listStyle: 'none' }}>
                {due > 0 && (
                  <Target>
                    Clear {Math.min(due, 40)} vocabulary card{due === 1 ? '' : 's'} (
                    {Math.min(15, Math.round(plan.minutesPerDay * 0.35))} min)
                  </Target>
                )}
                <Target>{currentPhase.focus}</Target>
                {read < requiredPassages.length && <Target>Read or re-read one syllabus passage</Target>}
              </ul>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            {due > 0 && (
              <Link href="/vocab" className="btn btn-primary">
                Vocabulary ({due})
              </Link>
            )}
            <Link href="/read" className="btn">
              Reading Room
            </Link>
          </div>
        </div>
      </CalledOut>

      <Section title="Your schedule" className="mb-12">
        <div className="grid gap-8 sm:grid-cols-2">
          <label>
            <span className="slab-sm mb-3 block">
              Minutes per study day —{' '}
              <strong style={{ color: 'var(--accent)' }}>{plan.minutesPerDay}</strong>
            </span>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={plan.minutesPerDay}
              onChange={(e) => setStudyPlan({ minutesPerDay: Number(e.target.value) })}
              className="w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
          </label>

          <div>
            <span className="slab-sm mb-3 block">Study days</span>
            <div className="flex flex-wrap gap-1.5">
              {DAY_NAMES.map((d, i) => {
                const on = plan.activeDays.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setStudyPlan({
                        activeDays: on
                          ? plan.activeDays.filter((x) => x !== i)
                          : [...plan.activeDays, i].sort(),
                      })
                    }
                    className={on ? 'chip chip-on squish' : 'chip squish'}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {mounted && (
          <p
            className="measure-wide mt-8 border-t pt-6"
            style={{
              borderColor: 'var(--rule)',
              fontFamily: 'var(--font-latin)',
              fontSize: '1.0625rem',
              lineHeight: 1.7,
              color: 'var(--ink2)',
            }}
          >
            That is roughly{' '}
            <strong style={{ color: 'var(--accent)' }}>
              {Math.round((days / 7) * activeDaysPerWeek * plan.minutesPerDay / 60).toLocaleString()}{' '}
              hours
            </strong>{' '}
            between now and the exam. To finish the required reading you need about{' '}
            <strong style={{ color: 'var(--accent)' }}>
              {passagesPerWeek < 0.1 ? 'no' : passagesPerWeek.toFixed(1)}
            </strong>{' '}
            passage{passagesPerWeek === 1 ? '' : 's'} a week, and to get the whole core list into
            rotation about{' '}
            <strong style={{ color: 'var(--accent)' }}>
              {Math.max(0, Math.ceil(wordsPerWeek))}
            </strong>{' '}
            new words a week.
          </p>
        )}
      </Section>

      <Section title="Phases" className="mb-12">
        <ol className="stagger flex flex-col pl-0" style={{ listStyle: 'none' }}>
          {phases.map((p) => {
            const active = mounted && p.id === currentPhase.id;
            return (
              <li
                key={p.id}
                className="border-t pt-6 pb-8"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--rule)',
                  borderTopWidth: active ? 2 : 1,
                }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h3 style={{ fontSize: '1.1875rem', lineHeight: 1.25 }}>{p.name}</h3>
                    {active && <span className="chip chip-on">you are here</span>}
                  </div>
                  <span className="slab-sm tabular-nums">
                    {p.from}–{p.to} days out
                  </span>
                </div>

                <p
                  style={{
                    margin: '0.5rem 0 0',
                    fontFamily: 'var(--font-latin)',
                    fontSize: '1.125rem',
                    lineHeight: 1.5,
                  }}
                >
                  {p.focus}
                </p>

                <ul className="mt-4 flex flex-col gap-1.5 pl-0" style={{ listStyle: 'none' }}>
                  {p.targets.map((t) => (
                    <Target key={t}>{t}</Target>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section title="Where you are">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-5">
            <Meter
              value={mounted ? read : 0}
              max={requiredPassages.length}
              label="Required passages opened"
            />
            <Meter
              value={mounted ? inRotation : 0}
              max={coreVocabulary.length}
              label="Core vocabulary in rotation"
              tone="gilt"
            />
            <Meter
              value={mounted ? new Set(translationAttempts.map((a) => a.drillId)).size : 0}
              max={translationDrills.length}
              label="Translation drills attempted"
            />
          </div>

          <Panel>
            <div className="rubric mb-3">Consistency</div>
            <div
              className="tabular-nums"
              style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', lineHeight: 1, fontWeight: 600 }}
            >
              {mounted ? studyDays.length : '—'}
            </div>
            <p
              style={{
                margin: '0.5rem 0 0',
                fontFamily: 'var(--font-latin)',
                fontSize: '1rem',
                color: 'var(--fg-muted)',
              }}
            >
              days studied since you started
            </p>
            <p
              style={{
                margin: '1.25rem 0 0',
                fontFamily: 'var(--font-latin)',
                fontSize: '1rem',
                lineHeight: 1.6,
                color: 'var(--ink2)',
              }}
            >
              {mounted && quizAttempts.length > 0
                ? `${quizAttempts.length} questions answered, ${translationAttempts.length} translations logged.`
                : 'Nothing logged yet — the plan gets more useful once there is data behind it.'}
            </p>
          </Panel>
        </div>
      </Section>

      <SourceNote to="examOverview">
        The phase weightings follow the exam’s own: reading and comprehension is the largest share of
        the paper, so most of the time above goes on reading the syllabus rather than on drills.
      </SourceNote>
    </Page>
  );
}
