import type { Metadata } from 'next';
import ImportedReader from './ImportedReader';

export const metadata: Metadata = { title: 'Your text', robots: { index: false } };

export default async function ImportedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ImportedReader id={decodeURIComponent(id)} />;
}
