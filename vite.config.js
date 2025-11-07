import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/volleyball-coach-app/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Force service worker update by changing runtime caching
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/jamesfungtc-sudo\.github\.io\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'volleyball-coach-v2',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Volleyball Coach',
        short_name: 'VB Coach',
        description: 'Professional volleyball coaching app',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        // Increment version to force update
        version: '2.0.0',
        icons: [
          {
            src: '/vite.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
