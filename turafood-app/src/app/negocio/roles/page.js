'use client';

import { useState } from 'react';
import { useBiz } from '../BizContext';

const DEFAULT_ROLES = [
  {
    id: 'owner',
    name: 'Propietario / Dueño',
    icon: 'workspace_premium',
    color: '#E8C766',
    desc: 'Control total de la tienda, finanzas, llaves API, catálogo y borrado de cuenta.',
    members: 1,
    permisos: { comandas: true, menu: true, finanzas: true, promos: true, ajustes: true },
  },
  {
    id: 'admin',
    name: 'Administrador / Gerente',
    icon: 'manage_accounts',
    color: '#60A5FA',
    desc: 'Gestión diaria de comandas, edición de precios, creación de promociones y reportes.',
    members: 1,
    permisos: { comandas: true, menu: true, finanzas: true, promos: true, ajustes: false },
  },
  {
    id: 'kitchen',
    name: 'Jefe de Cocina / KDS',
    icon: 'restaurant',
    color: '#FF7A4D',
    desc: 'Acceso exclusivo al monitor de comandas en vivo para marcar pedidos en preparación y listos.',
    members: 2,
    permisos: { comandas: true, menu: false, finanzas: false, promos: false, ajustes: false },
  },
  {
    id: 'cashier',
    name: 'Cajero / Facturación',
    icon: 'point_of_sale',
    color: '#11B26A',
    desc: 'Cobro de pedidos en local y confirmación de transferencias a Nequi / Daviplata.',
    members: 1,
    permisos: { comandas: true, menu: false, finanzas: false, promos: false, ajustes: false },
  },
  {
    id: 'rider',
    name: 'Domiciliario Propio',
    icon: 'moped',
    color: '#C084FC',
    desc: 'Recibe la ruta y dirección del cliente para entregar los pedidos asignados a su moto.',
    members: 2,
    permisos: { comandas: true, menu: false, finanzas: false, promos: false, ajustes: false },
  },
];

const INITIAL_MEMBERS = [
  { id: 'm1', name: 'Carlos Riascos (Tú)', email: 'carlos@turafood.com', role: 'owner', status: 'active', avatar: 'CR' },
  { id: 'm2', name: 'María Valencia', email: 'maria.gerencia@gmail.com', role: 'admin', status: 'active', avatar: 'MV' },
  { id: 'm3', name: 'Chef Jairo Moreno', email: 'jairo.cocina@gmail.com', role: 'kitchen', status: 'active', avatar: 'JM' },
  { id: 'm4', name: 'Leidy Angulo', email: 'leidy.caja@gmail.com', role: 'cashier', status: 'active', avatar: 'LA' },
  { id: 'm5', name: 'Andrés Hurtado', email: 'andres.domicilios@gmail.com', role: 'rider', status: 'active', avatar: 'AH' },
];

