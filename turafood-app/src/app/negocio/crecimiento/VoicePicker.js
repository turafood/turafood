'use client';

/**
 * SELECTOR DE VOZ DEL AGENTE
 *
 * La muestra se genera con la síntesis de voz del propio navegador. No
 * es la voz final —esa la monta el equipo con el proveedor— pero deja
 * oír el tono y la velocidad, que es lo que la persona necesita para
 * decidir. Está dicho debajo para que nadie espere exactamente eso.
 */

import { useEffect, useState } from 'react';

const SAMPLE = 'Hola, gracias por llamar. ¿Qué te provoca pedir hoy?';

export default function VoicePicker({ field, value, onChange, accent }) {
  const [speaking, setSpeaking] = useState(null);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => { try { window.speechSynthesis?.cancel(); } catch { /* nada */ } };
  }, []);

  const play = (option) => {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(option.sample ?? SAMPLE);
    u.lang = 'es-CO';
    u.rate = option.rate ?? 1;
    u.pitch = option.pitch ?? 1;

    // Se prefiere una voz en español si el sistema tiene alguna
    const voices = window.speechSynthesis.getVoices();
    const es = voices.find((v) => v.lang?.toLowerCase().startsWith('es'));
    if (es) u.voice = es;

    u.onend = () => setSpeaking(null);
    u.onerror = () => setSpeaking(null);
    setSpeaking(option.value);
    window.speechSynthesis.speak(u);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <span style={S.label}>
        {field.label}
        {!field.required && <span style={{ color: 'var(--faint)', fontWeight: 600 }}> · opcional</span>}
      </span>

      <div style={S.grid}>
        {field.options.map((o) => {
          const on = value === o.value;
          return (
            <div
              key={o.value}
              style={{
                ...S.card,
                borderColor: on ? accent : 'var(--border)',
                boxShadow: on ? `0 0 0 2px ${accent}22` : 'none',
              }}
            >
              <button onClick={() => onChange(o.value)} style={S.pick}>
                <span style={{ ...S.avatar, background: o.tint }}>{o.avatar}</span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{o.label}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>
                    {o.description}
                  </span>
                </span>
                {on && (
                  <span className="ms" style={{ fontSize: 20, color: accent, flex: 'none' }}>check_circle</span>
                )}
              </button>

              {canSpeak && (
                <button
                  onClick={() => play(o)}
                  style={{ ...S.play, color: speaking === o.value ? accent : 'var(--muted)' }}
                  aria-label={`Escuchar ${o.label}`}
                >
                  <span className="ms" style={{ fontSize: 17 }}>
                    {speaking === o.value ? 'graphic_eq' : 'play_circle'}
                  </span>
                  {speaking === o.value ? 'Sonando…' : 'Escuchar'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p style={S.hint}>
        {canSpeak
          ? 'La muestra la genera tu navegador: sirve para el tono y la velocidad, no es la voz final. Esa la montamos con el proveedor.'
          : 'Tu navegador no puede reproducir la muestra, pero la descripción te dice cómo suena cada una.'}
      </p>
    </div>
  );
}

const S = {
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 11,
  },
  card: {
    border: '1.5px solid', borderRadius: 16, background: 'var(--surface)',
    overflow: 'hidden', transition: 'border-color .15s ease, box-shadow .15s ease',
  },
  pick: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 14,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 14, flex: 'none', fontSize: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  play: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%', height: 38,
    justifyContent: 'center', borderTop: '1px solid var(--border)',
    background: 'var(--bg)', fontSize: 12, fontWeight: 700,
  },
  hint: { margin: '10px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 },
};
