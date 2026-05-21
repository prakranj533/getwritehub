// next.config.mjs
var nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@opentelemetry/api", "firebase-admin"]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  }
};
var next_config_default = nextConfig;
export {
  next_config_default as default
};
