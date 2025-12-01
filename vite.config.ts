import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    define: {
      // This maps the server-side/build-time process.env.API_KEY to the client-side bundle
      // so your existing code `process.env.API_KEY` works without changes.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
  }
})