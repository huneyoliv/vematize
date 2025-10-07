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
};

export default nextConfig;
