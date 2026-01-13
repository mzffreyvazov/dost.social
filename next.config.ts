import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Mobile camera photos can be several MB; default Server Actions limit is easy to exceed.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
