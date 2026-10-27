import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    // `npm run serve:lan` exposes the built app on the home network; allow the Mac's
    // Bonjour name (e.g. http://my-macbook.local:4173) alongside its IP address.
    allowedHosts: ['.local'],
  },
})
