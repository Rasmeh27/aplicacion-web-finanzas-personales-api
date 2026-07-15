/** @type {import('next').NextConfig} */
module.exports = () => {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');
  const localApiUrl = 'http://localhost:3001/api/v1';
  const isProductionBuild =
    process.env.npm_lifecycle_event === 'build' || process.argv.includes('build');

  if (isProductionBuild) {
    if (!configuredApiUrl) {
      throw new Error('NEXT_PUBLIC_API_URL is required for a production build');
    }

    const hostname = new URL(configuredApiUrl).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      throw new Error('NEXT_PUBLIC_API_URL cannot point to localhost in production');
    }

    if (!configuredApiUrl.endsWith('/api/v1')) {
      throw new Error('NEXT_PUBLIC_API_URL must end with /api/v1');
    }
  }

  return {
    reactStrictMode: true,
    env: {
      NEXT_PUBLIC_API_URL: configuredApiUrl ?? localApiUrl,
    },
  };
};