export default function RolesPage() {
  const { business, toast } = useBiz();
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '', role: 'kitchen' });
  const [inviteLink, setInviteLink] = useState(null);

  const handleInvite = (e) => {
    e.preventDefault();
    if (!newMember.name || (!newMember.email && !newMember.phone)) {
      toast('Ingresa el nombre y correo o teléfono del colaborador', { icono: 'error' });
      return;
    }

    const id = `m_${Date.now()}`;
    const initials = newMember.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const created = {
      id,
      name: newMember.name,
      email: newMember.email || `+57 ${newMember.phone}`,
      role: newMember.role,
      status: 'invited',
      avatar: initials,
    };

    setMembers([created, ...members]);
    const mockMagic = `${window.location.origin}/auth?invite=${id}&role=${newMember.role}`;
    setInviteLink(mockMagic);
    toast(`Invitación generada para ${newMember.name}`, { icono: 'person_add' });
  };

  const removeMember = (id) => {
    setMembers(members.filter((m) => m.id !== id));
    toast('Colaborador removido del equipo', { icono: 'delete' });
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Top Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16, marginBottom: 24,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              Seguridad & Accesos
            </span>
            <span style={{
              fontSize: 10, fontWeight: 800, color: '#11B26A',
              background: 'rgba(17,178,106,0.12)', border: '1px solid rgba(17,178,106,0.25)',
              padding: '2px 8px', borderRadius: 99,
            }}>
              ● RLS ACTIVO
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-bricolage)', fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-.02em' }}>
            Roles, Equipo y Permisos
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '6px 0 0', maxWidth: 620, lineHeight: 1.5 }}>
            Asigna qué puede ver y modificar cada miembro de tu personal: cocina, caja, administración y domiciliarios propios.
          </p>
        </div>

        <button
          onClick={() => { setModalOpen(true); setInviteLink(null); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            height: 44, padding: '0 20px', borderRadius: 14,
            background: 'linear-gradient(145deg, #FF5B2E, #E2360F)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 13.5,
            cursor: 'pointer', boxShadow: '0 6px 20px rgba(255, 68, 31, 0.4)',
          }}
        >
          <span className="ms" style={{ fontSize: 20 }}>person_add</span>
          Invitar Colaborador
        </button>
      </div>

      {/* KPI Bento Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
          padding: '16px 18px', boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Equipo Activo
          </div>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontSize: 28, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
            {members.length} <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>miembros</span>
          </div>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
          padding: '16px 18px', boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Roles Configurados
          </div>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontSize: 28, fontWeight: 800, color: '#E8C766', marginTop: 4 }}>
            5 <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}>perfiles</span>
          </div>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
          padding: '16px 18px', boxShadow: 'var(--shadow)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Aislamiento de Datos
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span className="ms" style={{ fontSize: 22, color: '#11B26A' }}>verified_user</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Blindado 100%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Roles Cards + Team List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        
        {/* Left Column: Roles Cards */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>shield</span>
            Estructura de Roles y Permisos
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DEFAULT_ROLES.map((r) => (
              <div
                key={r.id}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 18, padding: '16px', boxShadow: 'var(--shadow)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 12, background: `color-mix(in srgb, ${r.color} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${r.color} 30%, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color,
                    }}>
                      <span className="ms" style={{ fontSize: 20 }}>{r.icon}</span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
                        {members.filter((m) => m.role === r.id).length} asignados
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: 10, fontWeight: 800, color: r.color,
                    background: `color-mix(in srgb, ${r.color} 12%, transparent)`,
                    padding: '3px 8px', borderRadius: 99,
                  }}>
                    {r.id.toUpperCase()}
                  </span>
                </div>

                <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '10px 0 12px', lineHeight: 1.45 }}>
                  {r.desc}
                </p>

                {/* Permissions Pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(r.permisos).map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                        background: v ? 'rgba(17,178,106,0.1)' : 'rgba(255,255,255,0.04)',
                        color: v ? '#11B26A' : 'var(--faint)',
                        border: `1px solid ${v ? 'rgba(17,178,106,0.2)' : 'var(--border)'}`,
                      }}
                    >
                      {v ? '✓' : '✗'} {k}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Members List */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ms" style={{ fontSize: 20, color: '#11B26A' }}>group</span>
            Miembros del Negocio ({members.length})
          </div>

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '8px', boxShadow: 'var(--shadow)',
          }}>
            {members.map((m, idx) => {
              const rolInfo = DEFAULT_ROLES.find((r) => r.id === m.role) || DEFAULT_ROLES[0];
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 14,
                    borderBottom: idx === members.length - 1 ? 'none' : '1px solid var(--border)',
                    background: 'transparent', transition: 'background .2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(255,68,31,0.2), rgba(232,199,102,0.2))',
                      border: '1px solid rgba(255,68,31,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 13, color: 'var(--text)',
                    }}>
                      {m.avatar}
                    </div>

                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                        {m.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: rolInfo.color,
                      background: `color-mix(in srgb, ${rolInfo.color} 12%, transparent)`,
                      padding: '4px 10px', borderRadius: 99,
                    }}>
                      {rolInfo.name.split('/')[0].trim()}
                    </span>

                    {m.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(m.id)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--muted)',
                          cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
                        }}
                        title="Remover miembro"
                      >
                        <span className="ms" style={{ fontSize: 18 }}>delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            width: '100%', maxWidth: 460, background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 24, padding: '28px 24px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-bricolage)', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
                Invitar Colaborador
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                <span className="ms" style={{ fontSize: 22 }}>close</span>
              </button>
            </div>

            {inviteLink ? (
              <div>
                <div style={{
                  padding: '16px', borderRadius: 16, background: 'rgba(17,178,106,0.12)',
                  border: '1px solid rgba(17,178,106,0.3)', marginBottom: 16,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#11B26A', marginBottom: 4 }}>
                    ¡Enlace Mágico de Acceso Creado!
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                    Comparte este enlace con tu colaborador para que entre a su módulo asignado sin necesidad de crear contraseñas.
                  </p>
                </div>

                <div style={{
                  background: 'var(--surface2)', padding: '10px 14px', borderRadius: 12,
                  border: '1px solid var(--border)', fontSize: 12, wordBreak: 'break-all',
                  marginBottom: 16, color: 'var(--text)',
                }}>
                  {inviteLink}
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast('Enlace copiado al portapapeles', { icono: 'content_copy' });
                    }}
                    style={{
                      flex: 1, height: 44, borderRadius: 12, background: 'var(--surface2)',
                      border: '1px solid var(--border)', fontWeight: 700, fontSize: 13,
                      color: 'var(--text)', cursor: 'pointer',
                    }}
                  >
                    Copiar Enlace
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hola, únete al equipo de ${business?.name || 'nuestro restaurante'} en Tura Food AI usando este enlace de acceso: ${inviteLink}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      flex: 1, height: 44, borderRadius: 12, background: '#25D366',
                      border: 'none', fontWeight: 700, fontSize: 13, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 6, textDecoration: 'none',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 18 }}>chat</span>
                    Enviar por WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                    Nombre del Colaborador
                  </label>
                  <input
                    type="text"
                    required
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="Ej: Laura Gómez"
                    style={{
                      width: '100%', height: 44, borderRadius: 12, padding: '0 12px',
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 13.5, outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                    Correo o Celular de WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    placeholder="laura@gmail.com o 312 345 6789"
                    style={{
                      width: '100%', height: 44, borderRadius: 12, padding: '0 12px',
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 13.5, outline: 'none',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                    Rol Asignado
                  </label>
                  <select
                    value={newMember.role}
                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                    style={{
                      width: '100%', height: 44, borderRadius: 12, padding: '0 12px',
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 13.5, outline: 'none',
                    }}
                  >
                    {DEFAULT_ROLES.filter((r) => r.id !== 'owner').map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%', height: 46, borderRadius: 14,
                    background: 'linear-gradient(145deg, #FF5B2E, #E2360F)',
                    color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
                    cursor: 'pointer', boxShadow: '0 6px 20px rgba(255, 68, 31, 0.4)',
                  }}
                >
                  Generar Invitación y Magic Link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
