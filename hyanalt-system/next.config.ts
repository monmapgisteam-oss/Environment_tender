import type { NextConfig } from "next";

/**
 * Статик хувилбар — GitHub Pages дээр байршуулахад зориулав.
 * PAGES=1 үед репогийн нэрийг зам болгон нэмнэ (user.github.io/Environment_tender).
 */
const isPages = process.env.PAGES === "1";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isPages ? "/Environment_tender" : "",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
