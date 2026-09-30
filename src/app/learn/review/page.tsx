import type { Metadata } from 'next';
import ReviewSession from './ReviewSession';

export const metadata: Metadata = {
  title: 'Review · Course',
  description: 'Exercises from the course lessons you have finished, weighted toward the hardest.',
};

export default function ReviewPage() {
  return <ReviewSession />;
}
