import type { Metadata } from 'next';
import Vocabulary from './Vocabulary';

export const metadata: Metadata = { title: 'Vocabulary' };

export default function VocabPage() {
  return <Vocabulary />;
}
