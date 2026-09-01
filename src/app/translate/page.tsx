import type { Metadata } from 'next';
import Translate from './Translate';

export const metadata: Metadata = { title: 'Translate' };

export default function TranslatePage() {
  return <Translate />;
}
