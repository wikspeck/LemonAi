import type { NextConfig } from "next";

if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare")
    .then((module) => module.initOpenNextCloudflareForDev())
    .catch(() => {
      console.warn(
        "[Lemon AI] Cloudflare development bindings are unavailable. Use an authenticated `npm run preview` for Workers AI.",
      );
    });
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
