/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@opentelemetry/api', 'firebase-admin'],
  },
};

export default nextConfig;
