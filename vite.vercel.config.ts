import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  ssr: {
    noExternal: ["h3-v2", "rou3", "srvx"],
  },
});
