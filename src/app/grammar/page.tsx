import type { Metadata } from 'next';
import Link from 'next/link';
import { grammarTopics } from '@/data/grammar';
import { getPassage } from '@/data/passages';
import { Page, PageHeader, Card, Badge } from '@/components/ui';

export const metadata: Metadata = { title: 'Grammar & Syntax' };

const CATEGORY_LABELS: Record<string, string> = {
  clause: 'Clauses',
  case: 'Case uses',
  verbal: 'Verbal nouns',
  mood: 'Mood',
  participle: 'Participles',
};

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

      <nav aria-label="Jump to topic" className="mb-8 flex flex-wrap gap-1.5">
        {grammarTopics.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-[var(--bg-sunk)]"
            style={{ borderColor: 'var(--rule)', color: 'var(--fg-muted)' }}
          >
            {t.name}
          </a>
        ))}
      </nav>

      {categories.map((cat) => (
        <section key={cat} className="mb-10">
          <h2 className="eyebrow mb-3">{CATEGORY_LABELS[cat] ?? cat}</h2>
          <div className="flex flex-col gap-5">
            {grammarTopics
              .filter((t) => t.category === cat)
              .map((topic) => (
                <Card key={topic.id} as="article" className="scroll-mt-6">
                  <div id={topic.id} className="scroll-mt-20" />
                  <h3 style={{ fontSize: '1.125rem' }}>{topic.name}</h3>
                  <p className="measure mt-1.5 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.7 }}>
                    {topic.summary}
                  </p>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="eyebrow mb-1.5">How to spot it</div>
                      <ul className="flex flex-col gap-1">
                        {topic.recognition.map((r) => (
                          <li key={r} className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            • {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="eyebrow mb-1.5">How to translate it</div>
                      <ul className="flex flex-col gap-1">
                        {topic.translation.map((r) => (
                          <li key={r} className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            • {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--rule)' }}>
                    <div className="eyebrow mb-2.5">From the syllabus</div>
                    <ul className="flex flex-col gap-3.5">
                      {topic.examples.map((ex, i) => {
                        const p = ex.passageId ? getPassage(ex.passageId) : undefined;
                        return (
                          <li key={i}>
                            <p
                              className="latin"
                              style={{ margin: 0, fontSize: '1.1875rem', maxWidth: '100%' }}
                            >
                              {ex.latin}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              {p ? (
                                <Link
                                  href={`/read/${p.id}`}
                                  className="text-xs hover:underline"
                                  style={{ color: 'var(--accent)' }}
                                >
                                  {ex.citation}
                                </Link>
                              ) : (
                                <span className="text-xs" style={{ color: 'var(--fg-faint)' }}>
                                  {ex.citation}
                                </span>
                              )}
                            </div>
                            <p className="measure mt-1 text-sm" style={{ color: 'var(--fg-muted)', lineHeight: 1.65 }}>
                              {ex.analysis}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <Link href={`/quiz?type=grammar-syntax`} className="btn text-xs">
                      Drill this in the Quiz Engine
                    </Link>
                  </div>
                </Card>
              ))}
          </div>
        </section>
      ))}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" style={{ color: 'var(--fg-muted)', margin: 0 }}>
            Every example above is checked against the passage it cites by{' '}
            <code style={{ fontSize: '0.85em' }}>npm run verify</code>.
          </p>
          <Badge tone="green">{grammarTopics.length} topics</Badge>
        </div>
      </Card>
    </Page>
  );
}
