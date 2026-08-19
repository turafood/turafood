'use client';

/**
 * CUENTA DEL REPARTIDOR
 * Conversión de `isAccount` (línea 703) del mockup del Repartidor.
 *
 * El estado de la cuenta sale de `courier_profiles.approval_status`,
 * que es lo que mueve el Super Admin al aprobar a un repartidor.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRider } from '../RiderContext';
import Videollamada from '../../components/Videollamada';

const APPROVAL = {
  pending_review: {
    label: 'En revisión', color: '#A8730B', dot: 'var(--amber)', icon: 'schedule',
    note: 'Agenda una videollamada corta con el equipo y quedas habilitado. Mientras tanto puedes mirar todo por dentro.',
  },
  active: {
    label: 'Activa', color: 'var(--green)', dot: 'var(--green)', icon: 'check',
    note: 'Tu cuenta está aprobada. Conéctate desde Inicio para empezar a recibir pedidos.',
  },
  rejected: {
    label: 'Rechazada', color: 'var(--primary)', dot: 'var(--primary)', icon: 'close',
    note: 'Tu solicitud fue rechazada. Escríbenos para saber qué corregir.',
  },
  suspended: {
    label: 'Suspendida', color: 'var(--muted)', dot: 'var(--faint)', icon: 'pause',
    note: 'Tu cuenta está suspendida. Contáctanos para revisar tu caso.',
  },
};

const VEHICLE = {
  motorcycle: 'Moto', bicycle: 'Bicicleta', car: 'Carro',
};

/**
 * Los papeles sin los cuales no puede salir a rodar.
 *
 * Dos de ellos vencen (SOAT y tecnomecanica) y por eso llevan fecha:
 * enterarse de que vencio el dia que lo paran es la peor forma de
 * enterarse. La app avisa treinta dias antes.
 *
 * La bicicleta no necesita licencia ni papeles del vehiculo, asi que
 * se filtran segun lo que maneje.
 */
const DOCS = [
  { id: 'cedula', label: 'Cedula', icon: 'badge', expires: false, vehicles: null },
  { id: 'licencia', label: 'Licencia de conduccion', icon: 'contact_page', expires: true, vehicles: ['motorcycle', 'car'] },
  { id: 'soat', label: 'SOAT', icon: 'verified_user', expires: true, vehicles: ['motorcycle', 'car'] },
  { id: 'tecnomecanica', label: 'Tecnomecanica', icon: 'build', expires: true, vehicles: ['motorcycle', 'car'] },
];

const DAY = 86400000;

