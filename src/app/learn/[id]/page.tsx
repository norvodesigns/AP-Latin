import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ALL_LESSONS, lessonPlace } from '@/data/curriculum';
import LessonPlayer from './LessonPlayer';

export function generateStaticParams() {
  return ALL_LESSONS.map((p) => ({ id: p.lesson.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const place = lessonPlace(id);
  if (!place) return {};
  const title = place.lesson.title.replace(/\*/g, '');
  return { title: `${title} · Course`, description: place.lesson.summary.replace(/\*/g, '') };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!lessonPlace(id)) notFound();
  return <LessonPlayer lessonId={id} />;
}
