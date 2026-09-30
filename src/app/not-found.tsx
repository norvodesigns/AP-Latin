import Link from 'next/link';
import { Page, PageHeader } from '@/components/ui';

/** A page that isn't here, in the site's own dress rather than Next's white default. */
export default function NotFound() {
  return (
    <Page>
      <PageHeader
        eyebrow="Error 404"
        title="Nōn inveniō: there is no page here"
        lede="The address may be mistyped, or the page may have moved. Everything the site has is one step from the dashboard or the index."
      />
      <div className="flex flex-wrap gap-4">
        <Link href="/" className="btn btn-primary">
          Dashboard
        </Link>
        <Link href="/learn" className="btn">
          The course
        </Link>
        <Link href="/read" className="btn">
          Reading Room
        </Link>
      </div>
    </Page>
  );
}
