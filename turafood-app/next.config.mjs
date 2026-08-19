/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autónomo para Docker (imagen pequeña)
  output: 'standalone',

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Turbopack: ancla el root al directorio de la app para que no confunda
  // el package-lock.json del perfil de usuario con el del repositorio.
  experimental: {
    turbopack: {
      root: '.',
    },
  },
};

export default nextConfig;
