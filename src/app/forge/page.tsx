import type { Metadata } from 'next';
import Forge from './Forge';

export const metadata: Metadata = {
  title: 'Forms Forge',
  description: 'Every Latin ending, drilled until it is automatic: fill the chart, make the form, name the form.',
};

export default function ForgePage() {
  return <Forge />;
}
