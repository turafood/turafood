'use client';

import { GMB } from '@/lib/serviciosConfig';
import ServiceWizard from '../ServiceWizard';

export default function GoogleNegocioPage() {
  return <ServiceWizard config={GMB} />;
}
