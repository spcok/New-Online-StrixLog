// ============================================================================
// File: vite.config.ts
// ============================================================================
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    // 1. Generates routeTree.gen.ts automatically on boot and file changes
    TanStackRouterVite(),
    // 2. Compiles React
    react(),
    // 3. Compiles Tailwind v4
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});