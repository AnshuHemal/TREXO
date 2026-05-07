"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for small teams and side projects.",
    cta: "Get Started Free",
    href: "/signup",
    highlighted: false,
    features: [
      "Up to 3 projects",
      "Unlimited issues",
      "Up to 5 members",
      "Kanban, Backlog, List views",
      "Sprint planning",
      "Basic analytics",
      "Email notifications",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "per member / month",
    description: "For growing teams that need more power.",
    cta: "Start Free Trial",
    href: "/signup",
    highlighted: true,
    badge: "Most Popular",
    features: [
      "Unlimited projects",
      "Unlimited issues",
      "Unlimited members",
      "All views including Roadmap",
      "Custom workflows",
      "Advanced analytics",
      "Time tracking",
      "Custom fields",
      "Saved filters (shared)",
      "Priority support",
      "CSV export",
      "SSO (coming soon)",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For large organisations with specific needs.",
    cta: "Contact Sales",
    href: "mailto:hello@trexo.com",
    highlighted: false,
    features: [
      "Everything in Pro",
      "Dedicated instance",
      "SLA guarantee",
      "Custom integrations",
      "Audit logs",
      "SAML SSO",
      "Dedicated support",
      "Custom contracts",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative px-6 py-16 lg:py-16">
      {}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-muted/20"
      />

      <div className="relative mx-auto max-w-7xl">
        {}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Simple, honest pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Start free. Upgrade when you need to. No hidden fees.
          </p>
        </motion.div>

        {}
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.45,
                delay: i * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-primary bg-card shadow-xl shadow-primary/10 ring-2 ring-primary"
                  : "border-border bg-card shadow-sm"
              }`}
            >
              {}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground shadow">
                    {plan.badge}
                  </span>
                </div>
              )}

              {}
              <div className="mb-6">
                <h3 className="mb-1 text-lg font-bold text-foreground">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              {}
              <Button
                asChild
                variant={plan.highlighted ? "default" : "outline"}
                className="mb-8 w-full"
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>

              {}
              <ul className="flex flex-col gap-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
