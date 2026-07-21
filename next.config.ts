import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB, which is too small for admin content forms that
      // can submit several compressed photos in one save (e.g. the Home
      // Hero carousel, up to 5 photos), or several videos at once (the
      // Save the Date gallery allows up to 20 photo/video items, each
      // video up to 25MB).
      bodySizeLimit: "150mb",
    },
  },
};

export default nextConfig;
