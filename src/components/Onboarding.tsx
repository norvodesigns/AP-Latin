'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useStore, type LearnerProfile } from '@/store/useStore';
import { COURSE, PLACEMENT, ALL_LESSONS } from '@/data/curriculum';
import { placementContinues, placementStart, unitBeyond, type PlacementAnswer } from '@/lib/placement';
import { Rich } from '@/components/Rich';
import { SEEN_KEY as SPLASH_KEY, CURRENT_VERSION } from '@/components/SplashScreen';
import { WELCOME_SEEN_KEY } from '@/components/WelcomeGate';

/** Set once the first-run questions are answered or skipped, in this browser. */
export const ONBOARDED_KEY = 'ap-latin-onboarded';

const UNIT_IDS = COURSE.flatMap((l) => l.units.map((u) => u.id));

type Track = LearnerProfile['track'];
type Step = 'welcome' | 'track' | 'placement-intro' | 'placement' | 'placement-result' | 'pick-unit' | 'goal' | 'account';

/**
 * Whether this visitor is new enough to be asked where they're starting:
 * nothing studied, no profile, never onboarded, not signed in (a signed-in
 * visitor on a new browser has cloud progress on its way).
 */
export function needsOnboarding(signedIn: boolean): boolean {
  if (signedIn) return false;
  try {
    if (localStorage.getItem(ONBOARDED_KEY)) return false;
    if (localStorage.getItem(SPLASH_KEY)) return false;
  } catch {
    return false;
  }
  const s = useStore.getState();
  const studied =
    Object.keys(s.lessons).length > 0 ||
    Object.keys(s.vocab).length > 0 ||
    s.quizAttempts.length > 0 ||
    Object.keys(s.passages).length > 0;
  return !s.learner && !studied;
}

/**
 * The first run: who you are, where to start (with a short placement check
 * for anyone who knows some Latin), a daily goal, and an offer to save
 * progress to an account. Replaces the welcome splash and the sign-in
 * invitation for a brand-new visitor; either can be skipped at any point.
 */
