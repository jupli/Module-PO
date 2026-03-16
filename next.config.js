/** @type {import('next').NextConfig} */
const nextConfig = {
  // Opsi resmi pengganti experimental.serverComponentsExternalPackages
  serverExternalPackages: ['@prisma/client', 'bcrypt', 'prisma'],
  
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Config Webpack (hanya jalan jika pakai flag --webpack)
  webpack: (config) => {
    config.externals = [...(config.externals || []), '@prisma/client', 'bcrypt', 'prisma'];
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
