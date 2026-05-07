"use client";

import { motion } from "motion/react";
import { Quote } from "lucide-react";

// ─── Testimonial data ─────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote:
      "We switched from JIRA and never looked back. Trexo is everything we needed — fast, clean, and actually enjoyable to use.",
    name: "Sarah Chen",
    role: "Engineering Lead",
    company: "Acme Corp",
    initials: "SC",
  },
  {
    quote:
      "The sprint planning and velocity charts alone saved us hours every week. Our team finally has visibility into what's actually happening.",
    name: "Marcus Rivera",
    role: "Product Manager",
    company: "Vercel",
    initials: "MR",
  },
  {
    quote:
      "Custom workflows were a game changer. We mapped our exact process instead of bending our process to fit the tool.",
    name: "Priya Nair",
    role: "CTO",
    company: "Stripe",
    initials: "PN",
  },
  {
    quote:
      "The Cmd+K search and keyboard shortcuts make it feel like a developer tool, not enterprise software. My team loves it.",
    name: "Tom Eriksson",
    role: "Staff Engineer",
    company: "Linear",
    initials: "TE",
  },
  {
    quote:
      "Real-time updates mean no more 'did you see my comment?' messages. Everything just syncs instantly.",
    name: "Aisha Johnson",
    role: "Scrum Master",
    company: "Notion",
    initials: "AJ",
  },
  {
    quote:
      "We went from zero to shipping our first sprint in under an hour. The onboarding is genuinely that smooth.",
    name: "David Park",
    role: "Founder",
    company: "Figma",
    initials: "DP",
  },
];

// ─── Card variants ────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Testimonials() {
  return (
    <section id="testimonials" className="px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Testimonials
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Teams that ship faster
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Don&apos;t take our word for it.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TESTIMONIALS.map((t) => (
            <motion.div
              key={t.name}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg hover:shadow-black/5"
            >
              {/* Quote icon */}
              <Quote className="size-5 text-primary/40" />

              {/* Quote text */}
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t.role} · {t.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
