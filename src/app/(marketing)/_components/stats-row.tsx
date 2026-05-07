"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";

const STATS = [
  { value: 10, suffix: "+", label: "Views per project" },
  { value: 6, suffix: "", label: "Issue types" },
  { value: 100, suffix: "%", label: "Free to start" },
  { value: 5, suffix: "min", label: "To first issue" },
];

function useCountUp(target: number, duration = 1200, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, active]);

  return count;
}

function Stat({
  value,
  suffix,
  label,
  delay,
  active,
}: {
  value: number;
  suffix: string;
  label: string;
  delay: number;
  active: boolean;
}) {
  const count = useCountUp(value, 1000, active);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center gap-1 text-center"
    >
      <span className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {count}
        <span className="text-primary">{suffix}</span>
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </motion.div>
  );
}

export function StatsRow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="border-y border-border/50 bg-muted/10 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <Stat
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              delay={i * 0.1}
              active={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
