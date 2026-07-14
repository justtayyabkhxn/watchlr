import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // TMDB/YouTube already serve pre-sized, compressed variants (w185, w342, …);
    // re-optimizing them on Vercel burns transformations and edge requests for no gain.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default nextConfig;
