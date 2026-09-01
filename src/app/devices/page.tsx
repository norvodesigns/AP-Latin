import type { Metadata } from 'next';
import Devices from './Devices';

export const metadata: Metadata = { title: 'Literary Devices' };

export default function DevicesPage() {
  return <Devices />;
}
