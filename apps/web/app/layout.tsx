import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '@/components/Providers';
import { Header } from "@/components/header";
import { StoreInitializer } from "@/components/store-initializer";
import { OfflineBanner } from "@/components/offline-banner";
import { CommandPalette } from "@/components/command-palette";
import { ShortcutsHelp } from "@/components/shortcuts-help";
import { PwaProvider } from "@/components/pwa-provider";
import { ApiKeyWarningBanner } from "@/components/api-key-warning";
import { DemoModeListener } from "@/components/DemoModeListener";
import { DemoModeBadge } from "@/components/layout/DemoModeBadge";
import { isDemoMode } from "@/lib/demoMode";
import { Toaster } from "sonner";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "RTFM-Sovereign | Verifiable Skill Protocol",
  description: "Prove your coding skills with cryptographic attestations on EigenLayer. Stake, Build, Prove - The future of skill verification.",
  keywords: ["skill-attestation", "web3", "blockchain", "eigenlayer", "learning", "code-challenge", "credential-verification"],
  authors: [{ name: "RTFM-Sovereign" }],
  robots: "index, follow",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://rtfm-sovereign.vercel.app"),
  openGraph: {
    title: "RTFM-Sovereign",
    description: "Stake, Build, Prove. The future of skill verification with cryptographic attestations on-chain.",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://rtfm-sovereign.vercel.app",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RTFM-Sovereign - Verifiable Skill Protocol",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RTFM-GPT | Read The F*cking Manual",
    description: "AI-generated learning roadmaps that force you to read official documentation. No spoon-feeding. No shortcuts.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#09090b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistMono.variable} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background font-mono text-foreground flex flex-col">
        <Providers>
          <PwaProvider />
            <StoreInitializer />
            <OfflineBanner />
            <CommandPalette />
            <ShortcutsHelp />
            <DemoModeListener />
            <Header />
          <main className="flex-1 flex flex-col">
            {children}
            <Toaster 
              richColors 
              position="top-right"
              theme="dark"
              duration={5000}
            />
          </main>
        </Providers>
      </body>
    </html>
  );
}
