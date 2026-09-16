import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],

    // ============================================================
    // CSS
    // ============================================================

    css: {
        // Chỉ hỗ trợ debug khi development
        devSourcemap: true,
    },

    // ============================================================
    // BUILD
    // ============================================================

    build: {
        // Production không cần sourcemap công khai
        sourcemap: false,

        // Bật minify khi deploy
        minify: true,

        rollupOptions: {
            output: {
                // File JS entry có hash
                entryFileNames:
                    "assets/[name]-[hash].js",

                // File chunk lazy có hash
                chunkFileNames:
                    "assets/[name]-[hash].js",

                // CSS / image / font... có hash
                assetFileNames:
                    "assets/[name]-[hash][extname]",
            },
        },
    },

    // ============================================================
    // DEVELOPMENT SERVER
    // ============================================================

    server: {
        watch: {
            // Giữ nguyên cho môi trường development của bạn
            usePolling: true,
        },

        host: "0.0.0.0",

        port: 5173,

        strictPort: true,
    },
});