/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
    NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  },
};

module.exports = nextConfig;
