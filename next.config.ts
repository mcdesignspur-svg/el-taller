import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  // Pin Turbopack root to this project so the EA-level package-lock.json
  // doesn't trick Next into inferring the wrong workspace.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Workaround for Next 16 prerender bug on /_global-error
  // (vercel/next.js#86178, #85668, #84994). standalone output skips the
  // problematic static export pass while still working on Vercel.
  output: 'standalone',
}

export default nextConfig
