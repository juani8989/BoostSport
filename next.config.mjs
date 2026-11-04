/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  logging: {
    // Dev-only call logging prints every argument, including passwords sent to sign-up and admin actions.
    serverFunctions: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  async headers() {
    // Static images are pre-compressed WebP/JPG; let browsers keep them for a month.
    const cached = [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=604800' }]
    return [
      { source: '/images/:path*', headers: cached },
      { source: '/brand/:path*', headers: cached },
    ]
  },
}

export default nextConfig
