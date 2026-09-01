'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useStore, daysUntilExam, currentStreak, dueVocab, EXAM_DATE } from '@/store/useStore';
import { requiredPassages, allPassages } from '@/data/passages';
import { coreVocabulary } from '@/data/vocabulary';
import { questions } from '@/data/questions';
import { translationDrills } from '@/data/translation';
import { Page, Card, Badge, Meter } from '@/components/ui';
import type { SkillCategory } from '@/data/types';

const SKILL_LABELS: Record<SkillCategory, string> = {
  '1': 'Read and comprehend',
  '2': 'Describe style and context',
  '3': 'Analyse with evidence',
};

/** CED exam weighting by skill category (pp. 227–228). */
const SKILL_WEIGHT: Record<SkillCategory, string> = {
  '1': '70%',
  '2': '11%',
  '3': '19%',
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const passages = useStore((s) => s.passages);
  const vocab = useStore((s) => s.vocab);
  const quizAttempts = useStore((s) => s.quizAttempts);
  const translationAttempts = useStore((s) => s.translationAttempts);
  const examResults = useStore((s) => s.examResults);
  const studyDays = useStore((s) => s.studyDays);
  const reviewQueue = useStore((s) => s.reviewQueue);

  const days = daysUntilExam();
  const streak = mounted ? currentStreak(studyDays) : 0;
  const due = useMemo(() => (mounted ? dueVocab(vocab) : []), [vocab, mounted]);

  /* ---- mastery ---- */
  const read = useMemo(
    () => requiredPassages.filter((p) => passages[p.id]?.lastOpened).length,
    [passages],
  );

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

  const byUnit = useMemo(() => {
    const acc = new Map<string, { correct: number; total: number }>();
    for (const a of quizAttempts) {
      const cur = acc.get(a.unit) ?? { correct: 0, total: 0 };
      cur.total += 1;
      if (a.correct) cur.correct += 1;
      acc.set(a.unit, cur);
    }
    return acc;
  }, [quizAttempts]);

  /* Segments missed most often across translation attempts. */
  const weakTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of translationAttempts) {
      for (const t of a.missedTags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [translationAttempts]);

  const recentQuiz = useMemo(() => quizAttempts.slice(-40), [quizAttempts]);
  const recentAccuracy =
    recentQuiz.length > 0
      ? Math.round((recentQuiz.filter((a) => a.correct).length / recentQuiz.length) * 100)
      : null;

  const next = nextAction({
    mounted, read, dueCount: due.length, reviewQueue: reviewQueue.length,
    quizCount: quizAttempts.length, translationCount: translationAttempts.length,
    examCount: examResults.length, days,
  });

  const examDateLabel = new Date(EXAM_DATE + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <Page wide>
      {/* ---------- Countdown ---------- */}
      <header className="mb-8">
        <div className="eyebrow mb-2">AP Latin · Vergil and Pliny · 2025–26 framework</div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <div
              className="tabular-nums leading-none"
              style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.75rem, 2rem + 4vw, 4.25rem)', fontWeight: 600, letterSpacing: '-0.03em' }}
            >
              {mounted ? days.toLocaleString() : '—'}
            </div>
            <div className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
              days until the exam · {examDateLabel}
            </div>
          </div>
          {mounted && streak > 0 && (
            <div className="pb-1">
              <Badge tone="gilt">
                {streak} day{streak === 1 ? '' : 's'} in a row
              </Badge>
            </div>
          )}
        </div>
      </header>

      {/* ---------- What to study next ---------- */}
      <Card className="mb-6">
        <div className="eyebrow mb-1.5">What to study next</div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="measure" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.0625rem', margin: 0 }}>
            {next.text}
          </p>
          <Link href={next.href} className="btn btn-primary shrink-0">
            {next.cta}
          </Link>
        </div>
      </Card>

      {/* ---------- Coverage ---------- */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Syllabus passages read"
          value={mounted ? `${read}/${requiredPassages.length}` : '—'}
          sub={`${allPassages.length} loaded in total`}
          meter={{ value: mounted ? read : 0, max: requiredPassages.length }}
          href="/read"
        />
        <Stat
          label="Vocabulary due"
          value={mounted ? String(due.length) : '—'}
          sub={`${Object.keys(vocab).length} of ${coreVocabulary.length} in rotation`}
          meter={{ value: Object.keys(vocab).length, max: coreVocabulary.length, tone: 'gilt' }}
          href="/vocab"
        />
        <Stat
          label="Recent MCQ accuracy"
          value={mounted && recentAccuracy !== null ? `${recentAccuracy}%` : '—'}
          sub={mounted && recentQuiz.length ? `last ${recentQuiz.length} questions` : `${questions.length} questions available`}
          meter={recentAccuracy !== null ? { value: recentAccuracy, max: 100, tone: 'green' } : undefined}
          href="/quiz"
        />
        <Stat
          label="Review queue"
          value={mounted ? String(reviewQueue.length) : '—'}
          sub="questions you missed"
          href="/quiz?mode=review"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Skill categories ---------- */}
        <Card>
          <h2 className="mb-1" style={{ fontSize: '1rem' }}>Mastery by skill category</h2>
          <p className="mb-4 text-xs" style={{ color: 'var(--fg-faint)' }}>
            Percentages in brackets are the CED’s exam weightings, not your score.
          </p>
          <div className="flex flex-col gap-3.5">
            {(['1', '2', '3'] as SkillCategory[]).map((c) => {
              const s = bySkill[c];
              const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={c}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-sm">
                      <span style={{ color: 'var(--fg-faint)' }}>{c}.</span> {SKILL_LABELS[c]}{' '}
                      <span style={{ color: 'var(--fg-faint)' }}>[{SKILL_WEIGHT[c]}]</span>
                    </span>
                    <span className="tabular-nums text-sm" style={{ color: 'var(--fg-muted)' }}>
                      {mounted && s.total > 0 ? `${pct}%` : '—'}
                    </span>
                  </div>
                  <Meter
                    value={mounted ? s.correct : 0}
                    max={Math.max(1, s.total)}
                    tone={pct >= 75 ? 'green' : pct >= 50 ? 'gilt' : 'accent'}
                  />
                  <div className="mt-0.5 text-xs" style={{ color: 'var(--fg-faint)' }}>
                    {mounted && s.total > 0 ? `${s.correct} of ${s.total} correct` : 'no attempts yet'}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ---------- Units ---------- */}
        <Card>
          <h2 className="mb-4" style={{ fontSize: '1rem' }}>Mastery by unit</h2>
          {!mounted || byUnit.size === 0 ? (
            <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>
              Answer some questions in the Quiz Engine and per-unit accuracy appears here.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {[...byUnit.entries()].sort().map(([unit, s]) => {
                const pct = Math.round((s.correct / s.total) * 100);
                return (
                  <div key={unit}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>Unit {unit}</span>
                      <span className="tabular-nums" style={{ color: 'var(--fg-muted)' }}>
                        {pct}% <span style={{ color: 'var(--fg-faint)' }}>({s.total})</span>
                      </span>
                    </div>
                    <Meter value={s.correct} max={s.total} tone={pct >= 75 ? 'green' : pct >= 50 ? 'gilt' : 'accent'} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ---------- Weak grammar ---------- */}
        <Card>
          <h2 className="mb-1" style={{ fontSize: '1rem' }}>Translation segments you keep missing</h2>
          <p className="mb-3 text-xs" style={{ color: 'var(--fg-faint)' }}>
            Built from the grammar tags on segments you scored below full credit.
          </p>
          {!mounted || weakTags.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>
              Nothing yet — work a drill in{' '}
              <Link href="/translate" style={{ color: 'var(--accent)' }}>Translate</Link>{' '}
              and missed segments are tracked here. {translationDrills.length} drills available.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {weakTags.map(([tag, n]) => (
                <li key={tag}>
                  <Badge tone={n >= 3 ? 'accent' : 'neutral'}>
                    {tag.replace(/-/g, ' ')} · {n}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---------- Recent scores ---------- */}
        <Card>
          <h2 className="mb-3" style={{ fontSize: '1rem' }}>Recent practice exams</h2>
          {!mounted || examResults.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--fg-faint)' }}>
              No full exams yet. The{' '}
              <Link href="/exam" style={{ color: 'var(--accent)' }}>Practice Exam</Link>{' '}
              runs 52 multiple-choice in 65 minutes, then 5 free-response in 115.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {examResults.slice(-5).reverse().map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span style={{ color: 'var(--fg-muted)' }}>
                    {new Date(r.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="tabular-nums">
                    MCQ {r.mcqCorrect}/{r.mcqTotal}
                    <span style={{ color: 'var(--fg-faint)' }}> · </span>
                    FRQ {r.frqPoints}/{r.frqMax}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Page>
  );
}

function Stat({
  label, value, sub, meter, href,
}: {
  label: string;
  value: string;
  sub: string;
  meter?: { value: number; max: number; tone?: 'accent' | 'green' | 'gilt' };
  href: string;
}) {
  return (
    <Link href={href} className="card block p-4 transition-transform hover:-translate-y-px">
      <div className="eyebrow">{label}</div>
      <div
        className="mt-1 tabular-nums"
        style={{ fontFamily: 'var(--font-serif)', fontSize: '1.625rem', fontWeight: 600, lineHeight: 1.1 }}
      >
        {value}
      </div>
      {meter && (
        <div className="mt-2">
          <Meter value={meter.value} max={meter.max} tone={meter.tone} />
        </div>
      )}
      <div className="mt-1.5 text-xs" style={{ color: 'var(--fg-faint)' }}>
        {sub}
      </div>
    </Link>
  );
}

/** Picks the single most useful next action from current state. */
function nextAction(s: {
  mounted: boolean; read: number; dueCount: number; reviewQueue: number;
  quizCount: number; translationCount: number; examCount: number; days: number;
}): { text: string; cta: string; href: string } {
  if (!s.mounted) {
    return { text: 'Loading your progress…', cta: 'Reading Room', href: '/read' };
  }
  if (s.read === 0) {
    return {
      text: 'Start where the exam starts: read a syllabus passage. Aeneid 1.1–33 is the proem, and it is the one passage in the app that carries macrons.',
      cta: 'Open the proem',
      href: '/read/aen-1-1-33',
    };
  }
  if (s.dueCount > 0) {
    return {
      text: `${s.dueCount} vocabulary card${s.dueCount === 1 ? ' is' : 's are'} due. Clearing the queue first keeps the spacing intervals honest.`,
      cta: 'Review vocabulary',
      href: '/vocab',
    };
  }
  if (s.reviewQueue > 0) {
    return {
      text: `${s.reviewQueue} question${s.reviewQueue === 1 ? '' : 's'} you missed are waiting in the review queue.`,
      cta: 'Work the queue',
      href: '/quiz?mode=review',
    };
  }
  if (s.translationCount === 0) {
    return {
      text: 'Try a literal translation drill. It is 10% of the exam on its own, and the segment breakdown shows exactly where points go.',
      cta: 'Open Translate',
      href: '/translate',
    };
  }
  if (s.read < 5) {
    return {
      text: 'Keep working through the required reading — everything else on the exam is built on knowing these passages cold.',
      cta: 'Reading Room',
      href: '/read',
    };
  }
  if (s.quizCount < 20) {
    return {
      text: 'Build a practice set in the Quiz Engine, filtered to the passages you have read.',
      cta: 'Build a set',
      href: '/quiz',
    };
  }
  if (s.examCount === 0 && s.days < 400) {
    return {
      text: 'You have enough groundwork to sit a full practice exam. Do it once early so the timing holds no surprises.',
      cta: 'Start a practice exam',
      href: '/exam',
    };
  }
  return {
    text: 'Everything is up to date. Pick a weak spot from the panels below, or read something new.',
    cta: 'Reading Room',
    href: '/read',
  };
}
