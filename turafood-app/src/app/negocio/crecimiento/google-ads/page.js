'use client';

import { GOOGLE_ADS } from '@/lib/serviciosConfig';
import ServiceWizard from '../ServiceWizard';

export default function GoogleAdsPage() {
  return <ServiceWizard config={GOOGLE_ADS} />;
}
