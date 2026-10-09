'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoTuraMueblesPage() {
  const router = useRouter();

  useEffect(() => {
    window.location.href = '/demo-turamuebles.html';
  }, [router]);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0C0B0A', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🛋️</div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Cargando Demo Tura Muebles Editorial Luxury…</div>
      </div>
    </div>
  );
}
