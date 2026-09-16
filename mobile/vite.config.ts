import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(import.meta.dirname, ".."), "");
  return {
    plugins: [react()],
    server: { fs: { allow: [resolve(import.meta.dirname, "..")] } },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || ""),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || ""),
      "import.meta.env.VITE_MAP_TILE_URL": JSON.stringify(env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png")
    },
    build: { outDir: "dist", emptyOutDir: true, sourcemap: false }
  };
});
