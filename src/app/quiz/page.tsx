import type { Metadata } from 'next';
import { Suspense } from 'react';
import QuizEngine from './QuizEngine';

export const metadata: Metadata = { title: 'Quiz Engine' };

export default function QuizPage() {
  return (
    <Suspense fallback={null}>
      <QuizEngine />
    </Suspense>
  );
}
