/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// Only enable static export for production builds (yarn build)
// This allows development mode to work with API routes
if (process.env.NODE_ENV === "production") {
  nextConfig.output = "export";
  nextConfig.trailingSlash = true;
  nextConfig.images = {
    unoptimized: true,
  };
}

module.exports = nextConfig;
