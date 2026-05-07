import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Hero } from "./_components/hero";
import { LogosStrip } from "./_components/logos-strip";
import { FeaturesGrid } from "./_components/features-grid";
import { ProductShowcase } from "./_components/product-showcase";
import { HowItWorks } from "./_components/how-it-works";
import { StatsRow } from "./_components/stats-row";
import { Testimonials } from "./_components/testimonials";
import { Pricing } from "./_components/pricing";
import { FAQ } from "./_components/faq";
import { CTABanner } from "./_components/cta-banner";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
  keywords: [...siteConfig.keywords],
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* 1. Hero — headline, CTA, product mockup */}
      <Hero />

      {/* 2. Social proof — marquee of brand names */}
      <LogosStrip />

      {/* 3. Features — 12-card grid */}
      <FeaturesGrid />

      {/* 4. Product showcase — tabbed UI walkthrough */}
      <ProductShowcase />

      {/* 5. How it works — 3-step flow */}
      <HowItWorks />

      {/* 6. Stats — animated counters */}
      <StatsRow />

      {/* 7. Testimonials — quote cards */}
      <Testimonials />

      {/* 8. Pricing — 3 tiers */}
      <Pricing />

      {/* 9. FAQ — accordion */}
      <FAQ />

      {/* 10. Final CTA banner */}
      <CTABanner />
    </>
  );
}
