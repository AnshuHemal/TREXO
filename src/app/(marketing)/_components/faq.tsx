"use client";

import { motion } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    question: "Is Trexo really free?",
    answer:
      "Yes. The Free plan is free forever — no trial period, no credit card required. You get up to 3 projects, unlimited issues, and up to 5 team members. Upgrade to Pro when you need more.",
  },
  {
    question: "How is Trexo different from JIRA?",
    answer:
      "Trexo is built for speed. No XML configuration, no plugin marketplace, no enterprise sales process. You get a modern UI, keyboard-first navigation, real-time updates, and a setup time measured in minutes — not days.",
  },
  {
    question: "Can I import issues from JIRA or Linear?",
    answer:
      "CSV import is on the roadmap. For now, you can use the CSV export from JIRA and manually import via our API. We're working on a one-click migration tool.",
  },
  {
    question: "Is my data secure?",
    answer:
      "All data is stored in a PostgreSQL database with encrypted connections. Passwords are hashed with bcrypt. Sessions are managed by Better Auth with secure, httpOnly cookies. We never store plain-text credentials.",
  },
  {
    question: "Can I self-host Trexo?",
    answer:
      "Yes. Trexo is open source. Clone the repo, set your environment variables, run the migrations, and you're up. The only external dependency is a PostgreSQL database and a Brevo SMTP account for emails.",
  },
  {
    question: "What happens if I exceed the Free plan limits?",
    answer:
      "You'll be prompted to upgrade to Pro. Your existing data is never deleted — you just won't be able to create new projects until you upgrade or remove existing ones.",
  },
  {
    question: "Do you support SSO / SAML?",
    answer:
      "OAuth via GitHub and Google is supported on all plans. SAML SSO is available on the Enterprise plan and is on the roadmap for Pro.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-3xl">
        {}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-12 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            FAQ
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Common questions
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Everything you need to know before getting started.
          </p>
        </motion.div>

        {}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Accordion type="single" collapsible className="flex flex-col gap-2">
            {FAQS.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="rounded-xl border border-border bg-card px-5 data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="py-4 text-left text-sm font-semibold text-foreground hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
