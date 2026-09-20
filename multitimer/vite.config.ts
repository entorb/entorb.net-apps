import { defineConfig } from "vitest/config"

export default defineConfig({
  base: "/multitimer/",
  server: { host: true },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost/" } },
  },
})
