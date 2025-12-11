import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '')

  return {
    plugins: [react()],
    define: {
      // Prevents "ReferenceError: process is not defined" if code accesses process.env
      'process.env': {},
      // Safe replacement: if key exists, use it; otherwise use empty string.
      // We check both VITE_API_KEY (standard) and API_KEY (legacy/backend style).
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || process.env.API_KEY || ''),
    },
  }
})