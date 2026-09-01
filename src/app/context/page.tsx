import type { Metadata } from 'next';
import ContextCards from './ContextCards';

export const metadata: Metadata = { title: 'Context & Culture' };

export default function ContextPage() {
  return <ContextCards />;
}
