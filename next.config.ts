import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // This project sits inside a directory tree that has a lockfile further up,
    // so Turbopack would otherwise infer a root above the project and warn.
    root: __dirname,
  },
};

export default nextConfig;
