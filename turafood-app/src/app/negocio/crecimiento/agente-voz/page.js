'use client';

import { VOICE_AGENT } from '@/lib/serviciosConfig';
import ServiceWizard from '../ServiceWizard';

export default function AgenteVozPage() {
  return <ServiceWizard config={VOICE_AGENT} />;
}
