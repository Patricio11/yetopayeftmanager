import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers
  async headers() {
    const sharedHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];

    return [
      // All routes except /pay/* - block iframing
      {
        source: "/((?!pay/).*)",
        headers: [
          ...sharedHeaders,
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      // Payment page - allow iframe embedding by merchants
      {
        source: "/pay/:token*",
        headers: [
          ...sharedHeaders,
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },

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
