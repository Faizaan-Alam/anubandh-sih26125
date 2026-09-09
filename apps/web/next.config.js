/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@anubandh/shared", "@anubandh/crypto", "@anubandh/policy"]
};
module.exports = nextConfig;
