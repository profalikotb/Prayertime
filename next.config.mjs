/** @type {import('next').NextConfig} */
const nextConfig = {
  // server build (not static export) so /api/ics can serve a live calendar subscription
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};
export default nextConfig;
