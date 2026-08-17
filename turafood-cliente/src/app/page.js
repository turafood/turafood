'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import HeroBackdrop from './components/HeroBackdrop';
import { GoogleMark, FacebookMark } from './components/SocialMarks';
export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('welcome'); // welcome | terms | phone | otp
  const [nextAuthMethod, setNextAuthMethod] = useState(''); // 'phone' | 'google'
  const [error, setError] = useState(null);

  const supabase = createClient();
  const router = useRouter();

  const handleOAuth = async (provider) => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/home` },
    });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+57${phone}`,
      });
      if (error) throw error;
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+57${phone}`,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      // Login successful, redirect happens in middleware or via router
      router.push('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#050505', color: '#fff', overflow: 'hidden' }}>
      
      {/* Fondo cinematográfico: las fotos se cruzan solas cada 6 s.
          Son las locales ya optimizadas, no una URL de terceros. */}
      <HeroBackdrop
        images={[
          '/images/burger-hero.jpg',
          '/images/steak-fork.jpg',
          '/images/steak-ribeye.jpg',
          '/images/food-fork.jpg',
          '/images/lamb-chops.jpg',
        ]}
      />

      {/* Header (opcional, si lo quieres flotando) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '30px 40px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '24px', color: '#fff', boxShadow: '0 4px 12px rgba(255,68,31,0.4)' }}>
            t
          </div>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '20px', letterSpacing: '-.02em', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>TuraFood</span>
        </div>
      </div>

      {/* Content Container (Glassmorphism PRO) */}
      <div className="sc" style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', padding: '20px', zIndex: 10 }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '480px', 
          margin: 'auto',
          background: 'linear-gradient(145deg, rgba(30, 30, 30, 0.4) 0%, rgba(10, 10, 10, 0.6) 100%)', 
          backdropFilter: 'blur(48px)', 
          WebkitBackdropFilter: 'blur(48px)',
          borderRadius: '36px', 
          padding: '36px 28px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2)',
          display: 'flex', 
          flexDirection: 'column',
          animation: 'pop 0.8s cubic-bezier(0.2, 0, 0, 1)'
        }}>

        {step === 'welcome' && (
          <div style={{ display: 'flex', flexDirection: 'column', animation: 'fade 0.4s ease' }}>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '38px', lineHeight: 1.05, letterSpacing: '-.03em', textWrap: 'balance', textAlign: 'center', marginBottom: '16px' }}>
              Todo el puerto,<br/>en una sola app.
            </div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '15px', lineHeight: 1.5, textAlign: 'center', padding: '0 10px' }}>
              Restaurantes, mercado, farmacia y mandados. Pedidos a domicilio rápidos.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px', marginTop: '28px' }}>
              <button 
                onClick={() => { setNextAuthMethod('phone'); setStep('terms'); }} 
                className="md3-btn md3-ripple"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', height: '50px', borderRadius: '999px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '15px', boxShadow: '0 10px 26px rgba(255,68,31,.4)' }}
              >
                <span style={{ fontFamily: 'Material Symbols Rounded', fontSize: '21px' }}>smartphone</span>
                Continuar con celular
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setNextAuthMethod('google'); setStep('terms'); }}
                  className="md3-btn md3-ripple"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', height: '48px', borderRadius: '999px', background: '#fff', color: '#17140F', fontWeight: 700, fontSize: '14px' }}
                >
                  <GoogleMark />
                  Google
                </button>
                <button
                  onClick={() => { setNextAuthMethod('facebook'); setStep('terms'); }}
                  className="md3-btn md3-ripple"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', height: '48px', borderRadius: '999px', background: '#1877F2', color: '#fff', fontWeight: 700, fontSize: '14px' }}
                >
                  <FacebookMark />
                  Facebook
                </button>
              </div>
              <button
                onClick={() => router.push('/home')}
                className="md3-btn md3-ripple"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '46px', color: 'rgba(255,255,255,.62)', fontWeight: 600, fontSize: '14px' }}
              >
                Explorar sin registrarme
              </button>
            </div>
          </div>
        )}

        {step === 'terms' && (
          <div style={{ display: 'flex', flexDirection: 'column', animation: 'slideup 0.3s ease' }}>
             <button type="button" onClick={() => setStep('welcome')} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', marginLeft: '-10px', transition: 'background 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
              <span style={{ fontFamily: 'Material Symbols Rounded', color: '#fff', fontSize: '20px' }}>arrow_back_ios_new</span>
             </button>
             <h2 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '26px', letterSpacing: '-.02em', marginBottom: '8px', lineHeight: 1.15, textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              Para registrarte, lee y acepta nuestras condiciones
             </h2>
             <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15.5px', fontWeight: 600, marginBottom: '32px' }}>
              Puntos clave que debes tener en cuenta
             </div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
               <div style={{ display: 'flex', gap: '18px' }}>
                 <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '26px', flex: 'none', filter: 'drop-shadow(0 2px 4px rgba(255,68,31,0.3))' }}>badge</span>
                 <p style={{ margin: 0, fontSize: '14.5px', color: '#EBEBEB', lineHeight: 1.5 }}>Usamos tu información para crear una cuenta, mostrarte restaurantes y contenido que podrían gustarte y mejorar nuestros servicios. <span style={{ color: '#4A8DFF', cursor: 'pointer', fontWeight: 600 }}>Más información.</span></p>
               </div>
               
               <div style={{ display: 'flex', gap: '18px' }}>
                 <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '26px', flex: 'none', filter: 'drop-shadow(0 2px 4px rgba(255,68,31,0.3))' }}>shield</span>
                 <p style={{ margin: 0, fontSize: '14.5px', color: '#EBEBEB', lineHeight: 1.5 }}>Puedes optar por proporcionar información sobre ti que podría tener protecciones especiales en virtud de las leyes locales. <span style={{ color: '#4A8DFF', cursor: 'pointer', fontWeight: 600 }}>Más información.</span></p>
               </div>
               
               <div style={{ display: 'flex', gap: '18px' }}>
                 <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '26px', flex: 'none', filter: 'drop-shadow(0 2px 4px rgba(255,68,31,0.3))' }}>settings</span>
                 <p style={{ margin: 0, fontSize: '14.5px', color: '#EBEBEB', lineHeight: 1.5 }}>Puedes acceder a tu información, modificarla o eliminarla en cualquier momento. <span style={{ color: '#4A8DFF', cursor: 'pointer', fontWeight: 600 }}>Más información.</span></p>
               </div>
               
               <div style={{ display: 'flex', gap: '18px' }}>
                 <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '26px', flex: 'none', filter: 'drop-shadow(0 2px 4px rgba(255,68,31,0.3))' }}>share</span>
                 <p style={{ margin: 0, fontSize: '14.5px', color: '#EBEBEB', lineHeight: 1.5 }}>Es posible que las personas que usan nuestro servicio hayan subido tu información de contacto a Tura Food AI. <span style={{ color: '#4A8DFF', cursor: 'pointer', fontWeight: 600 }}>Más información.</span></p>
               </div>
             </div>

             <div style={{ marginTop: '32px', fontSize: '13.5px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, textAlign: 'center' }}>
               Al registrarte, aceptas las <span style={{ color: '#4A8DFF', cursor: 'pointer' }}>Condiciones</span>, la <span style={{ color: '#4A8DFF', cursor: 'pointer' }}>Política de privacidad</span> y de <span style={{ color: '#4A8DFF', cursor: 'pointer' }}>cookies</span>.
             </div>

             <button 
                onClick={() => nextAuthMethod === 'phone' ? setStep('phone') : handleOAuth(nextAuthMethod)}
                className="md3-btn md3-ripple"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '56px', borderRadius: '16px', background: '#0064E0', color: '#fff', fontWeight: 800, fontSize: '16px', marginTop: '24px', boxShadow: '0 8px 24px rgba(0, 100, 224, 0.4)' }}
              >
                Acepto
              </button>
          </div>
        )}

        {step === 'phone' && (
          <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', animation: 'slideup 0.3s ease' }}>
             <button type="button" onClick={() => setStep('welcome')} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <span style={{ fontFamily: 'Material Symbols Rounded' }}>arrow_back</span>
             </button>
             <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '28px', letterSpacing: '-.02em', marginBottom: '8px' }}>
              Tu número de celular
             </div>
             <div style={{ color: 'rgba(255,255,255,.66)', fontSize: '14.5px', marginBottom: '24px' }}>
              Te enviaremos un código por SMS para verificar.
             </div>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,.08)', padding: '14px 18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,.12)' }}>
               <span style={{ fontWeight: 700, color: 'var(--faint)' }}>+57</span>
               <input 
                 type="tel"
                 required
                 autoFocus
                 value={phone}
                 onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').substring(0,10))}
                 placeholder="300 000 0000"
                 style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '18px', fontWeight: 600 }}
               />
             </div>

             {error && <div style={{ color: '#FF5252', fontSize: '13px', marginTop: '10px', fontWeight: 500 }}>{error}</div>}

             <button 
                type="submit"
                disabled={loading || phone.length < 10}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '56px', borderRadius: '999px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '15.5px', marginTop: '24px', opacity: (loading || phone.length < 10) ? 0.5 : 1 }}
              >
                {loading ? 'Enviando...' : 'Enviar código SMS'}
              </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', animation: 'slideup 0.3s ease' }}>
             <button type="button" onClick={() => setStep('phone')} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <span style={{ fontFamily: 'Material Symbols Rounded' }}>arrow_back</span>
             </button>
             <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '28px', letterSpacing: '-.02em', marginBottom: '8px' }}>
              Verifica tu número
             </div>
             <div style={{ color: 'rgba(255,255,255,.66)', fontSize: '14.5px', marginBottom: '24px' }}>
              Ingresa el código de 6 dígitos que enviamos al +57 {phone}
             </div>
             
             <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,.08)', padding: '14px 18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,.12)' }}>
               <input 
                 type="text"
                 required
                 autoFocus
                 value={otp}
                 onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0,6))}
                 placeholder="000000"
                 style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '24px', fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center' }}
               />
             </div>

             {error && <div style={{ color: '#FF5252', fontSize: '13px', marginTop: '10px', fontWeight: 500 }}>{error}</div>}

             <button 
                type="submit"
                disabled={loading || otp.length < 6}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '56px', borderRadius: '999px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '15.5px', marginTop: '24px', opacity: (loading || otp.length < 6) ? 0.5 : 1 }}
              >
                {loading ? 'Verificando...' : 'Confirmar'}
              </button>
          </form>
        )}

        </div>
      </div>
    </div>
    </>
  );
}