/** Verde si falta mas de un mes, ambar si menos, rojo si ya vencio */
function docState(doc, courier) {
  const raw = courier?.documents?.[doc.id];
  if (!raw) {
    return { label: 'Falta subirlo', color: 'var(--primary)', icon: 'error', urgent: true };
  }
  if (!doc.expires || !raw.expires_at) {
    return { label: 'Aprobada', color: 'var(--green)', icon: 'check_circle' };
  }

  const days = Math.round((new Date(raw.expires_at) - Date.now()) / DAY);
  if (days < 0) {
    return { label: 'Vencida', color: 'var(--primary)', icon: 'error', urgent: true, days };
  }
  if (days <= 30) {
    return { label: 'Vence pronto', color: 'var(--amber)', icon: 'schedule', warn: true, days };
  }
  return { label: 'Aprobada', color: 'var(--green)', icon: 'check_circle', days };
}

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function CuentaPage() {
  const router = useRouter();
  const { courier, online } = useRider();
  const [busy, setBusy] = useState(false);

  const st = APPROVAL[courier?.approval_status] ?? APPROVAL.pending_review;

  // Solo los papeles que le aplican a lo que maneja
  const docs = DOCS.filter(
    (d) => !d.vehicles || d.vehicles.includes(courier?.vehicle_type ?? 'motorcycle'),
  );

  /**
   * Un solo aviso, el mas urgente. Cuatro avisos apilados se leen como
   * ruido y no se atiende ninguno.
   */
  const alerta = (() => {
    const states = docs.map((d) => ({ d, s: docState(d, courier) }));
    const vencido = states.find((x) => x.s.urgent);
    if (vencido) {
      return {
        bg: '#FFF0ED', fg: '#C0341A', icon: 'error',
        // Ya no bloquea: los documentos son opcionales. El aviso se
        // queda porque a quien SÍ los tiene cargados le sirve saber
        // que se le vencieron, pero sin la amenaza que era mentira.
        text: `${vencido.d.label}: ${vencido.s.label.toLowerCase()}. Si lo tienes al día, actualízalo desde soporte.`,
      };
    }
    const pronto = states.find((x) => x.s.warn);
    if (pronto) {
      return {
        bg: '#FFF7E6', fg: '#7A5405', icon: 'schedule',
        text: `Tu ${pronto.d.label.toLowerCase()} vence en ${pronto.s.days} dias. Sube el nuevo antes de esa fecha para no quedar inactivo.`,
      };
    }
    return null;
  })();

  const signOut = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  return (
    <>
      <header style={S.header}>
        <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em' }}>
          Cuenta
        </span>
      </header>

      <div className="sc" style={S.scroll}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={S.avatar}>{initials(courier?.profile?.full_name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>
              {courier?.profile?.full_name ?? 'Repartidor'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {courier?.created_at
                ? `Repartidor desde ${new Date(courier.created_at).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`
                : 'Repartidor en TuraFood'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11, marginTop: 18 }}>
          {[
            { value: Number(courier?.profile?.rating ?? 5).toFixed(1).replace('.', ','), label: 'Calificación' },
            { value: (courier?.total_deliveries ?? 0).toLocaleString('es-CO'), label: 'Entregas' },
            { value: `${Math.round(courier?.acceptance_rate ?? 100)}%`, label: 'Aceptación' },
          ].map((p) => (
            <div key={p.label} style={S.stat}>
              <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19 }}>
                {p.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 3 }}>{p.label}</div>
            </div>
          ))}
        </div>

        {/* Estado de la cuenta */}
        <div style={S.card}>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16.5 }}>
            Estado de tu cuenta
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 13 }}>
            <span style={{ ...S.dot, background: st.dot }}>
              <span className="ms" style={{ fontSize: 16, color: '#fff' }}>{st.icon}</span>
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>Verificación</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: st.color }}>{st.label}</span>
          </div>

          <div
            style={{
              ...S.note,
              background: courier?.approval_status === 'active' ? '#E6F6EE' : '#FFF7E6',
              color: courier?.approval_status === 'active' ? '#0B7A48' : '#7A5405',
            }}
          >
            <span className="ms" style={{ fontSize: 18, flex: 'none' }}>
              {courier?.approval_status === 'active' ? 'verified' : 'schedule'}
            </span>
            <span style={{ fontSize: 12, lineHeight: 1.45 }}>
              {courier?.rejection_reason || st.note}
            </span>
          </div>
        </div>

        {/* La videollamada: es lo que de verdad habilita la cuenta */}
        <div style={S.card}>
          <Videollamada />
        </div>

        {/* Documentos — OPCIONALES.
            Antes decían "sin esto no puedes salir a rodar", que era
            falso y además dejaba por fuera a quien reparte en
            bicicleta y no tiene licencia ni SOAT. Se dejan porque a
            quien los tenga le sirve tenerlos cargados, pero ya no
            bloquean nada. */}
        <div style={S.card}>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16.5 }}>
            Documentos <span style={S.opcional}>OPCIONAL</span>
          </div>
          <p style={S.docsNota}>
            No hacen falta para rodar. Si los tienes al día, cárgalos y te
            ahorras preguntas en la videollamada.
          </p>

          <div style={{ marginTop: 6 }}>
            {docs.map((d, i) => {
              const st2 = docState(d, courier);
              return (
                <div
                  key={d.id}
                  style={{
                    ...S.docRow,
                    borderBottom: i === docs.length - 1 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <span className="ms" style={{ fontSize: 20, color: st2.color, flex: 'none' }}>
                    {st2.icon}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{d.label}</span>
                    {st2.days != null && st2.days >= 0 && (
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {st2.days === 0 ? 'Vence hoy' : `Vence en ${st2.days} dias`}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: st2.color, flex: 'none' }}>
                    {st2.label}
                  </span>
                </div>
              );
            })}
          </div>

          {alerta && (
            <div style={{ ...S.note, background: alerta.bg, color: alerta.fg }}>
              <span className="ms" style={{ fontSize: 18, flex: 'none' }}>{alerta.icon}</span>
              <span style={{ fontSize: 12, lineHeight: 1.45 }}>{alerta.text}</span>
            </div>
          )}
        </div>

        {/* Datos */}
        <div style={S.filas}>
          <Row
            icon="two_wheeler" label="Mi vehículo"
            tint="#FFF1EC" fg="#E2360F"
            value={`${VEHICLE[courier?.vehicle_type] ?? 'Sin registrar'}${courier?.plate ? ` · ${courier.plate}` : ''}`}
          />
          <Row
            icon="call" label="Teléfono"
            tint="#EAF1FF" fg="#2E6BFF"
            value={courier?.profile?.phone ?? 'Sin registrar'}
          />
          <Row
            icon="bolt" label="Conexión"
            tint={online ? '#E6F6EE' : 'var(--surface2)'}
            fg={online ? '#0B8E54' : 'var(--muted)'}
            value={online ? 'En línea, recibiendo pedidos' : 'Desconectado'}
          />
          <Row
            icon="map" label="Zona de trabajo"
            tint="#FFF7E6" fg="#A8730B"
            value="Buenaventura"
          />
        </div>

        <a href="https://wa.me/573137594713" target="_blank" rel="noopener noreferrer" style={S.support}>
          <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>headset_mic</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>Ayuda y soporte</span>
          <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
        </a>

        <button onClick={signOut} disabled={busy} style={S.signOut}>
          {busy ? 'Saliendo…' : 'Cerrar sesión'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--faint)', marginTop: 14 }}>
          TuraFood Repartidor · v1.0.0
        </div>
      </div>
    </>
  );
}

