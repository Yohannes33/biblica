import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// Shown in Settings, so a bug report can say which release it came from.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        // Bible text is not precached (13 MB). Each book is cached the first
        // time it's opened and then works offline; the files are versioned
        // (/bible/v1/…), so a cached copy never goes stale.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/bible/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'bible-text',
              expiration: { maxEntries: 300 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      manifest: {
        name: 'Biblica - Bible Verse Memorization',
        short_name: 'Biblica',
        description: 'Memorize Bible verses with fill-in-the-blank, flashcards, word scrambles and trivia.',
        theme_color: '#ffffff',
        background_color: '#f2f6f2',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Long-press the installed icon. App.tsx reads these query strings.
        shortcuts: [
          {
            name: 'Review cards',
            short_name: 'Review',
            url: '/?tab=flashcards',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Read the Bible',
            short_name: 'Bible',
            url: '/?open=bible',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ]
      }
    })
  ],
})
