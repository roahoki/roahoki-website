import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "xutwlpliollsczaatoxd.supabase.co",
      },
    ],
  },
  async redirects() {
    // El sitio servía cada página con prefijo de idioma (`/es/projects`,
    // `/en/projects`). Ahora es solo español y sin prefijo, así que todo lo
    // compartido o indexado con la forma vieja caería en un 404 sin esto.
    // `permanent` porque el cambio no se va a revertir: le dice a Google que
    // reemplace la URL antigua, no que la siga visitando.
    return [
      {
        source: "/:locale(es|en)",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:locale(es|en)/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