/**
 * Una fila de la cuenta, como en el mockup (linea 276): tarjeta
 * propia, icono grande con su tinte y el dato debajo del nombre.
 *
 * Antes era una lista plana con el valor alineado a la derecha, y en
 * pantalla angosta el nombre y el dato se peleaban la misma linea: la
 * placa quedaba cortada y todo se veia apretado.
 */
function Row({ icon, label, value, tint, fg }) {
  return (
    <div style={S.fila}>
      <span style={{ ...S.filaIcono, background: tint }}>
        <span className="ms" style={{ fontSize: 21, color: fg }}>{icon}</span>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={S.filaLabel}>{label}</span>
        <span className="tr1" style={S.filaValor}>{value}</span>
      </span>
      <span className="ms" style={{ fontSize: 20, color: 'var(--faint)', flex: 'none' }}>
        chevron_right
      </span>
    </div>
  );
}

const S = {
  opcional: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.07em',
    padding: '3px 8px', borderRadius: 999, marginLeft: 8,
    background: 'var(--surface2)', color: 'var(--muted)',
    verticalAlign: 'middle',
  },
  docsNota: {
    margin: '6px 0 2px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)',
  },

  filas: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 },
  fila: {
    display: 'flex', alignItems: 'center', gap: 14, padding: 18,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18,
  },
  filaIcono: {
    width: 42, height: 42, borderRadius: 13, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  filaLabel: { display: 'block', fontWeight: 700, fontSize: 14.5 },
  filaValor: {
    display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 3,
  },
  header: { flex: 'none', padding: '18px 20px 10px' },
  scroll: { flex: 1, overflowY: 'auto', padding: '8px 20px 108px', minHeight: 0 },
  avatar: {
    width: 64, height: 64, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22,
    color: 'var(--muted)', flex: 'none',
  },
  stat: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
    padding: 14, textAlign: 'center', boxShadow: 'var(--shadowSm)', minWidth: 0,
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    padding: 18, marginTop: 16, boxShadow: 'var(--shadowSm)',
  },
  dot: {
    width: 26, height: 26, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  note: { display: 'flex', gap: 9, marginTop: 14, borderRadius: 12, padding: 12 },
  docRow: {
    display: 'flex', alignItems: 'center', gap: 11, padding: '12px 0',
  },
  rowsCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    marginTop: 16, padding: '4px 16px', boxShadow: 'var(--shadowSm)',
  },
  support: {
    display: 'flex', alignItems: 'center', gap: 13, marginTop: 16, padding: '15px 16px',
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    boxShadow: 'var(--shadowSm)', textDecoration: 'none', color: 'var(--text)',
  },
  signOut: {
    width: '100%', height: 50, borderRadius: 16, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--primary)', fontWeight: 700,
    fontSize: 14.5, marginTop: 16,
  },
};
