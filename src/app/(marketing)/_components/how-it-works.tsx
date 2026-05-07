"use client";

import { motion } from "motion/react";
import { Building2, ListTodo, Rocket } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Building2,
    title: "Create your workspace",
    description:
      "Sign up, create a workspace, and invite your team in under two minutes. No setup wizard, no enterprise sales call.",
  },
  {
    number: "02",
    icon: ListTodo,
    title: "Plan your work",
    description:
      "Add issues, set priorities, assign to teammates, and organize into sprints. Everything in one place.",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Ship faster",
    description:
      "Track progress on the board, measure velocity, stay unblocked. Less time managing, more time building.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-6 py-24 lg:py-32">
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
            How it works
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Up and running in minutes
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            No lengthy onboarding. No configuration hell. Just open it and start
            shipping.
          </p>
        </motion.div>

        {}
        <div className="relative grid gap-8 md:grid-cols-3">
          {}
          <div
            aria-hidden
            className="absolute left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] top-10 hidden h-px border-t border-dashed border-border md:block"
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.12,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                className="relative flex flex-col items-center text-center"
              >
                {}
                <div className="relative mb-6">
                  {}
                  <div className="flex size-20 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                    <Icon className="size-7 text-primary" />
                  </div>
                  {}
                  <div className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
                    {i + 1}
                  </div>
                </div>

                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
