import type { NextConfig } from 'next'
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from 'next/constants'

const sharedConfig = {
  images: {
    remotePatterns: [],
  },
} satisfies NextConfig

const nextConfig = (phase: string): NextConfig => {
  const isProductionOutput =
    phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER

  return {
    ...sharedConfig,
    distDir: isProductionOutput ? '.next-build' : '.next',
  }
}

export default nextConfig
