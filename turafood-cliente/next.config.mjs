/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un build autónomo: la imagen de Docker queda en ~150 MB
  // en vez de arrastrar todo node_modules (~1 GB).
  output: 'standalone',

  images: {
    // Formatos modernos: pesan la mitad que JPEG con la misma calidad
    formats: ['image/avif', 'image/webp'],
    // Tamaños que realmente usa la app (el marco es de 440px)
    imageSizes: [48, 64, 80, 104, 132, 158, 198, 256],
    deviceSizes: [440, 640, 880, 1200],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  // Turbopack: ancla el root al directorio de la app.
  turbopack: {
    root: '.',
  },
  allowedDevOrigins: ['172.22.96.1', 'localhost', '127.0.0.1'],

  // La raíz ('/') ahora aloja la Landing Page comercial de Tura Food AI
};

export default nextConfig;
