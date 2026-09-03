import type { Metadata } from 'next';
import Link from 'next/link';
import { grammarTopics } from '@/data/grammar';
import { getPassage } from '@/data/passages';
import { Page, PageHeader, Section, SourceNote } from '@/components/ui';

export const metadata: Metadata = { title: 'Grammar & Syntax' };

const CATEGORY_LABELS: Record<string, string> = {
  clause: 'Clauses',
  case: 'Case uses',
  verbal: 'Verbal nouns',
  mood: 'Mood',
  participle: 'Participles',
};

/** A short ruled list — "how to spot it" / "how to translate it". */
function Cues({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="slab-sm mb-2.5">{title}</div>
      <ul className="flex flex-col gap-1.5 pl-0" style={{ listStyle: 'none' }}>
        {items.map((r) => (
          <li
            key={r}
            className="flex gap-2.5"
            style={{
              fontFamily: 'var(--font-latin)',
              fontSize: '1rem',
              lineHeight: 1.55,
              color: 'var(--ink2)',
            }}
          >
            <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
              ·
            </span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function GrammarPage() {
  const categories = [...new Set(grammarTopics.map((t) => t.category))];

  return (
    <Page wide>
      <PageHeader
        eyebrow="Skill 1.B · 10–20% of the exam"
        title="Grammar &amp; Syntax"
        lede={
          <>
            The constructions AP actually tests, each with how to recognise it, how to render it in a
            literal translation, and examples pulled from the real syllabus passages.
          </>
        }
      />

      <nav aria-label="Jump to topic" className="mb-10 flex flex-wrap gap-2">
        {grammarTopics.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="chip squish">
            {t.name}
          </a>
        ))}
      </nav>

      {categories.map((cat) => (
        <Section key={cat} title={CATEGORY_LABELS[cat] ?? cat} className="mb-14">
          <div className="stagger flex flex-col">
            {grammarTopics
              .filter((t) => t.category === cat)
              .map((topic) => (
                <article
                  key={topic.id}
                  className="border-t pt-7 pb-10"
                  style={{ borderColor: 'var(--rule)' }}
                >
                  <div id={topic.id} className="scroll-mt-24" />
                  <h3 style={{ fontSize: '1.25rem', lineHeight: 1.25 }}>{topic.name}</h3>
                  <p
                    className="measure"
                    style={{
                      margin: '0.5rem 0 0',
                      fontFamily: 'var(--font-latin)',
                      fontSize: '1.0625rem',
                      lineHeight: 1.7,
                      color: 'var(--ink2)',
                    }}
                  >
                    {topic.summary}
                  </p>

                  <div className="mt-6 grid gap-7 sm:grid-cols-2">
                    <Cues title="How to spot it" items={topic.recognition} />
                    <Cues title="How to translate it" items={topic.translation} />
                  </div>

                  <div className="mt-7">
                    <div className="rubric mb-4">From the syllabus</div>
                    <ul className="flex flex-col gap-5 pl-0" style={{ listStyle: 'none' }}>
                      {topic.examples.map((ex, i) => {
                        const p = ex.passageId ? getPassage(ex.passageId) : undefined;
                        return (
                          <li
                            key={i}
                            className="border-l-2 pl-4"
                            style={{ borderColor: 'var(--redline)' }}
                          >
                            <p
                              className="latin"
                              style={{ margin: 0, fontSize: '1.1875rem', maxWidth: '100%' }}
                            >
                              {ex.latin}
                            </p>
                            {p ? (
                              <Link
                                href={`/read/${p.id}`}
                                className="link-rule mt-1 inline-block"
                                style={{ color: 'var(--accent)', fontSize: '0.9375rem' }}
                              >
                                {ex.citation}
                              </Link>
                            ) : (
                              <span
                                className="mt-1 inline-block"
                                style={{ color: 'var(--fg-faint)', fontSize: '0.9375rem' }}
                              >
                                {ex.citation}
                              </span>
                            )}
                            <p
                              className="measure"
                              style={{
                                margin: '0.375rem 0 0',
                                fontFamily: 'var(--font-latin)',
                                fontSize: '1rem',
                                lineHeight: 1.6,
                                color: 'var(--ink2)',
                              }}
                            >
                              {ex.analysis}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-6">
                    <Link href="/quiz?type=grammar-syntax" className="btn">
                      Drill this in the Quiz Engine
                    </Link>
                  </div>
                </article>
              ))}
          </div>
        </Section>
      ))}

      <SourceNote to="skills">
        {grammarTopics.length} constructions, every example checked against the passage it cites by{' '}
        <code style={{ fontSize: '0.9em' }}>npm run verify</code>. The skill this serves — “Read and
        comprehend Latin” — is defined in the official Course and Exam Description.
      </SourceNote>
    </Page>
  );
}
