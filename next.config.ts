import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Isolated browser qualification builds never overwrite the deployment build.
  distDir: process.env.STUDYOS_TEST_DIST ?? ".next",
};

export default nextConfig;
