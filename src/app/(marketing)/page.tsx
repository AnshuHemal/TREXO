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
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.shortDescription,
    images: [siteConfig.ogImage],
    creator: "@trexo_app",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is Trexo really free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The Free plan is free forever — no trial period, no credit card required. You get up to 3 projects, unlimited issues, and up to 5 team members.",
      },
    },
    {
      "@type": "Question",
      name: "How is Trexo different from JIRA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Trexo is built for speed. No XML configuration, no plugin marketplace, no enterprise sales process. You get a modern UI, keyboard-first navigation, real-time updates, and a setup time measured in minutes — not days.",
      },
    },
    {
      "@type": "Question",
      name: "Can I self-host Trexo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Trexo is open source. Clone the repo, set your environment variables, run the migrations, and you're up. The only external dependency is a PostgreSQL database and a Brevo SMTP account for emails.",
      },
    },
    {
      "@type": "Question",
      name: "What views does Trexo support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Trexo supports Kanban Board, Backlog, List, Sprints, Roadmap, Planning, Epics, Analytics, Health, and Time views — all in one platform.",
      },
    },
  ],
};

export default function HomePage() {
  return (
    <>
      {}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Hero />
      <LogosStrip />
      <FeaturesGrid />
      <ProductShowcase />
      <HowItWorks />
      <StatsRow />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTABanner />
    </>
  );
}
