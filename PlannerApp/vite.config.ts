import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/planner/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Daily Scheduler',
        short_name: 'Scheduler',
        description: 'Constraint-based adaptive daily planner',
        theme_color: '#ede5d8',
        background_color: '#ede5d8',
        display: 'standalone',
        start_url: '/planner/',
        icons: [
          {
            src: 'favicon.svg',
            type: 'image/svg+xml',
            sizes: 'any',
          },
        ],
      },
    }),
  ],
})
