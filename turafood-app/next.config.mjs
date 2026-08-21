/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autónomo para Docker (imagen pequeña)
  output: 'standalone',

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Turbopack: ancla el root al directorio de la app
  turbopack: {
    root: '.',
  },
  allowedDevOrigins: ['172.22.96.1', 'localhost', '127.0.0.1'],
};

export default nextConfig;
