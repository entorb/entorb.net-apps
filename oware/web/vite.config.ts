import { defineConfig } from "vite"

export default defineConfig({
  base: "/oware/",
  server: {
    host: true,
    fs: {
      allow: [".."],
    },
  },
  build: {
    outDir: "dist",
  },
})
