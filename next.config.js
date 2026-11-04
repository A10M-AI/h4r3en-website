/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/blog',
        destination: '/coming-blog',
        permanent: false,
      },
      {
        source: '/blog/:path*',
        destination: '/coming-blog',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
