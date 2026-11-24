import type { Metadata } from 'next';
import ImportText from './ImportText';

export const metadata: Metadata = { title: 'Import a text' };

export default function ImportPage() {
  return <ImportText />;
}
