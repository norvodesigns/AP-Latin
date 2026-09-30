'use client';

import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { COURSE, nextLesson, unitProgress, ALL_LESSONS } from '@/data/curriculum';
import { Page, PageHeader, Section, CalledOut, Hairline } from '@/components/ui';
import { Rich } from '@/components/Rich';

/** Levels still being written, so the map shows where the course is going. */
const COMING = [
  { numeral: 'II', title: 'Secunda', subtitle: 'Intermediate', blurb: 'The passive, participles and the ablative absolute, indirect statement, the subjunctive and its clauses.' },
  { numeral: 'III', title: 'Tertia', subtitle: 'Toward AP', blurb: 'Adapted Caesar and Pliny, poetic word order, meter, and reading at sight: the bridge into Vergil.' },
];

export default function CourseMap() {
  const lessons = useStore((s) => s.lessons);
  const learner = useStore((s) => s.learner);
  const next = nextLesson(lessons, learner?.startLessonId);
  const doneCount = ALL_LESSONS.filter((p) => lessons[p.lesson.id]).length;

  return (
    <Page>
      <PageHeader
        eyebrow="The course"
        title="Latin, from the first word"
        lede="Short lessons in order, each one teaching a little and asking a lot. The words you learn join your flashcards, and the path leads to the AP syllabus."
      />

      {next && (
        <CalledOut rubric={doneCount === 0 ? 'Start here' : 'Continue'} className="mb-12">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <div className="slab-sm mb-1.5" style={{ color: 'var(--fg-muted)' }}>
                {next.level.title} · Unit {next.unit.n} · Lesson {next.unit.lessons.indexOf(next.lesson) + 1}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', lineHeight: 1.2 }}>
                {next.lesson.title}
              </div>
              <p className="measure mt-1.5" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--ink2)', margin: 0 }}>
                <Rich text={next.lesson.summary} />
              </p>
            </div>
            <Link href={`/learn/${next.lesson.id}`} className="btn btn-primary">
              {doneCount === 0 ? 'Begin' : 'Continue'} · {next.lesson.minutes} min
            </Link>
          </div>
        </CalledOut>
      )}
      {!next && ALL_LESSONS.length > 0 && (
        <CalledOut rubric="Every lesson done" className="mb-12">
          <p style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', margin: 0 }}>
            You have finished every lesson written so far. New ones arrive here as they are added; meanwhile, keep your{' '}
            <Link href="/vocab" className="link-rule">flashcards</Link> ticking over.
          </p>
        </CalledOut>
      )}

      {COURSE.map((level) => (
        <Section key={level.id} className="mb-14">
          <div className="mb-6 flex items-baseline gap-4">
            <span className="numeral" style={{ fontSize: '2.5rem', lineHeight: 1, color: 'var(--accent)' }}>
              {level.numeral}
            </span>
            <div>
              <h2 style={{ fontSize: '1.625rem', lineHeight: 1.15 }}>
                {level.title} <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>· {level.subtitle}</span>
              </h2>
              <p className="measure mt-1" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--ink2)', margin: 0 }}>
                {level.blurb}
              </p>
            </div>
          </div>

          {level.units.map((unit) => {
            const pct = Math.round(unitProgress(unit, lessons) * 100);
            return (
              <div key={unit.id} className="mb-9">
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <h3 className="slab">
                    Unit {unit.n} · {unit.title}
                  </h3>
                  <span className="slab-sm" style={{ color: pct === 100 ? 'var(--correct)' : 'var(--fg-muted)' }}>
                    {pct}%
                  </span>
                </div>
                <p className="measure mb-3" style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem', color: 'var(--fg-muted)', margin: '0 0 0.75rem' }}>
                  <Rich text={unit.blurb} />
                </p>
                <div className="meter meter-thin mb-3" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Unit ${unit.n} progress`}>
                  <span style={{ width: `${pct}%` }} />
                </div>
                <ol className="pl-0" style={{ listStyle: 'none' }}>
                  {unit.lessons.map((lesson, i) => {
                    const done = lessons[lesson.id];
                    const isNext = next?.lesson.id === lesson.id;
                    return (
                      <li key={lesson.id} className="border-t" style={{ borderColor: 'var(--rule)' }}>
                        <Link href={`/learn/${lesson.id}`} className="row-hover flex items-baseline gap-4 py-3.5">
                          <span className="numeral w-6 shrink-0 tabular-nums" style={{ color: done ? 'var(--correct)' : isNext ? 'var(--accent)' : 'var(--fg-faint)' }} aria-hidden="true">
                            {done ? '✓' : i + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem' }}>{lesson.title}</span>
                            <span className="block" style={{ fontFamily: 'var(--font-latin)', fontSize: '0.975rem', color: 'var(--fg-muted)' }}>
                              <Rich text={lesson.summary} />
                            </span>
                          </span>
                          <span className="slab-sm shrink-0" style={{ color: done ? 'var(--correct)' : 'var(--fg-faint)' }}>
                            {done ? `${Math.round(done.best * 100)}%` : `${lesson.minutes} min`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </Section>
      ))}

      <Hairline className="mb-10" />
      {COMING.map((l) => (
        <div key={l.numeral} className="mb-8 flex items-baseline gap-4" style={{ opacity: 0.7 }}>
          <span className="numeral" style={{ fontSize: '2rem', lineHeight: 1, color: 'var(--fg-faint)' }}>
            {l.numeral}
          </span>
          <div>
            <div style={{ fontSize: '1.25rem' }}>
              {l.title} <span style={{ color: 'var(--fg-muted)' }}>· {l.subtitle}</span>{' '}
              <span className="slab-sm" style={{ color: 'var(--fg-faint)' }}>in preparation</span>
            </div>
            <p className="measure" style={{ fontFamily: 'var(--font-latin)', fontSize: '1rem', color: 'var(--fg-muted)', margin: 0 }}>
              {l.blurb}
            </p>
          </div>
        </div>
      ))}
      <p className="measure" style={{ fontFamily: 'var(--font-latin)', fontSize: '1.0625rem', color: 'var(--ink2)' }}>
        Already reading Vergil and Pliny? The AP course starts in the{' '}
        <Link href="/read" className="link-rule">Reading Room</Link>.
      </p>
    </Page>
  );
}
