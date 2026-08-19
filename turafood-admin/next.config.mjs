/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autónomo para Docker (imagen pequeña)
  output: 'standalone',

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Turbopack: ancla el root al directorio de la app.
  experimental: {
    turbopack: {
      root: '.',
    },
  },
};

export default nextConfig;
