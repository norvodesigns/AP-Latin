import type { Metadata } from 'next';
import { Suspense } from 'react';
import ScansionHistory from './ScansionHistory';

export const metadata: Metadata = {
  title: 'Your scans · Scansion Lab',
  description: 'Every line you have checked in the Scansion Lab, with your marks and what was right.',
};

export default function ScansionHistoryPage() {
  return (
    <Suspense fallback={null}>
      <ScansionHistory />
    </Suspense>
  );
}
