import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allPassages, getPassage } from '@/data/passages';
import Reader from './Reader';

export function generateStaticParams() {
  return allPassages.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = getPassage(id);
  return { title: p ? `${p.citation} — ${p.title}` : 'Passage' };
}

export default async function PassagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const passage = getPassage(id);
  if (!passage) notFound();

  const idx = allPassages.findIndex((p) => p.id === id);
  const prev = idx > 0 ? allPassages[idx - 1] : null;
  const next = idx < allPassages.length - 1 ? allPassages[idx + 1] : null;

  return (
    <Reader
      passage={passage}
      prev={prev ? { id: prev.id, citation: prev.citation } : null}
      next={next ? { id: next.id, citation: next.citation } : null}
    />
  );
}
