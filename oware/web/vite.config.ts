import { defineConfig } from "vite";

export default defineConfig({
  base: "/oware/",
  server: {
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "dist",
  },
});
