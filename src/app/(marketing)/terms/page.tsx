import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata: Metadata = {
  title: "Terms of Service — Trexo",
  description: "Terms and conditions for using Trexo.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <FadeIn>
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: August 17, 2026</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert mt-10 max-w-none space-y-8 text-muted-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing and using Trexo, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. User Accounts & Responsibilities</h2>
            <p>
              You are responsible for safeguarding your account credentials, maintaining the security of your workspace access, and all activities occurring under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Acceptable Use</h2>
            <p>
              You agree not to use Trexo for any unlawful purpose, violate intellectual property rights, transmit malicious code, or interfere with the proper operation of the services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to Trexo if you violate these terms or engage in harmful activities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Contact Information</h2>
            <p>
              For legal inquiries or questions regarding our terms, reach out to <span className="font-medium text-foreground">legal@trexo.app</span>.
            </p>
          </section>
        </div>
      </FadeIn>
    </div>
  );
}
