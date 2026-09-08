import type { Metadata } from 'next';
import ReadIndex from './ReadIndex';

export const metadata: Metadata = { title: 'Reading Room' };

export default function ReadPage() {
  return <ReadIndex />;
}
