'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoRestPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/store/asadero-el-puerto?skin=vibrant');
  }, [router]);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F6F5F2', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🍔</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#17140F' }}>Cargando Demo E-Commerce Restaurante…</div>
      </div>
    </div>
  );
}
