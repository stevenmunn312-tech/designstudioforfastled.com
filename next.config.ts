import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // No image optimizer runs on the Cloudflare Worker (no Images binding, no
  // custom loader), so next/image serves the source file as-is.
  images: { unoptimized: true },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
