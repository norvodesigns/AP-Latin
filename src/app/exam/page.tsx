import type { Metadata } from 'next';
import PracticeExam from './PracticeExam';

export const metadata: Metadata = { title: 'Practice Exam' };

export default function ExamPage() {
  return <PracticeExam />;
}
