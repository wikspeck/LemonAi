import type { NextConfig } from "next";

import("@opennextjs/cloudflare").then((module) => module.initOpenNextCloudflareForDev());

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
