'use client';

/**
 * PREFERENCIAS DE LA PERSONA: tema, idioma y menú colapsado.
 *
 * Se guardan en el navegador. El valor inicial se lee en un efecto y
 * no durante el render, porque el servidor no tiene localStorage y el
 * HTML no coincidiría con el del navegador.
 */

import { useCallback, useEffect, useState } from 'react';

const KEY = {
  theme: 'turafood-theme',
  lang: 'turafood-lang',
  rail: 'turafood-rail',
};

/**
 * Tema claro/oscuro. `null` significa "lo que diga el sistema", que es
 * el arranque por defecto: la mayoría no quiere elegir.
 */
export function useTheme() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(KEY.theme);
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
      document.documentElement.setAttribute('data-theme', saved);
    }
  }, []);

  const apply = useCallback((next) => {
    setTheme(next);
    if (next) {
      localStorage.setItem(KEY.theme, next);
      document.documentElement.setAttribute('data-theme', next);
    } else {
      localStorage.removeItem(KEY.theme);
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  /** Alterna entre claro y oscuro tomando el estado real de la pantalla */
  const toggle = useCallback(() => {
    const current = theme
      ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    apply(current === 'dark' ? 'light' : 'dark');
  }, [theme, apply]);

  return { theme, setTheme: apply, toggle };
}

/** Idioma de la interfaz. Español por defecto: la app es de Buenaventura. */
export function useLang() {
  const [lang, setLang] = useState('es');

  useEffect(() => {
    const saved = localStorage.getItem(KEY.lang);
    if (saved === 'en' || saved === 'es') setLang(saved);
  }, []);

  const apply = useCallback((next) => {
    setLang(next);
    localStorage.setItem(KEY.lang, next);
    document.documentElement.setAttribute('lang', next);
  }, []);

  return { lang, setLang: apply, toggle: () => apply(lang === 'es' ? 'en' : 'es') };
}

/** Menú lateral recogido a solo iconos */
export function useRail() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(KEY.rail) === '1');
  }, []);

  const apply = useCallback((next) => {
    setCollapsed(next);
    localStorage.setItem(KEY.rail, next ? '1' : '0');
  }, []);

  return { collapsed, setCollapsed: apply, toggle: () => apply(!collapsed) };
}
