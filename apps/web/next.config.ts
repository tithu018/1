import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@waypoint/domain", "@waypoint/database"]
};

export default nextConfig;
