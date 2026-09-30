import type { Metadata } from 'next';
import SpeedRound from './SpeedRound';

export const metadata: Metadata = {
  title: 'Speed round · Vocabulary',
  description: 'A minute to match as many Latin words to their meanings as you can.',
};

export default function SpeedPage() {
  return <SpeedRound />;
}
