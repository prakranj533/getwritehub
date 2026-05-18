// next.config.mjs
var nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@opentelemetry/api", "firebase-admin"]
  }
};
var next_config_default = nextConfig;
export {
  next_config_default as default
};
