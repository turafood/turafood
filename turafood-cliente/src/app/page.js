'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
  const [lang, setLang] = useState('es');
  const [theme, setTheme] = useState('light');
  const [billing, setBilling] = useState('annual');
  const [faqOpen, setFaqOpen] = useState(0);
  const [cmpOpen, setCmpOpen] = useState(false);
  
  // Onboarding Modal State
  const [onbOpen, setOnbOpen] = useState(false);
  const [onbPlan, setOnbPlan] = useState('growth');
  const [onbStep, setOnbStep] = useState(0);
  const [onbAns, setOnbAns] = useState({});
  const [onbContact, setOnbContact] = useState({ restaurante: '', nombre: '', whatsapp: '', email: '' });
  const [payPhase, setPayPhase] = useState('');

  const es = lang === 'es';
  const an = billing === 'annual';

  // Inicializar Cal.com si está disponible en cliente
  useEffect(() => {
    try {
      (function (C, A, L) {
        let p = function (a, ar) { a.q.push(ar); };
        let d = C.document;
        C.Cal = C.Cal || function () {
          let cal = C.Cal;
          let ar = arguments;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            d.head.appendChild(d.createElement("script")).src = A;
            cal.loaded = true;
          }
          if (ar[0] === L) {
            const api = function () { p(api, arguments); };
            const namespace = ar[1];
            api.q = api.q || [];
            if (typeof namespace === "string") {
              cal.ns[namespace] = cal.ns[namespace] || api;
              p(cal.ns[namespace], ar);
              p(cal, ["initNamespace", namespace]);
            } else p(cal, ar);
            return;
          }
          p(cal, ar);
        };
      })(window, "https://app.cal.com/embed/embed.js", "init");

      if (window.Cal) {
        window.Cal("init", "growthpartner", { origin: "https://app.cal.com" });
        window.Cal.config = window.Cal.config || {};
        window.Cal.config.forwardQueryParams = true;
        window.Cal.ns?.["growthpartner"]?.("inline", {
          elementOrSelector: "#my-cal-inline-growthpartner",
          config: { layout: "month_view", useSlotsViewOnSmallScreen: "true" },
          calLink: "sophieaimkt/growthpartner"
        });
        window.Cal.ns?.["growthpartner"]?.("ui", {
          cssVarsPerTheme: {
            light: { "cal-brand": "#FF441F" },
            dark: { "cal-brand": "#FF441F" }
          },
          hideEventTypeDetails: false,
          layout: "month_view"
        });
      }
    } catch (e) {
      console.warn("Cal embed error:", e);
    }
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const fmt = (n) => n.toLocaleString('es-CO');
  const money = (n) => '$' + fmt(n);

  const planMeta = {
    starter: { name: 'Starter', icon: 'storefront', monthly: 0, annual: 0 },
    turafood: { name: 'Tura Food', icon: 'language', monthly: 89000, annual: 489000 },
    growth: { name: 'Tura Growth', icon: 'rocket_launch', monthly: 289000, annual: 890000, popular: true }
  };

  const openOnb = (plan) => {
    setOnbPlan(plan);
    setOnbOpen(true);
    setOnbStep(0);
    setOnbAns({});
    setPayPhase('');
    setOnbContact({ restaurante: '', nombre: '', whatsapp: '', email: '' });
  };

  const closeOnb = () => {
    setOnbOpen(false);
    setPayPhase('');
  };

  const onbQuestions = [
    {
      id: 'tipo',
      title: es ? '¿Qué tipo de negocio tienes?' : 'What kind of business do you run?',
      sub: es ? 'Adaptamos tu plataforma a tu operación.' : 'We tailor the platform to your operation.',
      options: [
        { v: 'restaurante', emoji: '🍽️', label: es ? 'Restaurante' : 'Restaurant' },
        { v: 'rapida', emoji: '🍔', label: es ? 'Comida rápida' : 'Fast food' },
        { v: 'cafe', emoji: '☕', label: es ? 'Cafetería / Bar' : 'Café / Bar' },
        { v: 'foodtruck', emoji: '🚚', label: 'Food truck' }
      ]
    },
    {
      id: 'sedes',
      title: es ? '¿Cuántas sedes manejas?' : 'How many locations?',
      sub: es ? 'Para dimensionar tu dashboard.' : 'To size your dashboard.',
      options: [
        { v: '1', emoji: '📍', label: es ? '1 sede' : '1 location' },
        { v: '2-3', emoji: '🏘️', label: '2 – 3' },
        { v: '4+', emoji: '🌆', label: es ? '4 o más' : '4 or more' }
      ]
    },
    {
      id: 'meta',
      title: es ? '¿Cuál es tu objetivo principal?' : 'What is your main goal?',
      sub: es ? 'Priorizamos tu onboarding según esto.' : 'We prioritize your onboarding by this.',
      options: [
        { v: 'reservas', emoji: '📅', label: es ? 'Más reservas' : 'More reservations' },
        { v: 'pedidos', emoji: '🛵', label: es ? 'Más pedidos a domicilio' : 'More delivery orders' },
        { v: 'whatsapp', emoji: '💬', label: es ? 'Automatizar WhatsApp' : 'Automate WhatsApp' },
        { v: 'web', emoji: '🌐', label: es ? 'Tener web profesional' : 'Get a professional website' }
      ]
    }
  ];

  const pickAns = (qid, v) => {
    setOnbAns((prev) => ({ ...prev, [qid]: v }));
    setTimeout(() => {
      if (onbStep < onbQuestions.length) {
        setOnbStep(onbStep + 1);
      }
    }, 180);
  };

  const onbNext = () => {
    if (onbStep < onbQuestions.length) setOnbStep(onbStep + 1);
  };

  const onbBack = () => {
    if (onbStep > 0) setOnbStep(onbStep - 1);
  };

  const goPay = () => {
    setPayPhase('loading');
    setTimeout(() => setPayPhase('done'), 2200);
  };

  // Comparativa y planes
  const curMeta = planMeta[onbPlan] || planMeta.growth;
  const isFree = curMeta.monthly === 0;

  let coLineLabel = '', coLineValue = '', coTotal = '$0', coTotalNote = '', coHasDisc = false, coDisc = '', coPeriod = '';
  if (isFree) {
    coLineLabel = es ? 'Plan' : 'Plan';
    coLineValue = es ? 'Gratis' : 'Free';
    coTotal = '$0';
    coTotalNote = es ? 'Sin tarjeta requerida' : 'No card required';
    coPeriod = es ? 'Gratis para siempre' : 'Free forever';
  } else if (an) {
    const perMo = Math.round(curMeta.annual / 12);
    coLineLabel = (es ? '12 meses × ' : '12 months × ') + money(perMo);
    coLineValue = money(curMeta.monthly * 12);
    coHasDisc = true;
    coDisc = money(curMeta.monthly * 12 - curMeta.annual);
    coTotal = money(curMeta.annual) + '/' + (es ? 'año' : 'yr');
    coTotalNote = (es ? 'Equivale a ' : 'Equals ') + money(perMo) + '/' + (es ? 'mes' : 'mo');
    coPeriod = es ? 'Plan anual · 12 meses' : 'Annual plan · 12 months';
  } else {
    coLineLabel = es ? '1 mes' : '1 month';
    coLineValue = money(curMeta.monthly);
    coTotal = money(curMeta.monthly) + '/' + (es ? 'mes' : 'mo');
    coTotalNote = es ? 'Se renueva cada mes' : 'Renews monthly';
    coPeriod = es ? 'Plan mensual' : 'Monthly plan';
  }

  const dashBars = [
    { h: '40%', bg: 'rgba(255,68,31,.35)' },
    { h: '58%', bg: 'rgba(255,68,31,.35)' },
    { h: '46%', bg: 'rgba(255,68,31,.35)' },
    { h: '70%', bg: 'rgba(255,68,31,.35)' },
    { h: '55%', bg: 'rgba(255,68,31,.35)' },
    { h: '82%', bg: 'rgba(255,68,31,.35)' },
    { h: '68%', bg: 'var(--primary)' },
    { h: '96%', bg: 'var(--primary)' }
  ];

  const faqs = [
    {
      q: es ? '¿Necesito conocimientos técnicos?' : 'Do I need technical skills?',
      a: es ? 'No. Nosotros configuramos todo en el onboarding: tu sitio, tu menú, tus reservas y tus automatizaciones. Tú solo gestionas desde el dashboard de app.turafood.com.' : 'No. We configure everything during onboarding: your site, menu, reservations and automations. You just manage from the dashboard at app.turafood.com.'
    },
    {
      q: es ? '¿Cómo funciona el cobro con Nequi y ePayco?' : 'How do Nequi and ePayco payments work?',
      a: es ? 'Conectas tu cuenta de Nequi en el onboarding y guardamos solo el identificador necesario. Cada pedido genera el cobro y el dinero llega a tu cuenta; el dashboard registra el estado. Los planes se pagan con ePayco (Nequi, PSE, tarjetas).' : 'You connect your Nequi account and each order sends funds directly to you. Plans can be paid via ePayco (Nequi, PSE, cards).'
    },
    {
      q: es ? '¿Qué hace exactamente el Voice AI?' : 'What does the Voice AI actually do?',
      a: es ? 'Es un host con Inteligencia Artificial que contesta llamadas 24/7, reserva mesas, resuelve preguntas frecuentes y califica clientes. Incluye 300 minutos al mes en el plan anual de Tura Growth.' : 'It is an AI receptionist answering 24/7, booking tables, answering FAQs and taking inquiries. Includes 300 min/month on Tura Growth annual plan.'
    },
    {
      q: es ? '¿Puedo empezar gratis y luego subir de plan?' : 'Can I start free and upgrade later?',
      a: es ? 'Sí. El plan Starter es gratis para siempre. Cuando quieras subes a Tura Food o Tura Growth y todo tu contenido se conserva automáticamente.' : 'Yes. Starter is free forever. Upgrade anytime and all your content is preserved.'
    },
    {
      q: es ? '¿Hay permanencia o puedo cancelar?' : 'Is there a lock-in or can I cancel?',
      a: es ? 'No hay permanencia. Cancelas cuando quieras y los planes de pago tienen garantía de satisfacción de 30 días.' : 'No contracts or lock-ins. Cancel anytime with a 30-day satisfaction guarantee.'
    }
  ];

  const waNumber = '573026886449';
  const waText = encodeURIComponent(
    es ? 'Hola 👋 Quiero saber más sobre Tura Food AI para mi restaurante.' : 'Hi 👋 I want to know more about Tura Food AI for my restaurant.'
  );

  return (
    <div className={`tf-landing-root ${theme === 'dark' ? 'dark' : ''}`}>
      {/* ANNOUNCEMENT BAR */}
      <div style={{ background: 'var(--ink)', color: '#fff', textAlign: 'center', padding: '9px 16px', fontSize: '12.5px', fontWeight: 600, letterSpacing: '.01em' }}>
        <span>{es ? '⚡ Ya en Buenaventura · Onboarding GRATIS para los primeros 50 restaurantes 🇨🇴' : '⚡ Now live in Buenaventura · FREE onboarding for the first 50 restaurants 🇨🇴'}</span>
      </div>

      {/* ============ NAV ============ */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--navBg)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)' }}>
        <div className="tf-wrap" style={{ paddingTop: 13, paddingBottom: 13, display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(255,68,31,.35)' }}>
                <span className="tf-disp" style={{ fontWeight: 800, fontSize: 22, color: '#fff', lineHeight: 1 }}>t</span>
              </div>
              <span className="tf-disp" style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-.02em', color: 'var(--text)' }}>
                Tura Food <span className="tf-serif" style={{ color: 'var(--primary)' }}>AI</span>
              </span>
            </Link>
          </div>

          <div className="tf-navlinks">
            <button onClick={() => scrollTo('tf-features')} style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
              {es ? 'Producto' : 'Product'}
            </button>
            <button onClick={() => scrollTo('tf-demo-restaurante')} style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
              🍔 {es ? 'App Restaurante' : 'Restaurant App'}
            </button>
            <button onClick={() => scrollTo('tf-demo-turamuebles')} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              🛋️ {es ? 'App Tura Muebles' : 'Luxury Retail App'}
            </button>
            <button onClick={() => scrollTo('tf-pricing')} style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
              {es ? 'Planes' : 'Plans'}
            </button>
            <button onClick={() => scrollTo('tf-compare')} style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
              {es ? 'Comparar' : 'Compare'}
            </button>
            <button onClick={() => scrollTo('tf-faq')} style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
              FAQ
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 'none', marginLeft: 'auto' }}>
            {/* Direct link to customer delivery catalog */}
            <Link
              href="/home"
              style={{
                height: 38,
                padding: '0 13px',
                borderRadius: 11,
                background: 'rgba(255,68,31,0.1)',
                border: '1px solid rgba(255,68,31,0.25)',
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span className="tf-ms" style={{ fontSize: 17, color: 'var(--primary)' }}>moped</span>
              <span className="tf-hide-sm">{es ? 'Pedir a domicilio' : 'Order delivery'}</span>
            </Link>

            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              style={{ height: 38, padding: '0 12px', borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <span className="tf-ms" style={{ fontSize: 17, color: 'var(--muted)' }}>language</span>
              {lang.toUpperCase()}
            </button>

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className="tf-ms" style={{ fontSize: 19, color: 'var(--text)' }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <a
              href="https://app.turafood.com"
              target="_blank"
              rel="noopener"
              className="tf-hide-sm"
              style={{ height: 38, padding: '0 13px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}
            >
              <span className="tf-ms" style={{ fontSize: 17, color: 'var(--muted)' }}>login</span>
              {es ? 'Soy Negocio' : 'Business'}
            </a>

            <button
              onClick={() => scrollTo('tf-pricing')}
              style={{ height: 38, padding: '0 17px', borderRadius: 11, background: 'var(--primary)', color: '#fff', fontSize: 13.5, fontWeight: 700, boxShadow: '0 8px 20px rgba(255,68,31,.32)' }}
            >
              {es ? 'Ver planes' : 'See plans'}
            </button>
          </div>
        </div>
      </div>

      {/* ============ HERO ============ */}
      <div className="tf-wrap tf-pad" style={{ paddingTop: 46, paddingBottom: 30 }}>
        <div className="tf-hero">
          <div style={{ animation: 'tfup .6s ease both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 4px rgba(17,178,106,.16)' }}></span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                {es ? 'La plataforma de IA para tu restaurante' : 'The AI platform for your restaurant'}
              </span>
            </div>

            <h1 className="tf-disp tf-h1" style={{ margin: '20px 0 0', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-.03em', textWrap: 'balance' }}>
              {es ? 'El restaurante ' : 'The restaurant '}
              <span className="tf-serif" style={{ color: 'var(--primary)', fontWeight: 400 }}>
                {es ? 'inteligente' : 'brain'}
              </span>
              {es ? ' que llena tus mesas.' : ' that fills your tables.'}
            </h1>

            <p style={{ margin: '20px 0 0', fontSize: 17.5, lineHeight: 1.55, color: 'var(--muted)', maxWidth: 520 }}>
              {es
                ? 'Tura Food AI es el ecosistema digital completo para tu restaurante: sitio web, reservas, Voice AI 24/7, WhatsApp automatizado y un dashboard que te muestra cada peso. Sin agencias, sin complicaciones.'
                : 'The complete digital ecosystem for your restaurant: website, reservations, 24/7 Voice AI, automated WhatsApp and a dashboard that shows you every peso. No agencies, no headaches.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
              <button
                onClick={() => scrollTo('tf-pricing')}
                style={{ height: 54, padding: '0 26px', borderRadius: 15, background: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 12px 30px rgba(255,68,31,.36)' }}
              >
                <span className="tf-ms" style={{ fontSize: 21 }}>sell</span>
                {es ? 'Ver planes' : 'See plans'}
              </button>

              <Link
                href="/home"
                style={{ height: 54, padding: '0 24px', borderRadius: 15, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 9, boxShadow: 'var(--shadowSm)' }}
              >
                <span className="tf-ms" style={{ fontSize: 21, color: 'var(--primary)' }}>restaurant</span>
                {es ? 'Pedir a domicilio' : 'Order delivery'}
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex' }}>
                {['women/68.jpg', 'men/45.jpg', 'women/12.jpg', 'men/76.jpg'].map((photo, i) => (
                  <div
                    key={i}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      marginLeft: i === 0 ? 0 : -8,
                      border: '2px solid var(--bg)',
                      overflow: 'hidden',
                      background: `var(--surface2) url('https://randomuser.me/api/portraits/${photo}') center/cover`
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#FBBC05', fontSize: 13, letterSpacing: 1 }}>★★★★★</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>4.9</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 13, color: '#4285F4' }}>G</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                    {es ? '+189 reseñas en Google' : '+189 Google reviews'}
                  </span>
                  <span className="tf-ms" style={{ fontSize: 15, color: 'var(--green)' }}>verified</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, marginTop: 30 }}>
              <div>
                <div className="tf-disp" style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', color: 'var(--text)' }}>24/7</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{es ? 'Host de voz con IA' : 'AI voice host'}</div>
              </div>
              <div>
                <div className="tf-disp" style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', color: 'var(--text)' }}>+38%</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{es ? 'Reservas recurrentes' : 'Repeat bookings'}</div>
              </div>
              <div>
                <div className="tf-disp" style={{ fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', color: 'var(--text)' }}>1</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{es ? 'Plataforma, todo incluido' : 'Platform, all-in'}</div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', animation: 'tfpop .7s ease both' }}>
            <div className="tf-heroimg" style={{ position: 'relative', borderRadius: 30, overflow: 'hidden', aspectRatio: '4/4.3', background: "#1a1714 url('/img/burger-hero.jpg') center/cover", boxShadow: '0 40px 90px rgba(20,16,10,.32)' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(8,7,6,.05) 40%,rgba(8,7,6,.55) 100%)' }}></div>
              <div style={{ position: 'absolute', left: 18, top: 18, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 999, background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,.22)' }}>
                <span style={{ fontSize: 15 }}>🔥</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#fff' }}>{es ? 'Más pedidos, más reservas' : 'More orders, more bookings'}</span>
              </div>
            </div>

            <div style={{ position: 'absolute', right: -12, top: -16, zIndex: 4, animation: 'tffloat 4.6s ease-in-out infinite', transform: 'rotate(3deg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '7px 12px 7px 8px', boxShadow: 'var(--shadow)' }}>
                <img src="/img/flag-co.png" alt="Colombia" style={{ width: 40, height: 27, objectFit: 'contain' }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', lineHeight: 1.12 }}>{es ? 'Hecho en' : 'Made in'}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', lineHeight: 1.12 }}>Buenaventura</div>
                </div>
              </div>
            </div>

            <div className="tf-hide-sm" style={{ position: 'absolute', left: -26, top: 64, animation: 'tffloat 5s ease-in-out infinite', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 17, padding: '12px 14px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 11, minWidth: 190 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(17,178,106,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <span className="tf-ms" style={{ fontSize: 21, color: 'var(--green)' }}>event_available</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{es ? 'Nueva reserva' : 'New booking'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{es ? 'Mesa 4 · 8:30 PM' : 'Table 4 · 8:30 PM'}</div>
              </div>
            </div>

            <div className="tf-hide-sm" style={{ position: 'absolute', right: -22, top: '46%', animation: 'tffloat 6s ease-in-out infinite .8s', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 17, padding: '12px 14px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 11, minWidth: 196 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,68,31,.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <span className="tf-ms" style={{ fontSize: 21, color: 'var(--primary)' }}>support_agent</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{es ? 'Voice AI atendió' : 'Voice AI answered'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{es ? 'Llamada · reserva creada' : 'Call · booking created'}</div>
              </div>
            </div>

            <div className="tf-hide-sm" style={{ position: 'absolute', left: 6, bottom: -22, animation: 'tffloat 5.5s ease-in-out infinite .4s', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 17, padding: '11px 14px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 11, minWidth: 182 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: '#25D36622', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <span className="tf-ms" style={{ fontSize: 21, color: '#25D366' }}>chat</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>WhatsApp</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{es ? 'Confirmación enviada' : 'Confirmation sent'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ TRUST STRIP ============ */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface)', marginTop: 42 }}>
        <div className="tf-wrap" style={{ paddingTop: 20, paddingBottom: 20, display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            {es ? 'Todo tu restaurante, en un lugar' : 'Your whole restaurant, in one place'}
          </span>
          {[
            { icon: 'language', label: es ? 'Sitio web' : 'Website' },
            { icon: 'event_available', label: 'Reservas' },
            { icon: 'support_agent', label: 'Voice AI' },
            { icon: 'chat', label: 'WhatsApp' },
            { icon: 'insights', label: 'Marketing' },
            { icon: 'monitoring', label: 'Dashboard' }
          ].map((t, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.85 }}>
              <span className="tf-ms" style={{ fontSize: 20, color: 'var(--primary)' }}>{t.icon}</span>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============ VALUE PROPS (NEURO BENTO) ============ */}
      <div id="tf-features" style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg,#0C0B0A 0%,#141009 100%)', marginTop: 20 }}>
        <div style={{ position: 'absolute', right: '-8%', top: -90, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,68,31,.14),transparent 62%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', left: '-10%', bottom: -130, width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,199,102,.1),transparent 65%)', pointerEvents: 'none' }}></div>
        
        <div className="tf-wrap" style={{ paddingTop: 74, paddingBottom: 78, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ maxWidth: 640 }}>
              <span className="tf-gold-text" style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em' }}>
                {es ? 'Por qué Tura Food AI' : 'Why Tura Food AI'}
              </span>
              <h2 className="tf-disp" style={{ margin: '12px 0 0', fontWeight: 800, fontSize: 40, lineHeight: 1.05, letterSpacing: '-.03em', color: '#fff', textWrap: 'balance' }}>
                {es ? 'No es una agencia. Es tu ' : 'Not an agency. Your '}
                <span className="tf-serif tf-gold-text" style={{ fontWeight: 400 }}>
                  {es ? 'infraestructura de crecimiento.' : 'growth infrastructure.'}
                </span>
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 16px', borderRadius: 999, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
              <span className="tf-ms" style={{ fontSize: 18, color: 'var(--gold)' }}>bolt</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {es ? 'Todo en una sola plataforma' : 'All in one platform'}
              </span>
            </div>
          </div>

          <div className="tf-bento" style={{ marginTop: 32 }}>
            {/* Card 1: Voice AI */}
            <div className="tf-card b-big" style={{ minHeight: 344 }}>
              <div style={{ position: 'absolute', inset: 0, background: "#000 url('/img/fork-dark.jpg') center/cover" }}></div>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(8,7,6,.28) 0%,rgba(8,7,6,.8) 66%,rgba(8,7,6,.96) 100%)' }}></div>
              <div style={{ position: 'absolute', top: 20, right: 20, width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tf-ms" style={{ fontSize: 23, color: '#fff' }}>support_agent</span>
              </div>
              <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 26 }}>
                <span style={{ alignSelf: 'flex-start', padding: '5px 11px', borderRadius: 999, background: 'rgba(232,199,102,.16)', border: '1px solid var(--nightBorder)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: 'var(--gold)' }}>
                  {es ? 'IA DE VOZ' : 'VOICE AI'}
                </span>
                <div className="tf-disp" style={{ marginTop: 14, fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', color: '#fff' }}>
                  Voice AI 24/7
                </div>
                <div style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.5, color: 'rgba(255,255,255,.74)', maxWidth: 380 }}>
                  {es ? 'Un host con IA contesta llamadas, reserva mesas y responde preguntas — aunque estés lleno o cerrado.' : 'An AI host answers calls, books tables and handles questions — even when you are full or closed.'}
                </div>
              </div>
            </div>

            {/* Card 2: Presencia Web */}
            <div className="tf-card b-wide" style={{ minHeight: 164 }}>
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '46%', background: "url('/img/burger-hero.jpg') center/cover" }}></div>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg,#171310 48%,rgba(23,19,16,.72) 72%,rgba(23,19,16,.15) 100%)' }}></div>
              <div style={{ position: 'relative', padding: 24, maxWidth: '64%' }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(232,199,102,.14)', border: '1px solid var(--nightBorder)', fontSize: 10, fontWeight: 800, letterSpacing: '.07em', color: 'var(--gold)' }}>
                  {es ? 'SITIO WEB' : 'WEBSITE'}
                </span>
                <div className="tf-disp" style={{ marginTop: 12, fontWeight: 700, fontSize: 19, color: '#fff', letterSpacing: '-.01em' }}>
                  {es ? 'Presencia profesional' : 'Professional presence'}
                </div>
                <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.45, color: 'rgba(255,255,255,.66)' }}>
                  {es ? 'Sitio web, menú digital y perfil de Google, con tu dominio propio.' : 'Website, digital menu and Google profile, on your own domain.'}
                </div>
              </div>
            </div>

            {/* Card 3: WhatsApp */}
            <div className="tf-card" style={{ padding: 22 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(37,211,102,.14)', border: '1px solid rgba(37,211,102,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tf-ms" style={{ fontSize: 24, color: '#25D366' }}>chat</span>
              </div>
              <div className="tf-disp" style={{ marginTop: 14, fontWeight: 700, fontSize: 17, color: '#fff' }}>
                {es ? 'WhatsApp automatizado' : 'Automated WhatsApp'}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,.6)' }}>
                {es ? 'Confirmaciones, recordatorios y campañas en piloto automático.' : 'Confirmations, reminders and campaigns on autopilot.'}
              </div>
            </div>

            {/* Card 4: Marketing */}
            <div className="tf-card" style={{ padding: 22 }}>
              <div className="tf-3d-gold" style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(145deg,#F6E4A6,#B8912F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tf-ms" style={{ fontSize: 24, color: '#1a1206' }}>trending_up</span>
              </div>
              <div className="tf-disp" style={{ marginTop: 14, fontWeight: 700, fontSize: 17, color: '#fff' }}>
                {es ? 'Marketing con tracking' : 'Marketing with tracking'}
              </div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,.6)' }}>
                {es ? 'Google Ads PRO AI, Meta Pixel, CAPI y GA4 midiendo cada campaña.' : 'Google Ads PRO AI, Meta Pixel, CAPI and GA4 measuring every campaign.'}
              </div>
            </div>

            {/* Card 5: CRM */}
            <div className="tf-card b-wide" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <div style={{ maxWidth: '64%' }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(255,68,31,.14)', border: '1px solid rgba(255,68,31,.28)', fontSize: 10, fontWeight: 800, letterSpacing: '.07em', color: '#FF7A5C' }}>
                  CRM
                </span>
                <div className="tf-disp" style={{ marginTop: 12, fontWeight: 700, fontSize: 19, color: '#fff', letterSpacing: '-.01em' }}>
                  {es ? 'Fidelización y CRM' : 'Loyalty & CRM'}
                </div>
                <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.45, color: 'rgba(255,255,255,.66)' }}>
                  {es ? 'Conoce a cada cliente y hazlo volver con puntos, cupones y cumpleaños.' : 'Know every customer and bring them back with points and coupons.'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div className="tf-disp tf-gold-text" style={{ fontWeight: 800, fontSize: 44, letterSpacing: '-.03em', lineHeight: 1 }}>+38%</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>{es ? 'reservas recurrentes' : 'repeat bookings'}</div>
              </div>
            </div>

            {/* Card 6: Dashboard */}
            <div className="tf-card b-wide" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
              <div style={{ maxWidth: '58%' }}>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(17,178,106,.14)', border: '1px solid rgba(17,178,106,.28)', fontSize: 10, fontWeight: 800, letterSpacing: '.07em', color: '#3FD08A' }}>
                  DASHBOARD
                </span>
                <div className="tf-disp" style={{ marginTop: 12, fontWeight: 700, fontSize: 19, color: '#fff', letterSpacing: '-.01em' }}>
                  {es ? 'Dashboard en tiempo real' : 'Real-time dashboard'}
                </div>
                <div style={{ marginTop: 6, fontSize: 13.5, lineHeight: 1.45, color: 'rgba(255,255,255,.66)' }}>
                  {es ? 'Reservas, ocupación, ROI y consumo de Voice AI en una sola pantalla.' : 'Bookings, occupancy, ROI and Voice AI usage on one screen.'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 60, width: 148, flex: 'none' }}>
                {dashBars.map((b, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', background: b.bg, height: b.h }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SESIÓN 1: E-COMMERCE APP PARA RESTAURANTES & DELIVERY (ESTILO RAPPI)     */}
      {/* ========================================================================= */}
      <div id="tf-demo-restaurante" className="tf-wrap" style={{ paddingTop: 74, paddingBottom: 24 }}>
        <div style={{ position: 'relative', borderRadius: 32, overflow: 'hidden', background: 'linear-gradient(135deg,#FFE7DF 0%,#FFD7CB 52%,#FFEFE9 100%)', border: '1.5px solid rgba(255,68,31,.22)', boxShadow: '0 24px 60px rgba(255,68,31,0.12)' }}>
          <div style={{ position: 'absolute', left: -70, bottom: -90, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,68,31,.14)' }}></div>
          <div style={{ position: 'absolute', right: -60, top: -80, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,176,32,.2)' }}></div>
          
          <div className="tf-mock tf-cardpad" style={{ position: 'relative', padding: '54px 48px' }}>
            <div>
              {/* Pill & Subdomain */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#E2360F', textTransform: 'uppercase', letterSpacing: '.08em', padding: '5px 12px', borderRadius: 999, background: 'rgba(255,68,31,0.12)' }}>
                  🍔 {es ? 'Demo 1 · E-Commerce para Restaurantes' : 'Demo 1 · Restaurant E-Commerce'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#6b524a', background: 'rgba(255,255,255,0.7)', padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.06)' }}>
                  🌐 restaurante.turafood.com
                </span>
              </div>

              <h2 className="tf-disp" style={{ margin: '10px 0 0', fontWeight: 900, fontSize: 38, lineHeight: 1.08, letterSpacing: '-.03em', color: '#1a120e', textWrap: 'balance' }}>
                {es ? 'Tu propia app de delivery, sin pagar el ' : 'Your own delivery app, without paying '}
                <span className="tf-serif" style={{ color: '#E2360F', fontWeight: 400 }}>
                  {es ? '30% de comisión.' : '30% commission.'}
                </span>
              </h2>
              <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.55, color: '#6b524a', maxWidth: 440 }}>
                {es
                  ? 'Una experiencia tipo Rappi de conversión inmediata para comida rápida, asaderos y bistrós. Menú con fotos apetitosas, pedidos directos por WhatsApp, pagos por Nequi y rastreo en 15 minutos.'
                  : 'A high-converting Rappi-style food experience for fast food, grills and bistros. Photos, direct WhatsApp orders, Nequi payments and 15-minute tracking.'}
              </p>

              {/* Lista de features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                {[
                  { icon: 'bolt', label: es ? 'Tura Turbo 15 min · Despacho y rastreo en vivo' : 'Tura Turbo 15 min · Live dispatch & tracking' },
                  { icon: 'shopping_basket', label: es ? 'Canasta flotante interactiva y combos 2x1' : 'Interactive floating cart & 2x1 combos' },
                  { icon: 'payments', label: es ? 'Pagos directos con Nequi, Bancolombia y PSE' : 'Direct payments with Nequi & cards' },
                  { icon: 'qr_code_2', label: es ? 'Cero descargas · Abre al instante por QR o link' : 'Zero downloads · Instant PWA via QR or link' }
                ].map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(226,54,15,.14)', flex: 'none' }}>
                      <span className="tf-ms" style={{ fontSize: 19, color: '#E2360F' }}>{c.icon}</span>
                    </div>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: '#3a2a24' }}>{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 32 }}>
                <a
                  href="/demo/restaurante"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '14px 24px',
                    borderRadius: 14,
                    background: '#FF441F',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 800,
                    textDecoration: 'none',
                    boxShadow: '0 10px 24px rgba(255,68,31,0.36)'
                  }}
                >
                  <span className="tf-ms" style={{ fontSize: 20 }}>launch</span>
                  <span>{es ? 'Ver Demo Restaurante en Vivo (restaurante.turafood.com) ↗' : 'View Live Restaurant Demo ↗'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => openOnb('turafood')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 20px',
                    borderRadius: 14,
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(226,54,15,0.25)',
                    color: '#1a120e',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadowSm)'
                  }}
                >
                  <span className="tf-ms" style={{ fontSize: 19, color: '#FF441F' }}>storefront</span>
                  <span>{es ? 'Activar esta App para mi Negocio' : 'Launch for my business'}</span>
                </button>
              </div>
            </div>

            {/* Teléfonos del Restaurante */}
            <div className="tf-phones">
              {/* Teléfono 1: Menú & Comida */}
              <div style={{ width: 262, flex: 'none', borderRadius: 42, background: '#0C0B0A', padding: 8, boxShadow: '0 38px 70px rgba(20,16,10,.34)', transform: 'rotate(-2deg)' }}>
                <div style={{ position: 'relative', borderRadius: 35, overflow: 'hidden', background: '#F6F5F2', height: 540 }}>
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 118, height: 24, background: '#0C0B0A', borderRadius: '0 0 15px 15px', zIndex: 6 }}></div>
                  <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '30px 15px 11px', background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8C857B', textTransform: 'uppercase', letterSpacing: '.05em' }}>{es ? 'Pedir a domicilio' : 'Order delivery'}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13, fontWeight: 800, color: '#17140F' }}>
                            <span className="tf-ms" style={{ fontSize: 15, color: '#FF441F' }}>location_on</span>
                            Asadero El Puerto
                          </div>
                        </div>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F0EEE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="tf-ms" style={{ fontSize: 18, color: '#17140F' }}>shopping_bag</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11, height: 36, background: '#F0EEE9', borderRadius: 11, padding: '0 11px' }}>
                        <span className="tf-ms" style={{ fontSize: 17, color: '#8C857B' }}>search</span>
                        <span style={{ fontSize: 11.5, color: '#8C857B' }}>{es ? 'Buscar en la carta…' : 'Search menu…'}</span>
                      </div>
                    </div>

                    <div className="tf-sc" style={{ flex: 1, overflowY: 'auto', padding: '11px 15px 14px' }}>
                      <div style={{ position: 'relative', borderRadius: 15, overflow: 'hidden', height: 84, background: '#FF441F', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ position: 'absolute', right: -10, bottom: -14, fontSize: 60 }}>🍔</div>
                        <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '.06em' }}>2x1 HOY</div>
                        <div className="tf-disp" style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.05, maxWidth: 140 }}>
                          {es ? 'Hamburguesa gratis' : 'Free burger'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 13, marginTop: 13, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><div style={{ width: 42, height: 42, borderRadius: 14, background: '#FFE9E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>🍔</div><span style={{ fontSize: 9, fontWeight: 700, color: '#17140F' }}>Burgers</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><div style={{ width: 42, height: 42, borderRadius: 14, background: '#FFF1D6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>🍗</div><span style={{ fontSize: 9, fontWeight: 700, color: '#17140F' }}>Pollo</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><div style={{ width: 42, height: 42, borderRadius: 14, background: '#E3F6EC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>🥗</div><span style={{ fontSize: 9, fontWeight: 700, color: '#17140F' }}>Mariscos</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><div style={{ width: 42, height: 42, borderRadius: 14, background: '#EDE7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>🥤</div><span style={{ fontSize: 9, fontWeight: 700, color: '#17140F' }}>Bebidas</span></div>
                      </div>

                      <div style={{ fontSize: 12, fontWeight: 800, color: '#17140F', margin: '15px 0 9px' }}>{es ? 'Lo más pedido' : 'Most ordered'}</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        {[
                          { name: es ? 'Burger Doble Tura' : 'Tura Double Burger', rating: '4.9', time: '20 min', price: '$24.900', img: '/img/burger-hero.jpg' },
                          { name: es ? 'Lomo al grill' : 'Grilled Steak', rating: '4.8', time: '25 min', price: '$33.500', img: '/img/steak-top-dark.jpg' },
                          { name: es ? 'Costillas BBQ' : 'BBQ Ribs', rating: '4.9', time: '30 min', price: '$38.000', img: '/img/steak-rustic.jpg' }
                        ].map((d, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fff', border: '1px solid rgba(20,16,10,.07)', borderRadius: 14, padding: 8, boxShadow: '0 3px 9px rgba(20,16,10,.05)' }}>
                            <div style={{ width: 54, height: 54, borderRadius: 11, background: `#eee url('${d.img}') center/cover`, flex: 'none' }}></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#17140F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
                              <div style={{ fontSize: 10, color: '#8C857B', marginTop: 1 }}>⭐ {d.rating} · {d.time}</div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#17140F', marginTop: 3 }}>{d.price}</div>
                            </div>
                            <div style={{ width: 28, height: 28, borderRadius: 9, background: '#11B26A', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', flex: 'none' }}>
                              <span className="tf-ms" style={{ fontSize: 18, color: '#fff' }}>add</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '9px 0 12px', background: '#fff', borderTop: '1px solid rgba(20,16,10,.07)' }}>
                      <span className="tf-ms" style={{ fontSize: 21, color: '#FF441F' }}>home</span>
                      <span className="tf-ms" style={{ fontSize: 21, color: '#B6AFA4' }}>search</span>
                      <span className="tf-ms" style={{ fontSize: 21, color: '#B6AFA4' }}>receipt_long</span>
                      <span className="tf-ms" style={{ fontSize: 21, color: '#B6AFA4' }}>person</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Teléfono 2: Checkout & Nequi */}
              <div className="tf-phone2" style={{ width: 262, flex: 'none', borderRadius: 42, background: '#0C0B0A', padding: 8, boxShadow: '0 38px 70px rgba(20,16,10,.34)', transform: 'rotate(2deg)' }}>
                <div style={{ position: 'relative', borderRadius: 35, overflow: 'hidden', background: '#F6F5F2', height: 540 }}>
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 118, height: 24, background: '#0C0B0A', borderRadius: '0 0 15px 15px', zIndex: 6 }}></div>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '32px 16px 13px', background: '#fff', borderBottom: '1px solid rgba(20,16,10,.07)', display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span className="tf-ms" style={{ fontSize: 20, color: '#17140F' }}>arrow_back</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#17140F' }}>{es ? 'Tu pedido' : 'Your order'}</span>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: "#eee url('/img/burger-hero.jpg') center/cover", flex: 'none' }}></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#17140F' }}>Burger Doble Tura</div>
                          <div style={{ fontSize: 10, color: '#8C857B' }}>x1</div>
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#17140F' }}>$24.900</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: "#eee url('/img/fork-dark.jpg') center/cover", flex: 'none' }}></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#17140F' }}>Lomo al grill</div>
                          <div style={{ fontSize: 10, color: '#8C857B' }}>x1</div>
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 800, color: '#17140F' }}>$33.900</div>
                      </div>

                      <div style={{ borderTop: '1px dashed rgba(20,16,10,.14)', marginTop: 6, paddingTop: 11, display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8C857B' }}><span>Subtotal</span><span style={{ fontWeight: 700, color: '#17140F' }}>$58.800</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8C857B' }}><span>{es ? 'Domicilio' : 'Delivery'}</span><span style={{ fontWeight: 700, color: '#11B26A' }}>{es ? 'Gratis' : 'Free'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 3 }}><span style={{ fontSize: 12.5, fontWeight: 800, color: '#17140F' }}>Total</span><span className="tf-disp" style={{ fontSize: 19, fontWeight: 800, color: '#17140F' }}>$58.800</span></div>
                      </div>

                      <div style={{ marginTop: 13, background: '#F0EEE9', borderRadius: 12, padding: '10px 11px', display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📱</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#17140F' }}>Nequi</div>
                          <div style={{ fontSize: 9, color: '#8C857B' }}>{es ? 'Cuenta conectada' : 'Connected account'}</div>
                        </div>
                        <span className="tf-ms" style={{ fontSize: 17, color: '#11B26A' }}>check_circle</span>
                      </div>
                    </div>

                    <div style={{ padding: '12px 16px 16px', background: '#fff' }}>
                      <div style={{ height: 46, borderRadius: 13, background: '#FF441F', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 8px 18px rgba(255,68,31,.3)' }}>
                        <span className="tf-ms" style={{ fontSize: 18, color: '#fff' }}>lock</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{es ? 'Pagar con Nequi' : 'Pay with Nequi'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SESIÓN 2: E-COMMERCE APP EDITORIAL LUXURY & RETAIL (TURA MUEBLES)        */}
      {/* ========================================================================= */}
      <div id="tf-demo-turamuebles" className="tf-wrap" style={{ paddingTop: 30, paddingBottom: 64 }}>
        <div style={{ position: 'relative', borderRadius: 32, overflow: 'hidden', background: 'linear-gradient(135deg,#0C0B0A 0%,#1A1715 60%,#111111 100%)', border: '1.5px solid rgba(255,255,255,0.12)', boxShadow: '0 30px 70px rgba(0,0,0,0.5)', color: '#FFFFFF' }}>
          <div style={{ position: 'absolute', right: -70, top: -70, width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,199,102,.12),transparent 70%)', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', left: -80, bottom: -90, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,68,31,.1),transparent 70%)', pointerEvents: 'none' }}></div>
          
          <div className="tf-mock tf-cardpad" style={{ position: 'relative', padding: '54px 48px' }}>
            <div>
              {/* Pill & Subdomain */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#E8C766', textTransform: 'uppercase', letterSpacing: '.08em', padding: '5px 12px', borderRadius: 999, background: 'rgba(232,199,102,0.14)', border: '1px solid rgba(232,199,102,0.25)' }}>
                  🛋️ {es ? 'Demo 2 · E-Commerce Editorial Luxury' : 'Demo 2 · Luxury Editorial E-Commerce'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.08)', padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)' }}>
                  🌐 demo.turafood.com
                </span>
              </div>

              <h2 className="tf-disp" style={{ margin: '10px 0 0', fontWeight: 900, fontSize: 38, lineHeight: 1.08, letterSpacing: '-.03em', color: '#FFFFFF', textWrap: 'balance' }}>
                {es ? 'Experiencia Editorial de Alta Gama: ' : 'High-End Editorial Experience: '}
                <span className="tf-serif" style={{ color: '#E8C766', fontWeight: 400 }}>
                  {es ? 'Inspirada en Tura Muebles.' : 'Inspired by Tura Muebles.'}
                </span>
              </h2>
              <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.55, color: 'rgba(255,255,255,0.75)', maxWidth: 440 }}>
                {es
                  ? 'Diseñada con la identidad de Tura Muebles entregada por Claude Code: tipografía cursiva Instrument Serif, estética minimalista en Blanco y Negro, 18 muebles listos para armar, navegación por espacios arquitectónicos y asesor de compra con Inteligencia Artificial.'
                  : 'Designed with Tura Muebles identity from Claude Code: Instrument Serif cursive typography, Black & White minimalism, 18 assemble-ready furniture items and AI shopping advisor.'}
              </p>

              {/* Lista de features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                {[
                  { icon: 'chair', label: es ? '18 muebles listos para armar con medidas y ensamble' : '18 assemble-ready furniture with specs & local build' },
                  { icon: 'psychology', label: es ? 'Tura IA Asistente · Asesor que calcula espacios del hogar' : 'Tura AI Assistant · Recommends by room size' },
                  { icon: 'shield', label: es ? 'Pacífico Protect · Protección contra humedad y salitre marino' : 'Pacifico Protect · Anti-humidity marine guarantee' },
                  { icon: 'dark_mode', label: es ? 'Modo Oscuro Luxury & selector de idioma ES / EN' : 'Luxury Dark Mode & bilingual ES / EN support' }
                ].map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <span className="tf-ms" style={{ fontSize: 19, color: '#E8C766' }}>{c.icon}</span>
                    </div>
                    <span style={{ fontSize: 14.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 32 }}>
                <a
                  href="https://turamuebles.pages.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '14px 24px',
                    borderRadius: 14,
                    background: '#FFFFFF',
                    color: '#0C0B0A',
                    fontSize: 15,
                    fontWeight: 900,
                    textDecoration: 'none',
                    boxShadow: '0 10px 24px rgba(255,255,255,0.15)'
                  }}
                >
                  <span className="tf-ms" style={{ fontSize: 20, color: '#0C0B0A' }}>open_in_new</span>
                  <span>{es ? 'Ver Demo Tura Muebles en Vivo (demo.turafood.com) ↗' : 'View Live Tura Muebles Demo ↗'}</span>
                </a>

                <Link
                  href="/demo/turamuebles"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 20px',
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(255,255,255,0.2)',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: 'none'
                  }}
                >
                  <span className="tf-ms" style={{ fontSize: 19, color: '#E8C766' }}>fullscreen</span>
                  <span>{es ? 'Probar App PWA Local' : 'Test Local PWA'}</span>
                </Link>
              </div>
            </div>

            {/* Teléfonos de Tura Muebles */}
            <div className="tf-phones">
              {/* Teléfono 1: Home Editorial Tura Muebles */}
              <div style={{ width: 262, flex: 'none', borderRadius: 42, background: '#1E1B18', padding: 8, boxShadow: '0 38px 70px rgba(0,0,0,0.6)', transform: 'rotate(-2deg)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <div style={{ position: 'relative', borderRadius: 35, overflow: 'hidden', background: '#FFFFFF', height: 540 }}>
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 118, height: 24, background: '#0C0B0A', borderRadius: '0 0 15px 15px', zIndex: 6 }}></div>
                  <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', color: '#111' }}>
                    
                    {/* Header Minimalista Tura Muebles */}
                    <div style={{ padding: '30px 16px 12px', background: '#FFFFFF', borderBottom: '1px solid #EFEFEF' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 20, height: 20, background: '#000', color: '#fff', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                            tm
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '-0.02em', color: '#000' }}>turamuebles</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, color: '#888' }}>
                          <span>CO</span>
                          <span>ES</span>
                        </div>
                      </div>
                    </div>

                    {/* Contenido Editorial con Instrument Serif */}
                    <div className="tf-sc" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
                      <div style={{ borderRadius: 16, background: '#000000', color: '#FFFFFF', padding: '20px 16px', marginBottom: 14 }}>
                        <div style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em', color: '#888888', marginBottom: 4 }}>
                          COLECCIÓN 2026
                        </div>
                        <div style={{ fontFamily: 'var(--font-instrument), "Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 24, lineHeight: 1.15, color: '#FFFFFF' }}>
                          Tu cocina de autor, mañana.
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, background: '#FFFFFF', color: '#000', padding: '5px 12px', borderRadius: 999 }}>
                            Ver catálogo →
                          </span>
                        </div>
                      </div>

                      {/* Selector de Espacios */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                        {['Todo', 'Salas', 'Comedores', 'Cocinas', 'Alcobas'].map((cat, i) => (
                          <span key={cat} style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: i === 0 ? '#000' : '#F4F4F4',
                            color: i === 0 ? '#fff' : '#444',
                            whiteSpace: 'nowrap'
                          }}>
                            {cat}
                          </span>
                        ))}
                      </div>

                      {/* Lista de Muebles de Autor */}
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#000', margin: '14px 0 8px', letterSpacing: '-0.01em' }}>
                        Diseños Listos para Armar
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { name: 'Pargo Dorado al Horno', cat: 'CHEF AUTOR', price: '$38.500', icon: 'room_service' },
                          { name: 'Mueble Cocina Roble', cat: 'MADERO LUXURY', price: '$380.000', icon: 'countertops' },
                          { name: 'Sofá Modular Pacífico', cat: 'SALA & CONFORT', price: '$850.000', icon: 'chair' }
                        ].map((prod, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, border: '1px solid #ECECEC', background: '#FAFAFA' }}>
                            <div>
                              <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.08em', color: '#888', textTransform: 'uppercase' }}>
                                {prod.cat}
                              </span>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#000', marginTop: 1 }}>
                                {prod.name}
                              </div>
                              <div style={{ fontSize: 11.5, fontWeight: 900, color: '#000', marginTop: 2 }}>
                                {prod.price}
                              </div>
                            </div>
                            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                              +
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Barra inferior Minimalista */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '10px 0 12px', background: '#FFFFFF', borderTop: '1px solid #ECECEC' }}>
                      <span className="tf-ms" style={{ fontSize: 20, color: '#000' }}>grid_view</span>
                      <span className="tf-ms" style={{ fontSize: 20, color: '#999' }}>search</span>
                      <span className="tf-ms" style={{ fontSize: 20, color: '#999' }}>shopping_bag</span>
                      <span className="tf-ms" style={{ fontSize: 20, color: '#999' }}>account_circle</span>
                    </div>

                  </div>
                </div>
              </div>

              {/* Teléfono 2: Tura IA & Pacífico Protect */}
              <div className="tf-phone2" style={{ width: 262, flex: 'none', borderRadius: 42, background: '#1E1B18', padding: 8, boxShadow: '0 38px 70px rgba(0,0,0,0.6)', transform: 'rotate(2deg)', border: '1px solid rgba(255,255,255,0.14)' }}>
                <div style={{ position: 'relative', borderRadius: 35, overflow: 'hidden', background: '#0C0B0A', color: '#FFFFFF', height: 540 }}>
                  <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 118, height: 24, background: '#0C0B0A', borderRadius: '0 0 15px 15px', zIndex: 6 }}></div>
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '32px 16px 13px', background: '#161412', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span className="tf-ms" style={{ fontSize: 20, color: '#E8C766' }}>psychology</span>
                      <span style={{ fontSize: 13.5, fontWeight: 900, color: '#FFFFFF' }}>Tura IA · Asistente Experto</span>
                    </div>

                    <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Burbuja del asistente */}
                      <div style={{ padding: 12, borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#E8C766', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
                          ASESOR INTELIGENTE
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.45, color: 'rgba(255,255,255,0.85)' }}>
                          "Hola, soy tu asesor de Tura Muebles. ¿Qué medidas tiene tu espacio y qué acabado prefieres para Buenaventura?"
                        </div>
                      </div>

                      {/* Garantía Pacífico Protect */}
                      <div style={{ padding: 12, borderRadius: 14, background: 'linear-gradient(135deg,rgba(232,199,102,0.12),rgba(232,199,102,0.04))', border: '1px solid rgba(232,199,102,0.25)', marginTop: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#E8C766', fontWeight: 800, fontSize: 12 }}>
                          <span className="tf-ms" style={{ fontSize: 16 }}>shield</span>
                          <span>Pacífico Protect Activo</span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                          Herrajes anticorrosión y sellado especial para humedad marina de Buenaventura.
                        </p>
                      </div>

                      {/* Botón de ensamble */}
                      <div style={{ padding: '12px 14px', borderRadius: 12, background: '#FFFFFF', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 900, fontSize: 12.5 }}>
                        <span className="tf-ms" style={{ fontSize: 16 }}>handyman</span>
                        <span>Incluir Ensamble Profesional</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ PRICING ============ */}
      <div id="tf-pricing" className="tf-wrap tf-pad" style={{ paddingTop: 80, paddingBottom: 10 }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            {es ? 'Membresías' : 'Memberships'}
          </span>
          <h2 className="tf-disp" style={{ margin: '12px 0 0', fontWeight: 800, fontSize: 44, lineHeight: 1.04, letterSpacing: '-.03em', textWrap: 'balance' }}>
            {es ? 'Tres planes. ' : 'Three plans. '}
            <span className="tf-serif" style={{ color: 'var(--primary)', fontWeight: 400 }}>{es ? 'Cero' : 'Zero'}</span>
            {es ? ' confusión.' : ' confusion.'}
          </h2>
          <p style={{ margin: '14px 0 0', fontSize: 17, lineHeight: 1.55, color: 'var(--muted)' }}>
            {es ? 'Empieza gratis. Crece cuando quieras. Cancela cuando quieras. Precios en pesos colombianos.' : 'Start free. Grow when you want. Cancel anytime. Prices in Colombian pesos.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 5, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setBilling('monthly')}
              style={{
                height: 40,
                padding: '0 20px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                background: billing === 'monthly' ? 'var(--surface)' : 'transparent',
                color: billing === 'monthly' ? 'var(--text)' : 'var(--muted)',
                boxShadow: billing === 'monthly' ? 'var(--shadowSm)' : 'none'
              }}
            >
              {es ? 'Mensual' : 'Monthly'}
            </button>
            <button
              onClick={() => setBilling('annual')}
              style={{
                height: 40,
                padding: '0 18px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: an ? 'var(--surface)' : 'transparent',
                color: an ? 'var(--text)' : 'var(--muted)',
                boxShadow: an ? 'var(--shadowSm)' : 'none'
              }}
            >
              {es ? 'Anual' : 'Annual'}
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 7px', borderRadius: 999, background: 'var(--green)', color: '#fff' }}>
                {es ? 'Hasta −74%' : 'Up to −74%'}
              </span>
            </button>
          </div>
        </div>

        <div className="tf-price" style={{ marginTop: 34 }}>
          {/* Card 1: Starter */}
          <div style={{ position: 'relative', borderRadius: 24, padding: 28, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div className="tf-3d" style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(140,133,123,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tf-ms" style={{ fontSize: 21, color: 'var(--muted)' }}>storefront</span>
              </div>
              <div className="tf-disp" style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em', color: 'var(--text)' }}>Starter</div>
            </div>
            <div style={{ marginTop: 11, fontSize: 13.5, lineHeight: 1.45, color: 'var(--muted)', minHeight: 38 }}>
              {es ? 'El gancho de entrada. Prueba la plataforma sin pagar nada.' : 'The entry hook. Try the platform for free.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 14 }}>
              <span className="tf-disp" style={{ fontWeight: 800, fontSize: 42, lineHeight: 1, letterSpacing: '-.03em', color: 'var(--text)' }}>
                {es ? 'Gratis' : 'Free'}
              </span>
            </div>
            <div style={{ marginTop: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--faint)', minHeight: 18 }}>
              {es ? 'Para siempre' : 'Forever'}
            </div>
            <button
              onClick={() => openOnb('starter')}
              style={{ width: '100%', height: 50, borderRadius: 14, marginTop: 18, fontSize: 15, fontWeight: 700, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {es ? 'Empezar gratis' : 'Start free'}
            </button>
            <Link
              href="/home"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 12, marginTop: 9, fontSize: 13, fontWeight: 700, border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', boxShadow: '0 0 0 3px rgba(37,211,102,.22)' }}></span>
              {es ? 'Ver demo en vivo' : 'See live demo'}
              <span className="tf-ms" style={{ fontSize: 16 }}>arrow_outward</span>
            </Link>
            <div style={{ marginTop: 20, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
              {es ? 'Incluye' : 'Includes'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 13 }}>
              {[
                'Subdominio turafood.com/tu-negocio',
                'Menú digital (hasta 20 productos)',
                'Reserva básica de mesas',
                'Perfil Google Business',
                'Dashboard básico',
                'Sin IA, WhatsApp ni marketing',
                'Soporte self-service'
              ].map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <span className="tf-ms" style={{ fontSize: 18, flex: 'none', marginTop: 1, color: i < 5 ? 'var(--primary)' : 'var(--faint)' }}>
                    {i < 5 ? 'check_circle' : 'cancel'}
                  </span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.4, color: i < 5 ? 'var(--text)' : 'var(--faint)' }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Tura Food */}
          <div style={{ position: 'relative', borderRadius: 24, padding: 28, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div className="tf-3d" style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(255,68,31,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tf-ms" style={{ fontSize: 21, color: 'var(--primary)' }}>language</span>
              </div>
              <div className="tf-disp" style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em', color: 'var(--text)' }}>Tura Food</div>
            </div>
            <div style={{ marginTop: 11, fontSize: 13.5, lineHeight: 1.45, color: 'var(--muted)', minHeight: 38 }}>
              {es ? 'Tu restaurante digital, profesional y listo para vender.' : 'Your professional digital restaurant, ready to sell.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 14 }}>
              <span className="tf-disp" style={{ fontWeight: 800, fontSize: 42, lineHeight: 1, letterSpacing: '-.03em', color: 'var(--text)' }}>
                {an ? money(Math.round(489000 / 12)) : money(89000)}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)', marginBottom: 5 }}>/{es ? 'mes' : 'mo'}</span>
              {an && (
                <span style={{ marginBottom: 7, fontSize: 11.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'rgba(17,178,106,.16)', color: 'var(--green)' }}>
                  −54%
                </span>
              )}
            </div>
            <div style={{ marginTop: 5, fontSize: 12.5, fontWeight: 600, color: 'var(--faint)', minHeight: 18 }}>
              {an ? (es ? 'Facturado $489.000/año' : 'Billed $489,000/yr') : (es ? 'Facturado mensual' : 'Billed monthly')}
            </div>
            <button
              onClick={() => openOnb('turafood')}
              style={{ width: '100%', height: 50, borderRadius: 14, marginTop: 18, fontSize: 15, fontWeight: 700, background: 'var(--primary)', color: '#fff', boxShadow: '0 10px 24px rgba(255,68,31,.3)' }}
            >
              {es ? 'Elegir plan' : 'Choose plan'}
            </button>
            <Link
              href="/home"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 12, marginTop: 9, fontSize: 13, fontWeight: 700, border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', boxShadow: '0 0 0 3px rgba(37,211,102,.22)' }}></span>
              {es ? 'Ver demo en vivo' : 'See live demo'}
              <span className="tf-ms" style={{ fontSize: 16 }}>arrow_outward</span>
            </Link>
            <div style={{ marginTop: 20, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--primary)' }}>
              {es ? 'Todo lo básico, y además' : 'Everything basic, plus'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 13 }}>
              {[
                'Sitio web profesional + dominio propio',
                'Hosting premium + correo corporativo',
                'Menú digital profesional + filtros',
                'Blog SEO para restaurantes',
                'Google My Business avanzado',
                'Pasarela de pagos Nequi',
                'Dashboard completo',
                'Help Desk + garantía 30 días'
              ].map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <span className="tf-ms" style={{ fontSize: 18, flex: 'none', marginTop: 1, color: 'var(--primary)' }}>check_circle</span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.4, color: 'var(--text)' }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Tura Growth (Popular ⭐) */}
          <div style={{ position: 'relative', borderRadius: 24, padding: 28, background: "linear-gradient(165deg,rgba(36,28,18,.92),rgba(21,15,9,.95) 60%,rgba(12,11,10,.97)),url('/img/gold-steak2.jpg') center/cover", border: '1px solid var(--nightBorder)', boxShadow: '0 34px 84px rgba(12,11,10,.55)' }}>
            <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: 'linear-gradient(100deg,#F6E4A6,#E8C766)', color: '#1a1206', fontSize: 11.5, fontWeight: 800, boxShadow: '0 10px 22px rgba(184,145,47,.5)', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 13 }}>⭐</span>{es ? 'Más popular' : 'Most popular'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div className="tf-3d-gold" style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(145deg,#F6E4A6,#B8912F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tf-ms" style={{ fontSize: 21, color: '#1a1206' }}>rocket_launch</span>
              </div>
              <div className="tf-disp" style={{ fontWeight: 800, fontSize: 21, letterSpacing: '-.02em', color: '#fff' }}>Tura Growth</div>
            </div>
            <div style={{ marginTop: 11, fontSize: 13.5, lineHeight: 1.45, color: 'rgba(255,255,255,.78)', minHeight: 38 }}>
              {es ? 'El ecosistema completo: IA, automatización y crecimiento.' : 'The full ecosystem: AI, automation and growth.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 14 }}>
              <span className="tf-disp" style={{ fontWeight: 800, fontSize: 42, lineHeight: 1, letterSpacing: '-.03em', color: '#fff' }}>
                {an ? money(Math.round(890000 / 12)) : money(289000)}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,.78)', marginBottom: 5 }}>/{es ? 'mes' : 'mo'}</span>
              {an && (
                <span style={{ marginBottom: 7, fontSize: 11.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'rgba(17,178,106,.16)', color: 'var(--green)' }}>
                  −74%
                </span>
              )}
            </div>
            <div style={{ marginTop: 5, fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.6)', minHeight: 18 }}>
              {an ? (es ? 'Facturado $890.000/año' : 'Billed $890,000/yr') : (es ? 'Facturado mensual' : 'Billed monthly')}
            </div>
            <button
              onClick={() => openOnb('growth')}
              style={{ width: '100%', height: 50, borderRadius: 14, marginTop: 18, fontSize: 15, fontWeight: 700, background: 'linear-gradient(100deg,#F6E4A6,#E8C766 50%,#B8912F)', color: '#1a1206', boxShadow: '0 12px 28px rgba(184,145,47,.45)' }}
            >
              {es ? 'Elegir Tura Growth' : 'Choose Tura Growth'}
            </button>
            <Link
              href="/home"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 42, borderRadius: 12, marginTop: 9, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,.06)', border: '1px solid var(--nightBorder)', color: 'var(--gold)' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#25D366', boxShadow: '0 0 0 3px rgba(37,211,102,.22)' }}></span>
              {es ? 'Ver demo en vivo' : 'See live demo'}
              <span className="tf-ms" style={{ fontSize: 16 }}>arrow_outward</span>
            </Link>
            <div style={{ marginTop: 20, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gold)' }}>
              {es ? 'Todo lo de Tura Food, y además' : 'Everything in Tura Food, plus'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 13 }}>
              {[
                'PWA tipo Rappi con tu marca',
                'Voice AI Host 24/7 (300 min)',
                'WhatsApp Business automatizado',
                'CRM + fidelización + cupones',
                'Sistema de reservas + recordatorios',
                'Email marketing + reseñas Google',
                'Google Ads PRO AI + Pixel + GA4',
                'Dashboard tiempo real + ROI',
                'Todos los métodos de pago Colombia'
              ].map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <span className="tf-ms" style={{ fontSize: 18, flex: 'none', marginTop: 1, color: 'var(--gold)' }}>check_circle</span>
                  <span style={{ fontSize: 13.5, lineHeight: 1.4, color: '#fff' }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ CAL.COM BOOKING ============ */}
      <div id="tf-cal" className="tf-wrap" style={{ paddingTop: 80, paddingBottom: 10 }}>
        <div style={{ position: 'relative', borderRadius: 30, overflow: 'hidden', background: 'linear-gradient(160deg,#241C12 0%,#150F09 60%,#0C0B0A 100%)', border: '1px solid var(--nightBorder)', boxShadow: '0 40px 90px rgba(12,11,10,.5)' }}>
          <div style={{ position: 'absolute', right: -90, top: -90, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,199,102,.22),transparent 68%)' }}></div>
          <div style={{ position: 'absolute', left: -70, bottom: -80, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,68,31,.18),transparent 70%)' }}></div>
          <div className="tf-cal tf-cardpad" style={{ position: 'relative', padding: 40 }}>
            <div style={{ position: 'relative' }}>
              <span className="tf-gold-text" style={{ fontSize: 12.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.12em' }}>
                {es ? '¿Aún con dudas?' : 'Still unsure?'}
              </span>
              <h2 className="tf-disp" style={{ margin: '12px 0 0', fontWeight: 800, fontSize: 36, lineHeight: 1.08, letterSpacing: '-.025em', color: '#fff', textWrap: 'balance' }}>
                {es ? 'Agenda una llamada ' : 'Book a call '}
                <span className="tf-serif tf-gold-text" style={{ fontWeight: 400 }}>{es ? 'gratis.' : 'free.'}</span>
              </h2>
              <p style={{ margin: '14px 0 0', fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,.68)' }}>
                {es
                  ? 'Hablemos 30 minutos. Te mostramos la plataforma, resolvemos tus dudas y armamos un plan de crecimiento para tu restaurante.'
                  : 'Let’s talk for 30 minutes. We’ll show you the platform, answer your questions and build a growth plan for your restaurant.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 24 }}>
                {[
                  es ? 'Demo en vivo de la plataforma' : 'Live platform demo',
                  es ? 'Resolvemos todas tus dudas' : 'We answer all your questions',
                  es ? 'Plan de crecimiento a tu medida' : 'A growth plan tailored to you'
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span className="tf-ms" style={{ fontSize: 21, color: 'var(--gold)' }}>check_circle</span>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: 'rgba(255,255,255,.9)' }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 24, padding: '9px 15px', borderRadius: 999, background: 'rgba(232,199,102,.1)', border: '1px solid var(--nightBorder)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 0 4px rgba(17,178,106,.18)' }}></span>
                <span className="tf-gold-text" style={{ fontSize: 12.5, fontWeight: 800 }}>{es ? '100% gratis · sin compromiso' : '100% free · no commitment'}</span>
              </div>
            </div>

            <div style={{ background: '#F6F5F2', border: '1px solid var(--nightBorder)', borderRadius: 22, padding: 12, boxShadow: '0 20px 50px rgba(0,0,0,.4)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px 10px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--goldDeep)' }}></span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#17140F' }}>{es ? 'Elige tu horario con un Growth Partner' : 'Pick your time with a Growth Partner'}</span>
              </div>
              <div id="my-cal-inline-growthpartner" style={{ width: '100%', height: 580, overflow: 'auto', borderRadius: 16, background: '#fff' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ FAQ ============ */}
      <div id="tf-faq" className="tf-wrap" style={{ paddingTop: 74, paddingBottom: 10, maxWidth: 820 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h2 className="tf-disp" style={{ margin: 0, fontWeight: 800, fontSize: 36, letterSpacing: '-.025em' }}>
            {es ? 'Preguntas ' : 'Frequently '}
            <span className="tf-serif" style={{ color: 'var(--primary)', fontWeight: 400 }}>{es ? 'frecuentes' : 'asked'}</span>
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {faqs.map((q, idx) => {
            const isOpen = faqOpen === idx;
            return (
              <button
                key={idx}
                onClick={() => setFaqOpen(isOpen ? -1 : idx)}
                style={{ textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 17, padding: '19px 20px', boxShadow: 'var(--shadowSm)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text)' }}>{q.q}</span>
                  <span className="tf-ms" style={{ fontSize: 23, color: 'var(--primary)', flex: 'none', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>
                    expand_more
                  </span>
                </div>
                {isOpen && (
                  <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--muted)', marginTop: 11 }}>
                    {q.a}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ FINAL CTA ============ */}
      <div className="tf-wrap" style={{ paddingTop: 70, paddingBottom: 60 }}>
        <div style={{ position: 'relative', borderRadius: 30, overflow: 'hidden', background: 'var(--primary)', padding: '54px 44px', textAlign: 'center', boxShadow: '0 30px 70px rgba(255,68,31,.32)' }}>
          <div style={{ position: 'absolute', right: -80, bottom: -90, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,.12)' }}></div>
          <div style={{ position: 'absolute', left: -70, top: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,.10)' }}></div>
          <div style={{ position: 'relative' }}>
            <h2 className="tf-disp" style={{ margin: 0, fontWeight: 800, fontSize: 42, lineHeight: 1.05, letterSpacing: '-.03em', color: '#fff', textWrap: 'balance' }}>
              {es ? 'Tu competencia ya está online. ' : 'Your competition is online. '}
              <span className="tf-serif" style={{ fontWeight: 400, color: '#fff' }}>{es ? '¿Y tú?' : 'Are you?'}</span>
            </h2>
            <p style={{ margin: '14px auto 0', fontSize: 17, lineHeight: 1.5, color: 'rgba(255,255,255,.9)', maxWidth: 520 }}>
              {es ? 'Crea tu cuenta gratis hoy y ten tu restaurante digital funcionando esta semana.' : 'Create your free account today and get your digital restaurant running this week.'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 28 }}>
              <button
                onClick={() => openOnb('starter')}
                style={{ height: 54, padding: '0 26px', borderRadius: 15, background: '#fff', color: 'var(--primary)', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 9, boxShadow: '0 14px 30px rgba(0,0,0,.18)' }}
              >
                <span className="tf-ms" style={{ fontSize: 21 }}>rocket_launch</span>
                {es ? 'Empezar gratis' : 'Start free'}
              </button>
              <button
                onClick={() => openOnb('growth')}
                style={{ height: 54, padding: '0 26px', borderRadius: 15, background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.34)', color: '#fff', fontSize: 16, fontWeight: 700 }}
              >
                {es ? 'Quiero Tura Growth' : 'I want Tura Growth'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============ FOOTER ============ */}
      <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="tf-wrap" style={{ paddingTop: 34, paddingBottom: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="tf-disp" style={{ fontWeight: 800, fontSize: 19, color: '#fff' }}>t</span>
            </div>
            <div>
              <div className="tf-disp" style={{ fontWeight: 800, fontSize: 16 }}>Tura Food <span className="tf-serif" style={{ color: 'var(--primary)' }}>AI</span></div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>turafood.com · Buenaventura, Colombia 🇨🇴</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <a href="https://app.turafood.com" target="_blank" rel="noopener" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>app.turafood.com</a>
            <Link href="/home" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>{es ? 'Ir al Menú PWA' : 'Go to PWA Menu'}</Link>
            <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>© 2026 Tura Food AI</span>
          </div>
        </div>
      </div>

      {/* ============ WHATSAPP FLOAT ============ */}
      <div style={{ position: 'fixed', right: 22, bottom: 22, zIndex: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="tf-wa-bubble tf-hide-sm">{es ? '¿Dudas? Escríbenos 👋' : 'Questions? Chat with us 👋'}</span>
        <a className="tf-wa" href={`https://wa.me/${waNumber}?text=${waText}`} target="_blank" rel="noopener" aria-label="WhatsApp">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.15c-1.52 0-3.01-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.35c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>
          <span style={{ position: 'absolute', top: -3, right: -3, width: 20, height: 20, borderRadius: '50%', background: '#FF441F', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, color: '#fff' }}>1</span>
        </a>
      </div>

      {/* ============ ONBOARDING MODAL ============ */}
      {onbOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(12,11,10,.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'tfpop .25s ease both' }}>
          <div className="tf-sc" style={{ width: '100%', maxWidth: 520, maxHeight: '92dvh', overflowY: 'auto', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 26, boxShadow: '0 50px 100px rgba(0,0,0,.4)', position: 'relative' }}>
            <div style={{ position: 'sticky', top: 0, background: 'var(--bg)', padding: '18px 22px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="tf-disp" style={{ fontWeight: 800, fontSize: 17, color: '#fff' }}>t</span>
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>
                    {es ? `Activa tu plan ${curMeta.name}` : `Activate ${curMeta.name}`}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    {es ? 'Solo 3 preguntas rápidas' : 'Just 3 quick questions'}
                  </div>
                </div>
              </div>
              <button onClick={closeOnb} style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tf-ms" style={{ fontSize: 20, color: 'var(--muted)' }}>close</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, padding: '14px 22px 0' }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i <= onbStep ? 'var(--primary)' : 'var(--surface3)', transition: 'background .3s' }}></div>
              ))}
            </div>

            {/* Questions Step */}
            {payPhase === '' && onbStep < onbQuestions.length && (
              <div style={{ padding: '22px 22px 24px' }}>
                <div className="tf-disp" style={{ fontWeight: 800, fontSize: 23, lineHeight: 1.12, letterSpacing: '-.02em', textWrap: 'balance' }}>
                  {onbQuestions[onbStep].title}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>
                  {onbQuestions[onbStep].sub}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                  {onbQuestions[onbStep].options.map((o) => {
                    const sel = onbAns[onbQuestions[onbStep].id] === o.v;
                    return (
                      <button
                        key={o.v}
                        onClick={() => pickAns(onbQuestions[onbStep].id, o.v)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 13,
                          textAlign: 'left',
                          padding: '15px 16px',
                          borderRadius: 15,
                          background: sel ? 'rgba(255,68,31,.08)' : 'var(--surface)',
                          border: sel ? '2px solid var(--primary)' : '1px solid var(--border)',
                          transition: 'all .15s',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: 24, flex: 'none' }}>{o.emoji}</span>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: sel ? 'var(--primary)' : 'var(--text)' }}>{o.label}</span>
                        <span className="tf-ms" style={{ fontSize: 22, color: sel ? 'var(--primary)' : 'var(--faint)' }}>
                          {sel ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  {onbStep > 0 && (
                    <button onClick={onbBack} style={{ height: 50, padding: '0 20px', borderRadius: 14, background: 'var(--surface2)', fontSize: 14.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="tf-ms" style={{ fontSize: 19 }}>arrow_back</span>{es ? 'Atrás' : 'Back'}
                    </button>
                  )}
                  <button
                    onClick={onbNext}
                    style={{
                      flex: 1,
                      height: 50,
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 700,
                      background: onbAns[onbQuestions[onbStep]?.id] ? 'var(--primary)' : 'var(--surface3)',
                      color: onbAns[onbQuestions[onbStep]?.id] ? '#fff' : 'var(--faint)',
                      cursor: onbAns[onbQuestions[onbStep]?.id] ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {es ? 'Continuar' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {/* Contact Step */}
            {payPhase === '' && onbStep === onbQuestions.length && (
              <div style={{ padding: 22 }}>
                <div className="tf-disp" style={{ fontWeight: 800, fontSize: 23, lineHeight: 1.14, letterSpacing: '-.02em', textWrap: 'balance' }}>
                  {es ? '¿A dónde enviamos tu acceso?' : 'Where do we send your access?'}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>
                  {es ? 'Con estos datos creamos tu cuenta en app.turafood.com.' : 'We use this to set up your account on app.turafood.com.'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
                  <label style={{ display: 'block' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{es ? 'Nombre del restaurante' : 'Restaurant name'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6, height: 50, padding: '0 14px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span className="tf-ms" style={{ fontSize: 19, color: 'var(--primary)' }}>storefront</span>
                      <input
                        value={onbContact.restaurante}
                        onChange={(e) => setOnbContact({ ...onbContact, restaurante: e.target.value })}
                        placeholder={es ? 'Ej. El Sazón del Puerto' : 'e.g. El Sazón del Puerto'}
                        style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}
                      />
                    </div>
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{es ? 'Tu nombre' : 'Your name'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6, height: 50, padding: '0 14px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span className="tf-ms" style={{ fontSize: 19, color: 'var(--primary)' }}>person</span>
                      <input
                        value={onbContact.nombre}
                        onChange={(e) => setOnbContact({ ...onbContact, nombre: e.target.value })}
                        placeholder={es ? 'Ej. Carlos Mosquera' : 'e.g. Carlos Mosquera'}
                        style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}
                      />
                    </div>
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>WhatsApp</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6, height: 50, padding: '0 14px', borderRadius: 13, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span className="tf-ms" style={{ fontSize: 19, color: '#25D366' }}>chat</span>
                      <input
                        value={onbContact.whatsapp}
                        onChange={(e) => setOnbContact({ ...onbContact, whatsapp: e.target.value })}
                        placeholder={es ? 'Ej. 320 123 4567' : 'e.g. 320 123 4567'}
                        style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}
                      />
                    </div>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={onbBack} style={{ height: 50, padding: '0 20px', borderRadius: 14, background: 'var(--surface2)', fontSize: 14.5, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="tf-ms" style={{ fontSize: 19 }}>arrow_back</span>{es ? 'Atrás' : 'Back'}
                  </button>
                  <button
                    onClick={() => {
                      if (onbContact.restaurante && onbContact.nombre && onbContact.whatsapp) {
                        setOnbStep(onbQuestions.length + 1);
                      }
                    }}
                    style={{
                      flex: 1,
                      height: 50,
                      borderRadius: 14,
                      fontSize: 15,
                      fontWeight: 700,
                      background: onbContact.restaurante && onbContact.nombre && onbContact.whatsapp ? 'var(--primary)' : 'var(--surface3)',
                      color: onbContact.restaurante && onbContact.nombre && onbContact.whatsapp ? '#fff' : 'var(--faint)',
                      cursor: onbContact.restaurante && onbContact.nombre && onbContact.whatsapp ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {es ? 'Continuar' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {/* Checkout / Summary Step */}
            {payPhase === '' && onbStep === onbQuestions.length + 1 && (
              <div style={{ padding: 22 }}>
                <div className="tf-disp" style={{ fontWeight: 800, fontSize: 23, letterSpacing: '-.02em' }}>
                  {es ? 'Resumen de tu plan' : 'Your plan summary'}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 5 }}>
                  {es ? 'Revisa y continúa al panel de control.' : 'Review and continue to control panel.'}
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 17, marginTop: 16, boxShadow: 'var(--shadowSm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,68,31,.13)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="tf-ms" style={{ fontSize: 20, color: 'var(--primary)' }}>{curMeta.icon}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{curMeta.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{coPeriod}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }}></div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{coLineLabel}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{coLineValue}</span>
                  </div>
                  {coHasDisc && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 13.5, color: 'var(--green)' }}>{es ? 'Descuento anual' : 'Annual discount'}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--green)' }}>−{coDisc}</span>
                    </div>
                  )}
                  <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }}></div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{es ? 'Total' : 'Total'}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div className="tf-disp" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', color: 'var(--text)' }}>{coTotal}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{coTotalNote}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={goPay}
                  style={{ width: '100%', height: 54, borderRadius: 15, marginTop: 18, background: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, boxShadow: '0 12px 28px rgba(255,68,31,.34)' }}
                >
                  <span className="tf-ms" style={{ fontSize: 22 }}>rocket_launch</span>
                  {isFree ? (es ? 'Crear mi cuenta gratis' : 'Create my free account') : (es ? `Pagar ${coTotal} con ePayco` : `Pay ${coTotal} with ePayco`)}
                </button>
              </div>
            )}

            {/* Paying Phase */}
            {payPhase !== '' && (
              <div style={{ padding: '46px 30px 50px', textAlign: 'center' }}>
                {payPhase === 'done' ? (
                  <>
                    <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'rgba(17,178,106,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', animation: 'tfpop .4s ease both' }}>
                      <span className="tf-ms" style={{ fontSize: 42, color: 'var(--green)' }}>check</span>
                    </div>
                    <div className="tf-disp" style={{ fontWeight: 800, fontSize: 25, marginTop: 18, letterSpacing: '-.02em' }}>
                      {es ? '¡Listo! 🎉' : 'All set! 🎉'}
                    </div>
                    <div style={{ fontSize: 14.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5, maxWidth: 340, margin: '8px auto 0' }}>
                      {es
                        ? `Tu restaurante "${onbContact.restaurante || 'TuraFood'}" está registrado. Entra a tu panel en app.turafood.com.`
                        : `Your restaurant is registered. Enter your control panel at app.turafood.com.`}
                    </div>
                    <a
                      href="https://app.turafood.com"
                      target="_blank"
                      rel="noopener"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 50, padding: '0 26px', borderRadius: 14, marginTop: 24, background: 'var(--primary)', color: '#fff', fontSize: 15, fontWeight: 700, boxShadow: '0 10px 24px rgba(255,68,31,.3)' }}
                    >
                      {es ? 'Ir a mi panel de negocio' : 'Go to my dashboard'}
                      <span className="tf-ms" style={{ fontSize: 19 }}>arrow_forward</span>
                    </a>
                  </>
                ) : (
                  <>
                    <div style={{ width: 58, height: 58, borderRadius: '50%', border: '5px solid var(--surface2)', borderTopColor: 'var(--primary)', margin: '0 auto', animation: 'tfspin .8s linear infinite' }}></div>
                    <div className="tf-disp" style={{ fontWeight: 800, fontSize: 21, marginTop: 22, letterSpacing: '-.02em' }}>
                      {es ? 'Creando tu cuenta en app.turafood.com…' : 'Setting up your account…'}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 7 }}>
                      {es ? 'Configurando tus accesos y menú digital.' : 'Preparing your digital access and menu.'}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
