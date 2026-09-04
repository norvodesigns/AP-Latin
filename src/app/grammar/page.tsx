import type { Metadata } from 'next';
import Grammar from './Grammar';

export const metadata: Metadata = { title: 'Grammar & Syntax' };

export default function GrammarPage() {
  return <Grammar />;
}
