/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'mongodb',
      'discord.js',
      '@discordjs/ws',
      '@discordjs/rest',
      '@discordjs/builders'
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...config.externals,
        'kerberos',
        'snappy',
        'aws4',
        '@mongodb-js/zstd',
        'mongodb-client-encryption',
        '@aws-sdk/credential-providers',
        'gcp-metadata',
        'socks',
        'zlib-sync',
        'bufferutil',
        'utf-8-validate'
      ];
    }
    return config;
  },
  // ==================== SECURITY HEADERS ====================
  // Configuração completa de headers de segurança (2025 best practices)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy (CSP)
          // Protege contra XSS, clickjacking, e injeção de código malicioso
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob: http://localhost:8080 https://api.swaptune.me",
              "font-src 'self' data:",
              "connect-src 'self' https://*.mongodb.net https://vercel.live wss://ws.pusherapp.com https://sockjs.pusher.com http://localhost:8080 https://api.swaptune.me",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          // HTTP Strict Transport Security (HSTS)
          // Força uso de HTTPS por 2 anos
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          // X-Frame-Options
          // Previne clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          // X-Content-Type-Options
          // Previne MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Referrer Policy
          // Controla quanta informação é enviada em referrers
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions Policy (antes Feature Policy)
          // Desabilita funcionalidades perigosas
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          // X-DNS-Prefetch-Control
          // Desabilita DNS prefetching para privacidade
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off'
          },
          // X-Download-Options (IE)
          {
            key: 'X-Download-Options',
            value: 'noopen'
          },
          // X-Permitted-Cross-Domain-Policies
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none'
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/medias/:path*',
        destination: 'http://localhost:8080/medias/:path*',
      },
    ];
  },
};

export default nextConfig;
