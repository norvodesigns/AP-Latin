import type { Metadata } from 'next';
import StudyPlan from './StudyPlan';

export const metadata: Metadata = { title: 'Study Plan' };

export default function PlanPage() {
  return <StudyPlan />;
}
