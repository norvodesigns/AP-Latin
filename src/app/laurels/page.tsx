import type { Metadata } from 'next';
import Laurels from './Laurels';

export const metadata: Metadata = {
  title: 'Laurels',
  description: 'Achievements across the course, reading, vocabulary, quizzes, the exam, scansion and the Sententia.',
};

export default function LaurelsPage() {
  return <Laurels />;
}
