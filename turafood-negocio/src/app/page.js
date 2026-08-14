'use client';

import { useState } from 'react';

export default function BusinessWizard() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const steps = [
    {
      title: 'Datos del Negocio',
      sub: 'Información básica para tus clientes',
      tag: 'PASO 1 DE 4',
      fields: [
        { label: 'Nombre del restaurante o tienda', placeholder: 'Ej. Asados Doña Juana', isText: true },
        { label: 'Categoría principal', isSelect: true, options: [
          { label: 'Restaurante', style: 'border:1px solid var(--border); background:var(--surface)' },
          { label: 'Comidas Rápidas', style: 'border:1px solid var(--border); background:var(--surface)' },
          { label: 'Licores', style: 'border:1px solid var(--border); background:var(--surface)' },
          { label: 'Farmacia', style: 'border:1px solid var(--border); background:var(--surface)' },
        ]},
      ]
    },
    {
      title: 'Ubicación y Contacto',
      sub: 'Para recoger los pedidos y coordinar',
      tag: 'PASO 2 DE 4',
      fields: [
        { label: 'Dirección completa', placeholder: 'Barrio, calle, número', isText: true },
        { label: 'Teléfono de contacto (WhatsApp)', placeholder: '300 000 0000', isText: true },
      ]
    },
    {
      title: 'Documentos',
      sub: 'Para validar tu negocio y poder pagarte',
      tag: 'PASO 3 DE 4',
      fields: [
        { label: 'Cédula de ciudadanía o RUT', placeholder: 'Sube una foto clara', isUpload: true },
        { label: 'Certificado bancario (Opcional por ahora)', placeholder: 'Para recibir transferencias', isUpload: true },
      ]
    },
    {
      title: 'Personaliza tu Tienda',
      sub: 'Dale identidad a tu negocio',
      tag: 'PASO 4 DE 4',
      fields: [
        { label: 'Logo del negocio', placeholder: 'Logo o foto de perfil', isUpload: true },
        { label: 'Foto de portada', placeholder: 'Aparecerá arriba en tu tienda', isUpload: true },
      ]
    }
  ];

  const currentStep = steps[step - 1];

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
    else {
      alert("¡Registro completado! Redirigiendo al Kanban...");
      // router.push('/dashboard')
    }
  };
  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Sidebar for Desktop */}
      <div style={{ flex: 'none', width: '44%', maxWidth: '620px', background: 'var(--sidebar)', color: '#fff', padding: '52px 56px', display: 'flex', flexDirection: 'column' }} className="hidden md:flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '13px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: '23px' }}>t</div>
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: '19px', letterSpacing: '-.01em' }}>Tura Shop</div>
            <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.5)', fontWeight: 700, letterSpacing: '.05em' }}>NEGOCIOS</div>
          </div>
        </div>
        <div style={{ marginTop: 'auto', maxWidth: '430px' }}>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: '38px', lineHeight: 1.08, letterSpacing: '-.025em', textWrap: 'balance' }}>Vende en línea en todo Buenaventura.</div>
          <div style={{ marginTop: '16px', fontSize: '15px', lineHeight: 1.6, color: 'rgba(255,255,255,.62)' }}>Restaurantes, farmacias, minimercados y licoreras. Publica tu catálogo, recibe pedidos y cobra sin montar tu propia app.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '34px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '10px', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px', color: 'var(--primary)' }}>store</span></span>
              <span style={{ flex: 1, fontSize: '14px', lineHeight: 1.5, color: 'rgba(255,255,255,.86)', paddingTop: '4px' }}>Tu propia tienda online en minutos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '10px', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px', color: 'var(--primary)' }}>payments</span></span>
              <span style={{ flex: 1, fontSize: '14px', lineHeight: 1.5, color: 'rgba(255,255,255,.86)', paddingTop: '4px' }}>Acepta Nequi, Daviplata y Tarjetas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ width: '30px', height: '30px', borderRadius: '10px', background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px', color: 'var(--primary)' }}>delivery_dining</span></span>
              <span style={{ flex: 1, fontSize: '14px', lineHeight: 1.5, color: 'rgba(255,255,255,.86)', paddingTop: '4px' }}>Conecta con repartidores locales</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '40px', fontSize: '12px', color: 'rgba(255,255,255,.36)' }}>Aprobación en menos de 24 horas · Sin costo de instalación</div>
      </div>

      {/* Main Wizard Area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', overflowY: 'auto' }} className="w-full md:w-auto">
        <div style={{ width: '100%', maxWidth: '470px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {[1, 2, 3, 4].map(num => (
              <span key={num} style={{ flex: 1, height: '5px', borderRadius: '99px', background: num <= step ? 'var(--primary)' : 'var(--surface2)' }}></span>
            ))}
          </div>
          
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '.06em', marginTop: '22px' }}>{currentStep.tag}</div>
          <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: '29px', letterSpacing: '-.02em', marginTop: '6px' }}>{currentStep.title}</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.55, marginTop: '8px' }}>{currentStep.sub}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '26px' }}>
            {currentStep.fields.map((f, i) => (
              <label key={i} style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--muted)', marginBottom: '7px' }}>{f.label}</span>
                
                {f.isText && (
                  <input placeholder={f.placeholder} style={{ width: '100%', height: '50px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--surface)', padding: '0 15px', fontSize: '14px', outline: 'none' }} />
                )}

                {f.isUpload && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '64px', borderRadius: '14px', border: '1.5px dashed var(--faint)', background: 'var(--surface)', padding: '0 16px', cursor: 'pointer' }}>
                    <span style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '19px', color: 'var(--muted)' }}>upload_file</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 700 }}>{f.placeholder}</span>
                      <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>PDF o imagen · máx. 8 MB</span>
                    </span>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--primary)', flex: 'none' }}>Subir</span>
                  </span>
                )}

                {f.isSelect && (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: '9px' }}>
                    {f.options.map((o, j) => (
                      <button key={j} style={{ height: '40px', padding: '0 15px', borderRadius: '12px', fontSize: '13.5px', fontWeight: 700, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                        {o.label}
                      </button>
                    ))}
                  </span>
                )}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '28px' }}>
            {step > 1 && (
              <button onClick={prevStep} style={{ height: '52px', padding: '0 22px', borderRadius: '15px', border: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 700, fontSize: '14.5px' }}>Atrás</button>
            )}
            <button onClick={nextStep} style={{ flex: 1, height: '52px', borderRadius: '15px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '15px', boxShadow: '0 10px 24px rgba(255,68,31,.3)' }}>
              {step === totalSteps ? 'Finalizar Registro' : 'Continuar'}
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', marginTop: '18px' }}>
            <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px', color: 'var(--muted)' }}>verified_user</span>
            <span style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.5 }}>Tu tienda queda activa de inmediato con un límite de 20 pedidos diarios. El equipo de Tura Shop revisa los documentos en las siguientes 24 horas para levantar el límite.</span>
          </div>
          <button style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: '20px', fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>Ya tengo cuenta · Iniciar sesión</button>

        </div>
      </div>
    </div>
  );
}
