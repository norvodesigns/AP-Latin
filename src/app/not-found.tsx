/* eslint-disable @next/next/no-html-link-for-pages -- plain links on purpose; see below. */
/**
 * A page that isn't here, in the site's own dress rather than Next's white default.
 *
 * Plain markup only, no client components (not even `Link`): the root
 * not-found travels in every page's server payload, and a client component
 * here is resolved against the home page's chunk list, which would make every
 * page download the dashboard's code (the whole course and glossary).
 */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-10 sm:py-12">
      <header className="mb-9 border-b pb-7" style={{ borderColor: 'var(--rule)' }}>
        <div className="rubric mb-4">Error 404</div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 1.3rem + 2vw, 2.5rem)', lineHeight: 1.1 }}>
          Nōn inveniō: there is no page here
        </h1>
        <p
          className="measure mt-3"
          style={{ fontFamily: 'var(--font-latin)', fontSize: '1.125rem', lineHeight: 1.55, color: 'var(--ink2)' }}
        >
          The address may be mistyped, or the page may have moved. Everything the site has is one step from the dashboard
          or the index.
        </p>
      </header>
      <div className="flex flex-wrap gap-4">
        <a href="/" className="btn btn-primary">
          Dashboard
        </a>
        <a href="/learn" className="btn">
          The course
        </a>
        <a href="/read" className="btn">
          Reading Room
        </a>
      </div>
    </div>
  );
}
