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
 * Tema claro/oscuro.
 *
 * El valor por defecto es CLARO, no el del sistema. La app se usa a
 * plena luz en el puerto; el claro se lee mejor ahí. Quien prefiera
 * oscuro lo prende con el botón de la barra y se le recuerda.
 *
 * El atributo ya viene puesto desde el <head> (ver layout.js), así que
 * este hook solo tiene que leer en qué quedó — no aplicarlo de nuevo.
 * Aplicarlo acá otra vez causaba un frame con el tema equivocado.
 */
/** El orden del ciclo del botón */
export const TEMAS = ['light', 'dark', 'puerto'];

/** Cómo se llama y se ve cada uno en el botón */
export const TEMA_INFO = {
  light:  { icono: 'light_mode', nombre: 'Claro' },
  dark:   { icono: 'dark_mode',  nombre: 'Oscuro' },
  puerto: { icono: 'sailing',    nombre: 'Turín Turán' },
};

export function useTheme() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem(KEY.theme);
    setTheme(TEMAS.includes(saved) ? saved : 'light');
  }, []);

  const apply = useCallback((next) => {
    const valor = TEMAS.includes(next) ? next : 'light';
    setTheme(valor);
    localStorage.setItem(KEY.theme, valor);
    // Siempre queda un `data-theme` explícito: nunca se vuelve al
    // "lo que diga el sistema", que era de donde salía la mezcla.
    document.documentElement.setAttribute('data-theme', valor);
  }, []);

  /**
   * Cicla claro → oscuro → puerto → claro.
   *
   * "Puerto" va de último a propósito: es el que menos gente va a
   * querer de entrada, pero el que más va a gustar cuando lo
   * descubran. Ponerlo segundo obligaría a pasar por él a todo el que
   * solo quiere oscuro.
   */
  const toggle = useCallback(() => {
    const i = TEMAS.indexOf(theme);
    apply(TEMAS[(i + 1) % TEMAS.length]);
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
