import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function applySkinToDocument(skin, accent) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  if (skin === 'editorial') {
    root.setAttribute('data-skin', 'editorial');
    root.classList.add('skin-editorial');
    root.classList.remove('skin-vibrant');
  } else {
    root.setAttribute('data-skin', 'vibrant');
    root.classList.add('skin-vibrant');
    root.classList.remove('skin-editorial');
  }

  if (accent) {
    root.style.setProperty('--brand-accent', accent);
  } else {
    root.style.removeProperty('--brand-accent');
  }
}

export const useSkinStore = create(
  persist(
    (set, get) => ({
      skin: 'vibrant', // 'vibrant' (TuraFood delivery) | 'editorial' (Tura Muebles luxury)
      brandAccent: '#111111',
      setSkin: (skin, accent) => {
        applySkinToDocument(skin, accent);
        set({ skin, ...(accent ? { brandAccent: accent } : {}) });
      },
      toggleSkin: () => {
        const next = get().skin === 'editorial' ? 'vibrant' : 'editorial';
        applySkinToDocument(next, get().brandAccent);
        set({ skin: next });
      },
    }),
    {
      name: 'turafood_skin_preference',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applySkinToDocument(state.skin, state.brandAccent);
        }
      },
    }
  )
);
