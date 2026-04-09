import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
        find: "@swift-prints/estimator",
        replacement: path.resolve(__dirname, "../../packages/estimator/src/index.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src"),
      },
    ],
  },
}));
