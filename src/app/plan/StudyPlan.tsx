'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useStore, daysUntilExam, dueVocab, EXAM_DATE } from '@/store/useStore';
import { requiredPassages } from '@/data/passages';
import { coreVocabulary } from '@/data/vocabulary';
import { translationDrills } from '@/data/translation';
import { Page, PageHeader, Card, Badge, Meter } from '@/components/ui';

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

      {/* today */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow mb-1">
              Today {mounted && !todayIsActive && '· a rest day in your schedule'}
            </div>
            <h2 style={{ fontSize: '1.125rem' }}>
              {!mounted ? '…' : studiedToday ? 'Done for today' : todayIsActive ? `${plan.minutesPerDay} minutes` : 'Rest day'}
            </h2>
            {mounted && todayIsActive && !studiedToday && (
              <ul className="mt-2.5 flex flex-col gap-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                {due > 0 && <li>• Clear {Math.min(due, 40)} vocabulary card{due === 1 ? '' : 's'} ({Math.min(15, Math.round(plan.minutesPerDay * 0.35))} min)</li>}
                <li>• {currentPhase.focus}</li>
                {read < requiredPassages.length && <li>• Read or re-read one syllabus passage</li>}
              </ul>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            {due > 0 && <Link href="/vocab" className="btn btn-primary">Vocabulary ({due})</Link>}
            <Link href="/read" className="btn">Reading Room</Link>
          </div>
        </div>
      </Card>

      {/* settings */}
      <Card className="mb-6">
        <h2 className="mb-3" style={{ fontSize: '1rem' }}>Your schedule</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-sm" style={{ color: 'var(--fg-muted)' }}>
              Minutes per study day: <strong style={{ color: 'var(--fg)' }}>{plan.minutesPerDay}</strong>
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
            <span className="mb-1.5 block text-sm" style={{ color: 'var(--fg-muted)' }}>Study days</span>
            <div className="flex flex-wrap gap-1">
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
                    className="rounded-md border px-2 py-1 text-xs transition-colors"
                    style={{
                      background: on ? 'var(--accent)' : 'transparent',
                      borderColor: on ? 'var(--accent)' : 'var(--rule)',
                      color: on ? 'var(--accent-fg)' : 'var(--fg-faint)',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {mounted && (
          <p className="mt-4 border-t pt-3.5 text-sm" style={{ borderColor: 'var(--rule)', color: 'var(--fg-muted)' }}>
            That is roughly{' '}
            <strong style={{ color: 'var(--fg)' }}>
              {Math.round((days / 7) * activeDaysPerWeek * plan.minutesPerDay / 60).toLocaleString()} hours
            </strong>{' '}
            between now and the exam. To finish the required reading you need about{' '}
            <strong style={{ color: 'var(--fg)' }}>{passagesPerWeek < 0.1 ? 'no' : passagesPerWeek.toFixed(1)}</strong>{' '}
            passage{passagesPerWeek === 1 ? '' : 's'} a week, and to get the whole core list into
            rotation about{' '}
            <strong style={{ color: 'var(--fg)' }}>{Math.max(0, Math.ceil(wordsPerWeek))}</strong> new
            words a week.
          </p>
        )}
      </Card>

      {/* phases */}
      <h2 className="eyebrow mb-3">Phases</h2>
      <ol className="mb-6 flex flex-col gap-3">
        {phases.map((p) => {
          const active = mounted && p.id === currentPhase.id;
          return (
            <li key={p.id}>
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2.5">
                    <h3 style={{ fontSize: '1.0625rem' }}>{p.name}</h3>
                    {active && <Badge tone="accent">you are here</Badge>}
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--fg-faint)' }}>
                    {p.from}–{p.to} days out
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: 'var(--fg)', fontWeight: 500 }}>{p.focus}</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {p.targets.map((t) => (
                    <li key={t} className="text-sm" style={{ color: 'var(--fg-muted)' }}>• {t}</li>
                  ))}
                </ul>
              </Card>
            </li>
          );
        })}
      </ol>

      {/* coverage */}
      <h2 className="eyebrow mb-3">Where you are</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex flex-col gap-3.5">
            <Meter value={mounted ? read : 0} max={requiredPassages.length} label="Required passages opened" />
            <Meter value={mounted ? inRotation : 0} max={coreVocabulary.length} label="Core vocabulary in rotation" tone="gilt" />
            <Meter
              value={mounted ? new Set(translationAttempts.map((a) => a.drillId)).size : 0}
              max={translationDrills.length}
              label="Translation drills attempted"
              tone="green"
            />
          </div>
        </Card>
        <Card>
          <div className="eyebrow mb-2">Consistency</div>
          <div className="tabular-nums" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', fontWeight: 600 }}>
            {mounted ? studyDays.length : '—'}
          </div>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            days studied since you started
          </p>
          <p className="mt-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
            {mounted && quizAttempts.length > 0
              ? `${quizAttempts.length} questions answered, ${translationAttempts.length} translations logged.`
              : 'Nothing logged yet — the plan gets more useful once there is data behind it.'}
          </p>
        </Card>
      </div>
    </Page>
  );
}
