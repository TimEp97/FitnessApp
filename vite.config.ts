import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Relative Basis, damit der statische Build in jedem Unterverzeichnis eines Webspace läuft.
// Modus „artifact“: Vorschau als eine einzige Datei, ohne Service Worker (npm run build:preview).
export default defineConfig(({ mode }) => ({
  base: './',
  build:
    mode === 'artifact'
      ? { outDir: 'dist-preview', assetsInlineLimit: 100_000_000, cssCodeSplit: false, rollupOptions: { output: { inlineDynamicImports: true } } }
      : undefined,
  plugins: [
    react(),
    VitePWA({
      disable: mode === 'artifact',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'ATHLETIC',
        short_name: 'ATHLETIC',
        description: 'Krafttraining protokollieren – lokal, offline, ohne Konto.',
        lang: 'de',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        // Server-Sicherung nie aus dem Cache bedienen
        navigateFallbackDenylist: [/\/api\//],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
}));
