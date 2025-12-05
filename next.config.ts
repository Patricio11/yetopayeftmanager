import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Turbopack configuration (empty to silence warning)
  turbopack: {},
  
  // Exclude SDK folder from build (webpack fallback)
  webpack: (config, { isServer }) => {
    // Ignore SDK examples and source files during build
    if (config.watchOptions) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/sdk/**', '**/node_modules/**'],
      };
    }
    
    return config;
  },
  
  // Exclude SDK from TypeScript checking during build
  typescript: {
    // TypeScript will skip SDK folder due to tsconfig.json exclude
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
