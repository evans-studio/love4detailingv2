/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Improve RSC payload handling
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  
  // Optimize bundle for production
  swcMinify: true,
  
  // Configure headers for better RSC handling
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'x-pathname',
            value: '/:path*',
          },
        ],
      },
    ];
  },
  
  // Optimize redirects
  async redirects() {
    return [];
  },
  
  // Configure webpack for better performance
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Optimize client-side bundle
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          default: false,
          vendors: false,
          // Bundle all React Server Components together
          rsc: {
            name: 'rsc',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](@supabase|react|react-dom)[\\/]/,
            priority: 20,
          },
        },
      };
    }
    
    return config;
  },
  
  // Improve image optimization
  images: {
    domains: ['lh3.googleusercontent.com'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Configure environment variables
  env: {
    CUSTOM_KEY: 'value',
  },
};

module.exports = nextConfig;