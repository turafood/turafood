/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build autonomo para Docker (imagen pequena)
  output: 'standalone',

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  /* config options here */
};

export default nextConfig;
