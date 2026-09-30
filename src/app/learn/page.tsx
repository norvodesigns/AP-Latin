import type { Metadata } from 'next';
import CourseMap from './CourseMap';

export const metadata: Metadata = {
  title: 'Course',
  description: 'Latin from the first word to the AP syllabus: short lessons, every one with practice, in order.',
};

export default function LearnPage() {
  return <CourseMap />;
}
