/** @type {import('next').NextConfig} */
const r2Host = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  ? new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname
  : undefined;

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...(r2Host ? [{ protocol: "https", hostname: r2Host, pathname: "/**" }] : []),
      // R2.dev dev URLs (local testing only — see README, not for production)
      { protocol: "https", hostname: "*.r2.dev", pathname: "/**" }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb" // media bytes never pass through Next.js — see lib/uploads.ts
    }
  }
};

export default nextConfig;
