import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ALL_LESSONS, lessonAfter, lessonPlace } from '@/data/curriculum';
import { pathLessons } from '@/lib/path';
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
  const place = lessonPlace(id);
  if (!place) notFound();
  // Only this lesson goes to the browser, not the course it comes from.
  const after = lessonAfter(id);
  const n = place.unit.lessons.indexOf(place.lesson) + 1;
  const course = {
    lesson: place.lesson,
    eyebrow: place.level.track === 'vocabulary'
      ? `${place.level.title} · ${place.unit.title} · ${place.lesson.test ? 'Unit test' : `Lesson ${n}`}`
      : `${place.level.title} · Unit ${place.unit.n} · Lesson ${n}`,
    next: after ? { id: after.lesson.id, title: after.lesson.title } : null,
    // A unit test, passed, counts its whole unit (src/lib/path.ts).
    unitLessons: place.lesson.test ? pathLessons(place.unit) : undefined,
  };
  return <LessonPlayer course={course} />;
}
