import type { Metadata } from 'next';
import SightReading from './SightReading';

export const metadata: Metadata = { title: 'Sight Reading' };

export default function SightPage() {
  return <SightReading />;
}
