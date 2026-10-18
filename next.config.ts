import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['192.168.100.2'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  }
};

export default nextConfig;
