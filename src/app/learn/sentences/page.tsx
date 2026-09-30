import type { Metadata } from 'next';
import SentencesSession from './SentencesSession';

export const metadata: Metadata = {
  title: 'Sentence builder · Course',
  description: 'Sentences from the course, built from tiles: the Latin from its English, or the English from its Latin.',
};

export default function SentencesPage() {
  return <SentencesSession />;
}
