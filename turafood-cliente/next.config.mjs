/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un build autónomo: la imagen de Docker queda en ~150 MB
  // en vez de arrastrar todo node_modules (~1 GB).
  output: 'standalone',

  images: {
    // En Cloudflare Workers no hay optimizador de imágenes (haría falta el
    // producto Cloudflare Images): /_next/image devolvía el archivo original
    // tres veces, una por cada ancho. Se sirven directo, ya redimensionados
    // en public/ (las fotos de producto miden ≤ 960 px).
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
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

  // Redireccionar cualquier llamada heredada hacia destinos consolidados
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: false },
      { source: '/cart', destination: '/checkout', permanent: false },
    ];
  },
};

export default nextConfig;
