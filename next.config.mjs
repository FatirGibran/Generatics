/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      "/**/*": [
        "./prisma/generatics.db",
        "./data/generatics.db",
      ],
    },
  },
};

export default nextConfig;