export default function Onboarding({ accountsEnabled, onDone }: { accountsEnabled: boolean; onDone: () => void }) {
  const router = useRouter();
  const setLearner = useStore((s) => s.setLearner);
  const setStudyPlan = useStore((s) => s.setStudyPlan);

  const [step, setStep] = useState<Step>('welcome');
  const [track, setTrack] = useState<Track>('new');
  const [start, setStart] = useState<string | null>(null);
  const [answers, setAnswers] = useState<PlacementAnswer[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(20);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function markSeen() {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1');
      localStorage.setItem(SPLASH_KEY, CURRENT_VERSION);
      localStorage.setItem(WELCOME_SEEN_KEY, '1');
    } catch {
      // Storage unavailable; worst case it asks again.
    }
  }

  /** Save the answers and go where they point. `skipped` saves nothing. */
  function finish(skipped = false, destination?: string) {
    markSeen();
    if (!skipped) {
      setLearner({ track, startLessonId: start, onboardedAt: new Date().toISOString() });
      setStudyPlan({ minutesPerDay: minutes });
    }
    onDone();
    if (destination) router.push(destination);
  }

  function destinationFor(): string {
    if (track === 'teacher') return accountsEnabled ? '/teach' : '/';
    if (track === 'ap') return '/';
    return start ? `/learn/${start}` : '/learn';
  }

  function chooseTrack(t: Track) {
    setTrack(t);
    if (t === 'new') {
      setStart(ALL_LESSONS[0]?.lesson.id ?? null);
      setStep('goal');
    } else if (t === 'some') {
      setStep('placement-intro');
    } else {
      setStart(null);
      setStep('goal');
    }
  }

  function answer(i: number) {
    if (chosen !== null) return;
    setChosen(i);
    const q = PLACEMENT[answers.length];
    const next = [...answers, { unit: q.unit, right: i === q.step.answer }];
    window.setTimeout(() => {
      setAnswers(next);
      setChosen(null);
      if (!placementContinues(next, PLACEMENT.length)) {
        const unit = placementStart(next) ?? unitBeyond(UNIT_IDS, PLACEMENT.map((x) => x.unit));
        const place = unit ? ALL_LESSONS.find((p) => p.unit.id === unit) : null;
        setStart(place?.lesson.id ?? null);
        setStep('placement-result');
      }
    }, 650);
  }

  const afterGoal = accountsEnabled && track !== 'ap' ? 'account' : null;

  return (
    <div
      className="no-print splash-scrim fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto px-5 py-10 sm:items-center"
      data-closing={false}
    >
      <div role="dialog" aria-modal="true" aria-label="Getting started" className="splash-card relative w-full max-w-xl" data-closing={false}>
        <button
          type="button"
          onClick={() => finish(true)}
          className="slab-sm absolute right-5 top-5"
          style={{ color: 'var(--fg-faint)' }}
        >
          Skip
        </button>
        <div className="px-7 pb-8 pt-10 sm:px-10">
          {step === 'welcome' && (
            <Frame>
              <span className="wordmark" style={{ fontSize: '3rem' }}>Lectio</span>
              <p className="mt-1" style={{ ...latin, fontStyle: 'italic', color: 'var(--fg-muted)' }}>lege, notā, mementō — read, mark, remember</p>
              <p className="measure mt-6" style={latin}>
                Latin from the very first word to the AP exam: short lessons in order, the real texts with every word glossed, and flashcards that come back just before you forget.
              </p>
              <p className="mt-3" style={{ ...latin, color: 'var(--fg-muted)' }}>A few questions, and you’ll be on your way.</p>
              <button type="button" className="btn btn-primary mt-8" onClick={() => setStep('track')} autoFocus>
                Begin
              </button>
            </Frame>
          )}

          {step === 'track' && (
            <Frame>
              <Heading rubric="1 of 3" title="Where are you starting?" />
              <div className="mt-6 flex w-full flex-col gap-3 text-left">
                <Choice title="I’m new to Latin" body="Start at the very beginning: the sounds, the first words, and why endings matter." onClick={() => chooseTrack('new')} />
                <Choice title="I know some Latin" body="Take a short check and start where it finds you, or choose a unit yourself." onClick={() => chooseTrack('some')} />
                <Choice title="I’m preparing for the AP exam" body="Go straight to Vergil and Pliny, the quiz and the practice exam. The course is always there." onClick={() => chooseTrack('ap')} />
                <Choice title="I teach Latin" body="Set up a classroom, assign sections, and see your students’ progress." onClick={() => chooseTrack('teacher')} />
              </div>
            </Frame>
          )}

          {step === 'placement-intro' && (
            <Frame>
              <Heading rubric="Finding your level" title="A quick check" />
              <p className="measure mt-4" style={latin}>
                Up to {PLACEMENT.length} short questions, easiest first. It stops as soon as it finds your level, usually well before the end. No score is kept.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button type="button" className="btn btn-primary" onClick={() => setStep('placement')} autoFocus>Start the check</button>
                <button type="button" className="btn" onClick={() => setStep('pick-unit')}>I’ll choose a unit</button>
              </div>
            </Frame>
          )}

          {step === 'placement' && answers.length < PLACEMENT.length && (() => {
            const q = PLACEMENT[answers.length];
            return (
              <div key={answers.length} className="animate-in">
                <div className="mb-4 flex items-center gap-3">
                  <div className="meter meter-thin flex-1" role="progressbar" aria-valuenow={answers.length} aria-valuemin={0} aria-valuemax={PLACEMENT.length} aria-label="Placement progress">
                    <span style={{ width: `${(answers.length / PLACEMENT.length) * 100}%` }} />
                  </div>
                  <span className="slab-sm tabular-nums" style={{ color: 'var(--fg-muted)' }}>{answers.length + 1}</span>
                </div>
                <h2 className="mb-3" style={{ fontSize: '1.25rem', fontWeight: 550 }}><Rich text={q.step.prompt} /></h2>
                {q.step.latin && <p className="latin mb-5" style={{ fontSize: '1.5rem', margin: '0 0 1.25rem' }}>{q.step.latin}</p>}
                <div className="flex flex-col gap-2.5">
                  {q.step.options.map((o, i) => {
                    const style: CSSProperties = { borderColor: 'var(--rule-strong)' };
                    if (chosen !== null && i === q.step.answer) { style.borderColor = 'var(--correct)'; style.background = 'var(--correct-bg)'; }
                    else if (chosen === i) { style.borderColor = 'var(--accent)'; style.background = 'var(--incorrect-bg)'; }
                    return (
                      <button key={i} type="button" disabled={chosen !== null} onClick={() => answer(i)}
                        className="squish row-hover rounded-[var(--r-md)] border px-4 py-3 text-left" style={{ ...style, ...latin }}>
                        <Rich text={o} />
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="slab-sm mt-5" style={{ color: 'var(--fg-muted)' }}
                  onClick={() => { const next = [...answers, { unit: q.unit, right: false }]; setAnswers(next); const unit = placementStart(next); setStart(ALL_LESSONS.find((p) => p.unit.id === unit)?.lesson.id ?? null); setStep('placement-result'); }}>
                  I don’t know this yet
                </button>
              </div>
            );
          })()}

          {step === 'placement-result' && (() => {
            const place = start ? ALL_LESSONS.find((p) => p.lesson.id === start) : null;
            return (
              <Frame>
                <Heading rubric="Your starting point" title={place ? `${place.level.title}, Unit ${place.unit.n}` : 'You know it all so far'} />
                <p className="measure mt-4" style={latin}>
                  {place && answers.every((a) => a.right) ? (
                    <>You answered everything right, so start with the AP texts themselves: <em>{place.unit.title}</em>. The grammar units will be there whenever you want to review them.</>
                  ) : place ? (
                    <>Start with <em>{place.unit.title}</em>. The units before it will be there whenever you want to review them.</>
                  ) : (
                    <>You answered everything right: you know every unit the course has so far. New units are on the way; until then, go on to the AP passages, or review with the readings at the end of each unit.</>
                  )}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button type="button" className="btn btn-primary" onClick={() => setStep('goal')} autoFocus>Sounds good</button>
                  <button type="button" className="btn" onClick={() => setStep('pick-unit')}>Choose another unit</button>
                </div>
              </Frame>
            );
          })()}

          {step === 'pick-unit' && (
            <Frame>
              <Heading rubric="Choose a unit" title="Where would you like to start?" />
              <div className="mt-6 flex w-full flex-col text-left">
                {COURSE.flatMap((level) => level.units.map((unit) => (
                  <button key={unit.id} type="button" className="row-hover border-t py-3 text-left" style={{ borderColor: 'var(--rule)' }}
                    onClick={() => { setStart(unit.lessons[0]?.id ?? null); setStep('goal'); }}>
                    <span className="slab-sm" style={{ color: 'var(--fg-muted)' }}>{level.title} · Unit {unit.n}</span>
                    <span className="block" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem' }}>{unit.title}</span>
                  </button>
                )))}
              </div>
            </Frame>
          )}

          {step === 'goal' && (
            <Frame>
              <Heading rubric="2 of 3" title="How much time a day?" />
              <p className="measure mt-3" style={{ ...latin, color: 'var(--fg-muted)' }}>A little every day beats a lot now and then. You can change this any time in the Study Plan.</p>
              <div className="mt-6 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                {[10, 20, 30, 45].map((m) => (
                  <button key={m} type="button" onClick={() => setMinutes(m)} aria-pressed={minutes === m}
                    className="squish rounded-[var(--r-md)] border px-3 py-4"
                    style={{ borderColor: minutes === m ? 'var(--accent)' : 'var(--rule-strong)', background: minutes === m ? 'var(--incorrect-bg)' : 'transparent' }}>
                    <span className="numeral block" style={{ fontSize: '1.75rem', lineHeight: 1 }}>{m}</span>
                    <span className="slab-sm" style={{ color: 'var(--fg-muted)' }}>minutes</span>
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-primary mt-8" autoFocus
                onClick={() => (afterGoal ? setStep('account') : finish(false, destinationFor()))}>
                Continue
              </button>
            </Frame>
          )}

          {step === 'account' && (
            <Frame>
              <Heading rubric="3 of 3" title={track === 'teacher' ? 'Create a teacher account' : 'Keep your progress safe'} />
              <p className="measure mt-4" style={latin}>
                {track === 'teacher'
                  ? 'Classrooms need an account. It takes a minute, and your students can join with a code.'
                  : 'Everything works without an account, and your progress stays on this device. With a free account it follows you to every browser and to the iPhone and iPad app.'}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="btn btn-primary" onClick={() => finish(false)}>Create an account</Link>
                <Link href="/login" className="btn" onClick={() => finish(false)}>Sign in</Link>
                <button type="button" className="btn btn-ghost" onClick={() => finish(false, destinationFor())}>Not now</button>
              </div>
            </Frame>
          )}
        </div>
      </div>
    </div>
  );
}

const latin: CSSProperties = { fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.55, color: 'var(--ink2)' };

function Frame({ children }: { children: ReactNode }) {
  return <div className="animate-in flex flex-col items-center text-center">{children}</div>;
}

function Heading({ rubric, title }: { rubric: string; title: string }) {
  return (
    <>
      <div className="rubric mb-2">{rubric}</div>
      <h2 style={{ fontSize: '1.75rem', lineHeight: 1.2 }}>{title}</h2>
    </>
  );
}

function Choice({ title, body, onClick }: { title: string; body: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="squish row-hover rounded-[var(--r-md)] border px-5 py-4 text-left" style={{ borderColor: 'var(--rule-strong)' }}>
      <span className="block" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1875rem' }}>{title}</span>
      <span className="block" style={{ ...latin, fontSize: '1rem', color: 'var(--fg-muted)' }}>{body}</span>
    </button>
  );
}
