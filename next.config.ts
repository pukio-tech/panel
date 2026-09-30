import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El monorepo tiene otro package-lock.json en la raíz; fija la raíz del panel.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
