import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "maskable-icon.png"],
      manifest: {
        name: "اختبارات - Exam Hub",
        short_name: "اختبارات",
        description: "منصة إنشاء وإدارة الاختبارات التعليمية بسهولة",
        theme_color: "#7C3AED",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        lang: "ar",
        dir: "rtl",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached separately, rarely changes
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI primitives — large but stable
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
          ],
          // Supabase — only needed after auth
          "vendor-supabase": ["@supabase/supabase-js"],
          // Charts — heavy, only on results pages
          "vendor-charts": ["recharts"],
          // Form & validation utilities
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
          // Excel import — heavy, rarely used
          "vendor-xlsx": ["xlsx"],
        },
      },
    },
  },
}));
