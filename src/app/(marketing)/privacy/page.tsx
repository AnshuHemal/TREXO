import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "Privacy Policy — Trexo",
  description: "Privacy policy and data protection practices at Trexo.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <FadeIn>
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: August 17, 2026</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert mt-10 max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Overview</h2>
            <p>
              Trexo values your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our project management and collaboration platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when creating an account, setting up workspaces, creating issues, collaborating with teammates, or contacting support. This includes your name, email address, avatar, workspace content, and activity logs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
            <p>
              We use the collected information to deliver, maintain, and improve our services, facilitate real-time updates and notifications, secure user accounts, prevent fraud, and communicate important service updates.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Data Security & Retention</h2>
            <p>
              We implement industry-standard encryption, tokenized sessions, and secure infrastructure to protect your information. Your data is retained only as long as necessary to provide you with access to your workspaces.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Contact Us</h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy, please contact our team at <span className="font-medium text-foreground">support@trexo.app</span>.
            </p>
          </section>
        </div>
      </FadeIn>
    </div>
  );
}
