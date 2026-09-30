import type { Metadata } from 'next';
import DailySession from './DailySession';

export const metadata: Metadata = {
  title: 'Sententia of the day',
  description: 'One famous line of Latin a day, with the words you need and three quick questions.',
};

export default function DailyPage() {
  return <DailySession />;
}
