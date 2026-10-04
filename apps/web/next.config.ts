import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });
config({ path: resolve(process.cwd(), "../../.env.example") });
if (process.env.DATABASE_URL?.includes("@localhost:5432")) process.env.DATABASE_URL = process.env.DATABASE_URL.replace("@localhost:5432", "@127.0.0.1:5433");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@waypoint/domain", "@waypoint/database"]
};

export default nextConfig;
