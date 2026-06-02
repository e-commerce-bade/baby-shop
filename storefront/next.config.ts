import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Backend image domain eklenecek: { hostname: 'localhost', port: '8080' }
    ],
  },
}

export default nextConfig
