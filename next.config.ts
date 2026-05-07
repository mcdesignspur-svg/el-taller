import type { NextConfig } from 'next'
import path from 'node:path'

const nextConfig: NextConfig = {
  // Pin Turbopack root to this project so the EA-level package-lock.json
  // doesn't trick Next into inferring the wrong workspace.
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig
