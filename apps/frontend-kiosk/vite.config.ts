import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@\/components\/ui\/(.*)/,
        replacement: path.resolve(__dirname, "../../packages/ui/src/components/$1"),
      },
      {
        find: "@/lib/utils",
        replacement: path.resolve(__dirname, "../../packages/ui/src/lib/utils"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
});

