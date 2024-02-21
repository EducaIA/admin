import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { remixDevTools } from "remix-development-tools/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

installGlobals();

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
  plugins: [remixDevTools(), remix(), tsConfigPaths()],
});
