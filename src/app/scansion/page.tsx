import type { Metadata } from 'next';
import ScansionLab from './ScansionLab';

export const metadata: Metadata = { title: 'Scansion Lab' };

export default function ScansionPage() {
  return <ScansionLab />;
}
