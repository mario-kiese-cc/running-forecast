import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

// Served from https://<user>.github.io/running-forecast/ in production.
// `base` is only applied to the production build; `vite dev` keeps serving at "/".
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/running-forecast/" : "/",
  plugins: [vue()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
