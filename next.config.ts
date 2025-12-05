import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Exclude SDK folder from build
  webpack: (config, { isServer }) => {
    // Ignore SDK examples and source files during build
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/sdk/**', '**/node_modules/**'],
    };
    
    return config;
  },
  
  // Exclude SDK from TypeScript checking during build
  typescript: {
    // Don't fail build on TypeScript errors in SDK folder
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
