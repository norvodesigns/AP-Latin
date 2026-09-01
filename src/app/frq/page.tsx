import type { Metadata } from 'next';
import FrqWorkshop from './FrqWorkshop';

export const metadata: Metadata = { title: 'FRQ Workshop' };

export default function FrqPage() {
  return <FrqWorkshop />;
}
