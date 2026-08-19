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
  experimental: {
    turbopack: {
      root: '.',
    },
  },

  // La raíz no es una pantalla, es un desvío al catálogo. Hacerlo acá
  // y no con un useEffect en `page.js` ahorra el viaje completo:
  // antes el navegador bajaba todo el JS de la raíz, hidrataba React
  // y recién entonces pedía /home. Ahora recibe un 308 y va derecho.
  async redirects() {
    return [{ source: '/', destination: '/home', permanent: false }];
  },
};

export default nextConfig;
