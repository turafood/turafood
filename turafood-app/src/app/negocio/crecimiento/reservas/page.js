'use client';

import { BOOKING } from '@/lib/serviciosConfig';
import ServiceWizard from '../ServiceWizard';

export default function ReservasPage() {
  return <ServiceWizard config={BOOKING} />;
}
