import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
