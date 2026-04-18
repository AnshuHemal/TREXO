import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getUserTheme } from "@/lib/theme-actions";
import { siteConfig } from "@/config/site";
import "./globals.css";

// ─── Fonts ────────────────────────────────────────────────────────────────────
// Aligned with the CSS theme: Inter (sans) + JetBrains Mono (mono).
// Variables are injected into the HTML element so Tailwind's font utilities
// and the CSS custom properties in globals.css both resolve correctly.

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: siteConfig.titleTemplate,
  },

  description: siteConfig.description,
  keywords: [...siteConfig.keywords],

  authors: [{ name: siteConfig.author.name, url: siteConfig.author.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,

  // Canonical + alternate
  alternates: {
    canonical: "/",
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },

  // Twitter / X
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: "@trexo_app",
    site: "@trexo_app",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // PWA / browser hints
  applicationName: siteConfig.name,
  category: "productivity",

  // Favicon variants are resolved automatically from src/app/favicon.ico.
  // Add apple-touch-icon.png and icon.png to src/app/ to extend coverage.
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

// ─── Viewport ─────────────────────────────────────────────────────────────────
// Exported separately per Next.js 15+ convention — keeps metadata and viewport
// concerns cleanly separated.

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#343434" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the user's persisted theme preference from DB.
  // Falls back to "system" for unauthenticated visitors.
  const userTheme = await getUserTheme();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme={userTheme}
          enableSystem
          disableTransitionOnChange
          nonce=""
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
