import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, which is too small for admin content forms that
      // can submit several compressed photos in one save (e.g. the Home
      // Hero carousel or Topics carousel, up to 5 photos each).
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
