import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  /* Force server restart to load newly generated Prisma client models */
};

export default nextConfig;
