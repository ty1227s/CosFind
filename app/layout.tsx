import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { PwaInstallManager } from "@/components/pwa-install-manager";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cosfind.ty1227s.workers.dev"),
  title: "CosFind | 欲しいコスメが、どこにあるか分かる。",
  description: "一般流通コスメの最近の在庫あり報告を、地図で探せる匿名共有サービス。",
  applicationName: "CosFind",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CosFind" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: "#c02672", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await headers();
  return <html lang="ja"><head><link rel="stylesheet" href="https://use.typekit.net/iqo1umm.css"/></head><body>{children}<PwaInstallManager /></body></html>;
}
