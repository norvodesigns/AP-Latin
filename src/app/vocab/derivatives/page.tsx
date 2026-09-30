import type { Metadata } from 'next';
import DerivativesSession from './DerivativesSession';

export const metadata: Metadata = {
  title: 'Derivatives · Vocabulary',
  description: 'Ten questions on the English words that come from Latin ones.',
};

export default function DerivativesPage() {
  return <DerivativesSession />;
}
