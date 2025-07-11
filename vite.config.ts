import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.OPUS_OPENAI_API_KEY': JSON.stringify(process.env.OPUS_OPENAI_API_KEY)
  },
  plugins: [
    react(),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: "electron/main.ts",
        vite: {
          define: {
            'process.env.OPUS_OPENAI_API_KEY': JSON.stringify(process.env.OPUS_OPENAI_API_KEY)
          },
          build: {
            rollupOptions: {
              external: ["bufferutil", "utf-8-validate"]
            }
          }
        }
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, "electron/preload.ts")
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer:
        process.env.NODE_ENV === "test"
          ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
            undefined
          : {}
    }),
    tailwindcss()
  ]
});
